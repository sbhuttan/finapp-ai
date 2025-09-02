// Test Azure OpenAI Assistant without web search tools
const endpoint = process.env.AZURE_OPENAI_ENDPOINT ? `${process.env.AZURE_OPENAI_ENDPOINT}/openai` : 'https://foundry-project01.openai.azure.com/openai'
const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY

async function testBasicAssistant() {
  console.log('Testing basic Azure OpenAI Assistant without tools...')
  
  try {
    // Step 1: Create a simple assistant
    console.log('\n=== Creating Assistant ===')
    const assistantResponse = await fetch(`${endpoint}/assistants?api-version=2024-05-01-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        name: 'TestAssistant_' + Date.now(),
        instructions: 'You are a helpful assistant. Answer questions clearly and concisely.'
      })
    })
    
    if (!assistantResponse.ok) {
      const error = await assistantResponse.text()
      console.log('❌ Assistant creation failed:', assistantResponse.status, error)
      return
    }
    
    const assistant = await assistantResponse.json()
    console.log('✅ Assistant created:', assistant.id)
    
    // Step 2: Create a thread
    console.log('\n=== Creating Thread ===')
    const threadResponse = await fetch(`${endpoint}/threads?api-version=2024-05-01-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({})
    })
    
    if (!threadResponse.ok) {
      const error = await threadResponse.text()
      console.log('❌ Thread creation failed:', threadResponse.status, error)
      return
    }
    
    const thread = await threadResponse.json()
    console.log('✅ Thread created:', thread.id)
    
    // Step 3: Add a message
    console.log('\n=== Adding Message ===')
    const messageResponse = await fetch(`${endpoint}/threads/${thread.id}/messages?api-version=2024-05-01-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        role: 'user',
        content: 'Hello! Can you tell me what day of the week it is today?'
      })
    })
    
    if (!messageResponse.ok) {
      const error = await messageResponse.text()
      console.log('❌ Message creation failed:', messageResponse.status, error)
      return
    }
    
    console.log('✅ Message added')
    
    // Step 4: Create a run
    console.log('\n=== Creating Run ===')
    const runResponse = await fetch(`${endpoint}/threads/${thread.id}/runs?api-version=2024-05-01-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        assistant_id: assistant.id
      })
    })
    
    if (!runResponse.ok) {
      const error = await runResponse.text()
      console.log('❌ Run creation failed:', runResponse.status, error)
      return
    }
    
    const run = await runResponse.json()
    console.log('✅ Run created:', run.id)
    
    // Step 5: Poll for completion
    console.log('\n=== Polling for completion ===')
    let attempts = 0
    while (attempts < 30) {
      const statusResponse = await fetch(`${endpoint}/threads/${thread.id}/runs/${run.id}?api-version=2024-05-01-preview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      })
      
      if (!statusResponse.ok) {
        const error = await statusResponse.text()
        console.log('❌ Status check failed:', statusResponse.status, error)
        return
      }
      
      const status = await statusResponse.json()
      console.log(`Run status: ${status.status}`)
      
      if (status.status === 'completed') {
        console.log('✅ Run completed!')
        
        // Get messages
        const messagesResponse = await fetch(`${endpoint}/threads/${thread.id}/messages?api-version=2024-05-01-preview`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
          }
        })
        
        if (messagesResponse.ok) {
          const messages = await messagesResponse.json()
          console.log('\n=== Assistant Response ===')
          const assistantMessages = messages.data.filter(m => m.role === 'assistant')
          if (assistantMessages.length > 0) {
            console.log(assistantMessages[0].content[0].text.value)
          }
        }
        
        return
      } else if (status.status === 'failed') {
        console.log('❌ Run failed:', status.last_error)
        return
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }
    
    console.log('❌ Run timed out')
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testBasicAssistant().catch(console.error)
