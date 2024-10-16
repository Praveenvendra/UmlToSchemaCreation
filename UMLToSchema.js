const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Mock database to track successful schema creations
let schemaStore = {};

app.post('/createSchemas', async (req, res) => {
    const umlClasses = req.body.umlClasses;
    const results = {}; // Store successful schema creations
    const errors = {};  // Store any errors

    // Function to generate schema payload
    const generateSchemaPayload = (classObj) => ({
        entityName: classObj.className.toLowerCase(),
        description: classObj.className.toLowerCase(),
        schemaReadAccess: "PUBLIC",
        dataReadAccess: "PUBLIC",
        dataWriteAccess: "PUBLIC",
        metadataReadAccess: "PUBLIC",
        metadataWriteAccess: "PUBLIC",
        universes: ["66e2f144902a0633d63e2a9d"],
        tags: { "BLUE": [] },
        attributes: classObj.attributes.map(attr => ({
            name: attr.name,
            nestedName: attr.name,
            type: { type: attr.type },
            required: attr.required,
            videos: [],
            childAttributes: []
        })),
        primaryKey: [classObj.attributes.find(attr => attr.required).name],
        execute: "PUBLIC",
        visibility: "PUBLIC"
    });

    try {
        // Use map to create schemas with error handling for each call
        const promises = umlClasses.map(async (umlClass) => {
            // Skip if schema already exists in the schemaStore
            if (schemaStore[umlClass.className.toLowerCase()]) {
                return { name: umlClass.className.toLowerCase(), schemaId: schemaStore[umlClass.className.toLowerCase()] };
            }

            const schemaPayload = generateSchemaPayload(umlClass);

            try {
                const response = await axios.post(
                    'https://ig.gov-cloud.ai/pi-entity-service/v1.0/schemas',
                    schemaPayload,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI3Ny1NUVdFRTNHZE5adGlsWU5IYmpsa2dVSkpaWUJWVmN1UmFZdHl5ejFjIn0.eyJleHAiOjE3MjYxODIzMzEsImlhdCI6MTcyNjE0NjMzMSwianRpIjoiOGVlZTU1MDctNGVlOC00NjE1LTg3OWUtNTVkMjViMjQ2MGFmIiwiaXNzIjoiaHR0cDovL2tleWNsb2FrLmtleWNsb2FrLnN2Yy5jbHVzdGVyLmxvY2FsOjgwODAvcmVhbG1zL21hc3RlciIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJmNzFmMzU5My1hNjdhLTQwYmMtYTExYS05YTQ0NjY4YjQxMGQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJIT0xBQ1JBQ1kiLCJzZXNzaW9uX3N0YXRlIjoiYmI1ZjJkMzktYTQ3ZC00MjI0LWFjZGMtZTdmNzQwNDc2OTgwIiwibmFtZSI6ImtzYW14cCBrc2FteHAiLCJnaXZlbl9uYW1lIjoia3NhbXhwIiwiZmFtaWx5X25hbWUiOiJrc2FteHAiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJwYXNzd29yZF90ZW5hbnRfa3NhbXhwQG1vYml1c2R0YWFzLmFpIiwiZW1haWwiOiJwYXNzd29yZF90ZW5hbnRfa3NhbXhwQG1vYml1c2R0YWFzLmFpIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiLyoiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImRlZmF1bHQtcm9sZXMtbWFzdGVyIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7IkhPTEFDUkFDWSI6eyJyb2xlcyI6WyJIT0xBQ1JBQ1lfVVNFUiJdfSwiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJwcm9maWxlIGVtYWlsIiwic2lkIjoiYmI1ZjJkMzktYTQ3ZC00MjI0LWFjZGMtZTdmNzQwNDc2OTgwIiwidGVuYW50SWQiOiJmNzFmMzU5My1hNjdhLTQwYmMtYTExYS05YTQ0NjY4YjQxMGQiLCJyZXF1ZXN0ZXJUeXBlIjoiVEVOQU5UIn0=.FXeDyHBhlG9L4_NCeSyHEaNEBVmhFpfSBqlcbhHaPaoydhKcA0BfuyHgxg_32kQk6z5S9IQ7nVKS2ybtOvwo0WyLWwLQchSq7Noa7LooHIMzmeWMQb_bLKtbaOti59zwIdS8CkfGaXut7RUQKISQVWmbUGsVJQa2JkG6Ng_QN0y5hFVksMWPZiXVsofQkJXHXV1CQ3gabhhHKo3BqlJwzpsCKLDfg1-4PmSl1Wqbw03Ef2yolroj5i8FoeHukOQPkwCUHrrNw-ilIp917nqZa89YbCMtDjWyaj8pEH7GJR5vMZPE2WcJPn5dSA1IHVunfatEB1cDAitaFjVNWNnddQ` // Use environment variable for the token
                        }
                    }
                );

                const { schemaId, entitySchema } = response.data;

                // Store successful creation in memory or a database
                schemaStore[entitySchema.name] = schemaId;
                return { name: entitySchema.name, schemaId };

            } catch (error) {
                if (error.response && error.response.status === 409) {
                    // Handle conflict (schema already exists)
                    return { name: umlClass.className.toLowerCase(), schemaId: schemaStore[umlClass.className.toLowerCase()], conflict: true };
                } else {
                    throw error; // Rethrow if it's not a conflict
                }
            }
        });

        const schemaResponses = await Promise.allSettled(promises);

        // Process the responses
        schemaResponses.forEach((result) => {
            if (result.status === 'fulfilled') {
                const { name, schemaId, conflict } = result.value;
                results[name] = { schemaId, conflict: conflict || false }; // Add schemaId and conflict status
            } else {
                errors[result.reason.config.data.entityName] = result.reason.response?.data?.message || 'Unknown error';
            }
        });

        // Return both successful and failed schemas
        res.status(200).json({
            status: 'partial-success',
            message: 'Schemas processed with some errors',
            successData: results,
            errors: errors
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'An unexpected error occurred'
        });
    }
});

// Mock function to listen to requests
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
