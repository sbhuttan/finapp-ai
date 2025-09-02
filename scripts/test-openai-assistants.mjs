// Test if Azure AI Foundry uses standard OpenAI Assistants API
const openAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://foundry-project01.openai.azure.com'
const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY

async function testOpenAIAssistants() {
  console.log('Testing Azure OpenAI Assistants API as alternative...')
  console.log('Endpoint:', openAIEndpoint)
  
  const apiVersions = [
    '2024-05-01-preview',
    '2024-02-15-preview', 
    '2024-07-01-preview'
  ]
  
  for (const version of apiVersions) {
    try {
      console.log(`\n=== Testing Azure OpenAI Assistants API version: ${version} ===`)
      const response = await fetch(`${openAIEndpoint}/openai/assistants?api-version=${version}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      })
      
      console.log('Status:', response.status)
      const responseText = await response.text()
      console.log('Response:', responseText.substring(0, 300) + (responseText.length > 300 ? '...' : ''))
      
      if (response.status === 200) {
        console.log('✅ SUCCESS! Azure OpenAI Assistants API works with version:', version)
        return version
      } else if (response.status === 400 && responseText.includes('API version')) {
        console.log('❌ API version not supported')
      } else {
        console.log('📝 Other response - Status:', response.status)
      }
    } catch (error) {
      console.log('❌ Error:', error.message)
    }
  }
  
  return null
}

testOpenAIAssistants().catch(console.error)
