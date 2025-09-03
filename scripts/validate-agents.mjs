// Simple validation script for Python backend integration
// Run with: node validate-agents.mjs

export async function validateBackendStructure() {
  console.log('🔍 Validating Python backend integration...\n')
  
  // Test Python backend health
  try {
    console.log('🐍 Testing Python backend...')
    const pythonUrl = 'http://localhost:8000'
    
    // Test health endpoint
    const healthResponse = await fetch(`${pythonUrl}/`)
    if (healthResponse.ok) {
      const healthData = await healthResponse.json()
      console.log(`   - Health check: ✅ ${healthData.message}`)
    } else {
      console.log(`   - Health check: ❌ Status ${healthResponse.status}`)
    }
    
    // Test news API
    const newsResponse = await fetch(`${pythonUrl}/api/stock/news?symbol=AAPL&limit=3`)
    console.log(`   - News API: ${newsResponse.ok ? '✅' : '❌'} Status ${newsResponse.status}`)
    
    // Test top movers API  
    const moversResponse = await fetch(`${pythonUrl}/api/market/top-movers`)
    console.log(`   - Top Movers API: ${moversResponse.ok ? '✅' : '❌'} Status ${moversResponse.status}`)
    
  } catch (error) {
    console.log('❌ Python backend error:', error.message)
    console.log('💡 Make sure Python backend is running: cd python-backend && python main.py')
  }

  // Test Frontend API endpoints
  try {
    console.log('\n📡 Testing Frontend API endpoints...')
    
    const baseUrl = 'http://localhost:3000'
    
    // Test stock news API (should proxy to Python backend)
    const stockResponse = await fetch(`${baseUrl}/api/stock/news?symbol=AAPL&limit=3`)
    console.log(`   - GET /api/stock/news: ${stockResponse.status} ${stockResponse.ok ? '✅' : '❌'}`)
    
    if (stockResponse.ok) {
      const news = await stockResponse.json()
      console.log(`   - News items received: ${news.length} ✅`)
      
      // Check source header
      const source = stockResponse.headers.get('X-News-Source')
      console.log(`   - News source: ${source || 'unknown'}`)
    }
    
  } catch (error) {
    console.log('❌ Frontend API error:', error.message)
    console.log('💡 Make sure frontend is running: npm run dev')
  }

  console.log('\n🎯 Validation Summary:')
  console.log('- Python backend provides the main API functionality')
  console.log('- Frontend proxies requests to Python backend')  
  console.log('- Legacy TypeScript agents have been removed')
  console.log('- FinancialNewsAgent uses persistent caching for better performance')
}
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
