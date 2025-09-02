// Test Azure AI Foundry connection

const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT || 'https://foundry-project01.services.ai.azure.com/api/projects/firstProject'
const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY

async function testConnection() {
  console.log('Testing Azure AI Foundry connection...')
  console.log('Endpoint:', endpoint)
  
  // Test 1: Try with api-key header
  try {
    console.log('\n=== Test 1: api-key header ===')
    const response1 = await fetch(`${endpoint}/agents?api-version=2024-05-01-preview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'x-ms-azureai-project': 'firstProject'
      }
    })
    console.log('Status:', response1.status)
    console.log('Response:', await response1.text())
  } catch (error) {
    console.log('Error:', error.message)
  }
  
  // Test 2: Try with Ocp-Apim-Subscription-Key header
  try {
    console.log('\n=== Test 2: Ocp-Apim-Subscription-Key header ===')
    const response2 = await fetch(`${endpoint}/agents?api-version=2024-05-01-preview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
        'x-ms-azureai-project': 'firstProject'
      }
    })
    console.log('Status:', response2.status)
    console.log('Response:', await response2.text())
  } catch (error) {
    console.log('Error:', error.message)
  }
  
  // Test 3: Try different API version
  try {
    console.log('\n=== Test 3: Different API version ===')
    const response3 = await fetch(`${endpoint}/agents?api-version=2024-02-15-preview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'x-ms-azureai-project': 'firstProject'
      }
    })
    console.log('Status:', response3.status)
    console.log('Response:', await response3.text())
  } catch (error) {
    console.log('Error:', error.message)
  }
  
  // Test 4: Try without project-specific endpoint
  try {
    console.log('\n=== Test 4: Base endpoint ===')
    const baseEndpoint = 'https://foundry-project01.services.ai.azure.com'
    const response4 = await fetch(`${baseEndpoint}/api/projects/firstProject/agents?api-version=2024-05-01-preview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'x-ms-azureai-project': 'firstProject'
      }
    })
    console.log('Status:', response4.status)
    console.log('Response:', await response4.text())
  } catch (error) {
    console.log('Error:', error.message)
  }
}

testConnection().catch(console.error)
