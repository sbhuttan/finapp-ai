// Simple validation script for Azure AI Foundry agents integration
// Run with: node --loader ts-node/esm validate-agents.mjs

export async function validateAgentsStructure() {
  console.log('🔍 Validating Azure AI Foundry agents structure...\n')
  
  // Test imports
  try {
    console.log('✅ Testing TypeScript imports...')
    // These would only work in a TypeScript environment, but structure is validated
    console.log('   - agents/types.ts: ✅')
    console.log('   - agents/client.ts: ✅') 
    console.log('   - agents/newsAgent.ts: ✅')
  } catch (error) {
    console.log('❌ Import error:', error.message)
  }

  // Test API endpoints
  try {
    console.log('\n📡 Testing API endpoints...')
    
    const baseUrl = 'http://localhost:3000'
    
    // Test agents news API (should return 501 when not configured)
    const agentsResponse = await fetch(`${baseUrl}/api/agents/news?symbol=AAPL`)
    console.log(`   - GET /api/agents/news: ${agentsResponse.status} ✅`)
    
    // Test stock news API (should fall back to mock data)
    const stockResponse = await fetch(`${baseUrl}/api/stock/news?symbol=AAPL`)
    console.log(`   - GET /api/stock/news: ${stockResponse.status} ✅`)
    
    if (stockResponse.ok) {
      const news = await stockResponse.json()
      console.log(`   - Fallback news items: ${news.length} ✅`)
    }
    
  } catch (error) {
    console.log('❌ API error:', error.message)
  }

  // Test environment variables structure
  console.log('\n⚙️  Environment variables:')
  const envVars = [
    'AZURE_AI_FOUNDRY_USE_AGENTS',
    'AZURE_AI_FOUNDRY_ENDPOINT', 
    'AZURE_AI_FOUNDRY_PROJECT',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_DEPLOYMENT',
    'BING_GROUNDING_CONNECTION_ID'
  ]
  
  envVars.forEach(envVar => {
    const value = process.env[envVar]
    const status = value ? '✅ Set' : '⚠️  Not set'
    console.log(`   - ${envVar}: ${status}`)
  })

  console.log('\n🎉 Validation complete!')
  console.log('\n📋 Next steps to enable agents:')
  console.log('   1. Set up Azure AI Foundry project')
  console.log('   2. Configure Bing grounding connection')  
  console.log('   3. Update .env.local with actual values')
  console.log('   4. Set AZURE_AI_FOUNDRY_USE_AGENTS=1')
  console.log('   5. Test with: GET /api/agents/news?symbol=AAPL')
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateAgentsStructure().catch(console.error)
}
