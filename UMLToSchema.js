const express = require('express');
const axios = require('axios'); 
const app = express();
const port = 3000;

const apiUrl = 'https://ig.gov-cloud.ai/pi-entity-service/v1.0/schemas';
const authHeader = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI3Ny1NUVdFRTNHZE5adGlsWU5IYmpsa2dVSkpaWUJWVmN1UmFZdHl5ejFjIn0.eyJleHAiOjE3MjYxODIzMzEsImlhdCI6MTcyNjE0NjMzMSwianRpIjoiOGVlZTU1MDctNGVlOC00NjE1LTg3OWUtNTVkMjViMjQ2MGFmIiwiaXNzIjoiaHR0cDovL2tleWNsb2FrLmtleWNsb2FrLnN2Yy5jbHVzdGVyLmxvY2FsOjgwODAvcmVhbG1zL21hc3RlciIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJmNzFmMzU5My1hNjdhLTQwYmMtYTExYS05YTQ0NjY4YjQxMGQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJIT0xBQ1JBQ1kiLCJzZXNzaW9uX3N0YXRlIjoiYmI1ZjJkMzktYTQ3ZC00MjI0LWFjZGMtZTdmNzQwNDc2OTgwIiwibmFtZSI6ImtzYW14cCBrc2FteHAiLCJnaXZlbl9uYW1lIjoia3NhbXhwIiwiZmFtaWx5X25hbWUiOiJrc2FteHAiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJwYXNzd29yZF90ZW5hbnRfa3NhbXhwQG1vYml1c2R0YWFzLmFpIiwiZW1haWwiOiJwYXNzd29yZF90ZW5hbnRfa3NhbXhwQG1vYml1c2R0YWFzLmFpIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiLyoiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImRlZmF1bHQtcm9sZXMtbWFzdGVyIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7IkhPTEFDUkFDWSI6eyJyb2xlcyI6WyJIT0xBQ1JBQ1lfVVNFUiJdfSwiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJwcm9maWxlIGVtYWlsIiwic2lkIjoiYmI1ZjJkMzktYTQ3ZC00MjI0LWFjZGMtZTdmNzQwNDc2OTgwIiwidGVuYW50SWQiOiJmNzFmMzU5My1hNjdhLTQwYmMtYTExYS05YTQ0NjY4YjQxMGQiLCJyZXF1ZXN0ZXJUeXBlIjoiVEVOQU5UIn0=.FXeDyHBhlG9L4_NCeSyHEaNEBVmhFpfSBqlcbhHaPaoydhKcA0BfuyHgxg_32kQk6z5S9IQ7nVKS2ybtOvwo0WyLWwLQchSq7Noa7LooHIMzmeWMQb_bLKtbaOti59zwIdS8CkfGaXut7RUQKISQVWmbUGsVJQa2JkG6Ng_QN0y5hFVksMWPZiXVsofQkJXHXV1CQ3gabhhHKo3BqlJwzpsCKLDfg1-4PmSl1Wqbw03Ef2yolroj5i8FoeHukOQPkwCUHrrNw-ilIp917nqZa89YbCMtDjWyaj8pEH7GJR5vMZPE2WcJPn5dSA1IHVunfatEB1cDAitaFjVNWNnddQ'; 


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
