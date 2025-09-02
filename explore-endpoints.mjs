// Explore what endpoints are available in Azure AI Foundry
const baseEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT || 'https://foundry-project01.services.ai.azure.com'
const projectEndpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT || 'https://foundry-project01.services.ai.azure.com/api/projects/sampleproject01'
const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY

async function exploreEndpoints() {
  console.log('Exploring available Azure AI Foundry endpoints...')
  
  const endpointsToTest = [
    // Project info
    `${projectEndpoint}?api-version=2024-02-15-preview`,
    `${projectEndpoint}?api-version=2024-05-01-preview`,
    
    // Alternative agent patterns
    `${projectEndpoint}/assistants?api-version=2024-02-15-preview`,
    `${projectEndpoint}/assistants?api-version=2024-05-01-preview`,
    `${projectEndpoint}/chat?api-version=2024-02-15-preview`,
    `${projectEndpoint}/deployments?api-version=2024-02-15-preview`,
    
    // Direct base patterns
    `${baseEndpoint}/api/assistants?api-version=2024-02-15-preview`,
    `${baseEndpoint}/assistants?api-version=2024-02-15-preview`,
    
    // Alternative project structure
    `${baseEndpoint}/projects/sampleproject01/agents?api-version=2024-02-15-preview`,
    `${baseEndpoint}/projects/sampleproject01/assistants?api-version=2024-02-15-preview`,
  ]
  
  for (const endpoint of endpointsToTest) {
    try {
      console.log(`\n=== Testing: ${endpoint} ===`)
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': apiKey,
          'x-ms-azureai-project': 'sampleproject01'
        }
      })
      
      console.log('Status:', response.status)
      const responseText = await response.text()
      console.log('Response:', responseText.substring(0, 300) + (responseText.length > 300 ? '...' : ''))
      
      if (response.status === 200) {
        console.log('✅ SUCCESS! This endpoint works')
      } else if (response.status === 404) {
        console.log('❌ Not found')
      } else if (response.status === 400) {
        if (responseText.includes('API version not supported')) {
          console.log('❌ API version not supported')
        } else {
          console.log('📝 Different 400 error - might be closer!')
        }
      } else {
        console.log('📝 Status:', response.status)
      }
    } catch (error) {
      console.log('❌ Error:', error.message)
    }
  }
}

exploreEndpoints().catch(console.error)
