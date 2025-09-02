// Test the updated Azure AI Foundry connection
const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT || 'https://foundry-project01.services.ai.azure.com/api/projects/sampleproject01'
const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY

async function testUpdatedConnection() {
  console.log('Testing updated Azure AI Foundry connection...')
  console.log('Endpoint:', endpoint)
  console.log('Project: sampleproject01')
  console.log('Connection ID: bingsearchsample01')
  
  try {
    console.log('\n=== Testing GET /agents ===')
    const response = await fetch(`${endpoint}/agents?api-version=2024-05-01-preview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
        'x-ms-azureai-project': 'sampleproject01'
      }
    })
    console.log('Status:', response.status)
    const responseText = await response.text()
    console.log('Response:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''))
    
    if (response.status === 200) {
      console.log('✅ SUCCESS! Agent endpoint is working')
    } else if (response.status === 401) {
      console.log('❌ AUTHENTICATION ERROR - Check your API key')
    } else if (response.status === 404) {
      console.log('❌ NOT FOUND - Check your project name/endpoint')
    } else {
      console.log('❌ OTHER ERROR - Status:', response.status)
    }
  } catch (error) {
    console.log('❌ CONNECTION ERROR:', error.message)
  }
  
  // Also test creating an agent
  try {
    console.log('\n=== Testing POST /agents (create agent) ===')
    const agentData = {
      model: "gpt-4o-mini",
      name: "TestAgent_" + Date.now(),
      instructions: "You are a test agent.",
      tools: [
        {
          type: "web_search",
          connection_id: "bingsearchsample01"
        }
      ]
    }
    
    const createResponse = await fetch(`${endpoint}/agents?api-version=2024-05-01-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
        'x-ms-azureai-project': 'sampleproject01'
      },
      body: JSON.stringify(agentData)
    })
    
    console.log('Create Status:', createResponse.status)
    const createResponseText = await createResponse.text()
    console.log('Create Response:', createResponseText.substring(0, 500) + (createResponseText.length > 500 ? '...' : ''))
    
    if (createResponse.status === 201 || createResponse.status === 200) {
      console.log('✅ SUCCESS! Agent creation works')
    } else {
      console.log('❌ Agent creation failed')
    }
  } catch (error) {
    console.log('❌ Agent creation error:', error.message)
  }
}

testUpdatedConnection().catch(console.error)
