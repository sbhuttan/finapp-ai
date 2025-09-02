// Test base Azure AI Foundry endpoints
const baseEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT || 'https://foundry-project01.services.ai.azure.com'
const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY

async function testBaseEndpoints() {
  console.log('Testing base Azure AI Foundry endpoints...')
  
  const endpoints = [
    '/api/projects/firstProject',
    '/api/projects/firstProject?api-version=2024-05-01-preview',
    '/api/projects?api-version=2024-05-01-preview',
    '/projects/firstProject',
    '/projects',
    '/',
    '/api'
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n=== Testing: ${baseEndpoint}${endpoint} ===`)
      const response = await fetch(`${baseEndpoint}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': apiKey,
          'x-ms-azureai-project': 'firstProject'
        }
      })
      console.log('Status:', response.status)
      const responseText = await response.text()
      console.log('Response:', responseText.substring(0, 400) + (responseText.length > 400 ? '...' : ''))
      
      if (response.status === 200) {
        console.log('✅ SUCCESS! Working endpoint found')
      }
    } catch (error) {
      console.log('Error:', error.message)
    }
  }
}

testBaseEndpoints().catch(console.error)
