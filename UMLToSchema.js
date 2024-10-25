const express = require('express');
const axios = require('axios'); 
const app = express();
const port = 3000;


app.use(express.json());


let memoryStore = {
    results: [], 
    schemas: {}  
};


function umlToSchema(umlText,universeId) {
    const entityBlocks = umlText.split(/entity\s+|class\s+/).map(block => block.trim()).filter(Boolean);

    function parseAttributes(entityBlock) {
        const attributes = [];
        const attributeSection = entityBlock.match(/{(.+)}$/s);
        if (attributeSection) {
            const lines = attributeSection[1].match(/[\+\s]*(\w+)\s*:\s*(\w+)(\s*<<PK>>|\s*{PK})?(\s*<<FK>>|\s*{FK})?/g);
            if (lines) {
                lines.forEach(line => {
                    const attributeMatch = line.match(/(\w+)\s*:\s*(\w+)(\s*<<PK>>|\s*{PK})?(\s*<<FK>>|\s*{FK})?/);
                    if (attributeMatch) {
                        const name = attributeMatch[1];
                        const type = attributeMatch[2];
                        const isPrimaryKey = !!attributeMatch[3];
                        const isForeignKey = !!attributeMatch[4];

                        const attribute = {
                            "name": name,
                            "nestedName": name,
                            "type": {
                                "type": type
                            },
                            "required": isPrimaryKey,
                            "reference": isForeignKey,
                            "videos": [],
                            "childAttributes": []
                        };

                        attributes.push(attribute);
                    }
                });
            }
        }
        return attributes;
    }

    const schema = entityBlocks.map(entityBlock => {
        const entityNameMatch = entityBlock.match(/(\w+)\s*{/);
        const entityName = entityNameMatch ? entityNameMatch[1] : '';
        const attributes = parseAttributes(entityBlock);
        const primaryKey = attributes.find(attr => attr.required)?.name || '';

        return {
            "entityName": entityName,
            "description": entityName,
            "schemaReadAccess": "PUBLIC",
            "dataReadAccess": "PUBLIC", 
            "dataWriteAccess": "PUBLIC",
            "metadataReadAccess": "PUBLIC",
            "metadataWriteAccess": "PUBLIC",
            "universes": [JSON.stringify(universeId)],
            "tags": { "BLUE": [] },
            "primaryKey": [primaryKey],
            "attributes": attributes,
            "execute": "PUBLIC",
            "visibility": "PUBLIC"
        };
    });

    return schema;
}

async function createSchema(schemaObject,token) {
    try {
       
        if (memoryStore.schemas[schemaObject.entityName]) {
            const existingSchemaId = memoryStore.schemas[schemaObject.entityName];
            return { status: 'conflict', name: schemaObject.entityName, schemaId: existingSchemaId };
        }


       
        const response = await axios.post('https://ig.gov-cloud.ai/pi-entity-service/v1.0/schemas', schemaObject, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

      

        const { entitySchema: { name } } = response.data;
        const  schemaId = response.data.schemaId;


       
        memoryStore.schemas[name] = schemaId;

      
        return { status: 'success', name, schemaId };
    } catch (error) {
        if (error.response?.status === 409) {
            return { status: 'conflict', name: schemaObject.entityName };
        }
        throw error; // Handle other errors
    }
}


app.post('/convert-uml', 
    async (req, res) => {
    const { umlText } = req.body;

    const token = req.headers['token'];
    const universeId = req.query;


    if (!umlText) {
        return res.status(400).json({ error: 'UML text is required.' });
    }

    try {
        const schema = umlToSchema(umlText,universeId);

        
        memoryStore.results = [];

     
        // for (const schemaObject of schema) {
        //     const result = await createSchema(schemaObject,token);
        //     console.log("result",result);
        //     memoryStore.results.push(result);
        // }

         // Create all schemas concurrently
         const results = await Promise.allSettled(schema.map(async (schemaObject) => {
            const result = await createSchema(schemaObject, token);
            // console.log("result", result);
            return result;
        }));


           // Process results to store them in memory
           memoryStore.results = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return { status: 'success', name: schema[index].entityName, schemaId: result.value.schemaId };
            } else {
                return { status: 'failed', name: schema[index].entityName, reason: result.reason };
            }
        });


        // Store the results in memory and respond
        // memoryStore.results = results;

       
        res.json({ status: 'completed', results: memoryStore.results });
    } catch (error) {
       
        res.status(500).json({ 
            error: 'An error occurred while processing the UML.', 
            details: error.message || error.response?.data || 'Unknown error' 
        });
    }
});


// Define an additional API to retrieve the in-memory data
app.get('/get-results', (req, res) => {
    res.json({ results: memoryStore.results });
});

// Start the server
app.listen(port, () => {
    console.log(`UML to Schema API listening at http://localhost:${port}`);
});
