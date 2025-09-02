// Test different API versions with correct header
const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT || 'https://foundry-project01.services.ai.azure.com/api/projects/firstProject'
const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY

const apiVersions = [
  '2024-07-01-preview',
  '2024-06-01-preview',
  '2024-04-01-preview',
  '2024-03-01-preview',
  '2024-02-01-preview',
  '2024-01-01-preview',
  '2023-12-01-preview',
  '2023-11-01-preview',
  '2023-10-01-preview'
]

async function testApiVersions() {
  console.log('Testing different API versions with Ocp-Apim-Subscription-Key...')
  
  for (const version of apiVersions) {
    try {
      console.log(`\n=== Testing API version: ${version} ===`)
      const response = await fetch(`${endpoint}/agents?api-version=${version}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': apiKey,
          'x-ms-azureai-project': 'firstProject'
        }
      })
      console.log('Status:', response.status)
      const responseText = await response.text()
      console.log('Response:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''))
      
      if (response.status === 200) {
        console.log('✅ SUCCESS! Found working API version:', version)
        break
      }
    } catch (error) {
      console.log('Error:', error.message)
    }
  }
}

testApiVersions().catch(console.error)
