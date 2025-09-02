// Test different API versions for Azure AI Foundry
const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT || 'https://foundry-project01.services.ai.azure.com/api/projects/sampleproject01'
const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY

const apiVersions = [
  '2024-07-01-preview',
  '2024-06-01-preview', 
  '2024-04-01-preview',
  '2024-03-01-preview',
  '2024-02-15-preview',
  '2024-02-01-preview',
  '2024-01-01-preview',
  '2023-12-01-preview',
  '2023-11-01-preview'
]

async function findWorkingApiVersion() {
  console.log('Testing API versions for Azure AI Foundry agents...')
  
  for (const version of apiVersions) {
    try {
      console.log(`\n=== Testing API version: ${version} ===`)
      const response = await fetch(`${endpoint}/agents?api-version=${version}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': apiKey,
          'x-ms-azureai-project': 'sampleproject01'
        }
      })
      
      console.log('Status:', response.status)
      const responseText = await response.text()
      console.log('Response:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''))
      
      if (response.status === 200) {
        console.log('✅ SUCCESS! Found working API version:', version)
        return version
      } else if (response.status !== 400) {
        console.log('📝 Different error (not "API version not supported")')
      }
    } catch (error) {
      console.log('Error:', error.message)
    }
  }
  
  console.log('\n❌ No working API version found. The agents API might not be available on this endpoint.')
  return null
}

findWorkingApiVersion().catch(console.error)
