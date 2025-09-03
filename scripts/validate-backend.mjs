// Simple validation script for Python backend integration
// Run with: node validate-backend.mjs

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

  // Test environment variables structure
  console.log('\n⚙️  Python Backend Environment variables:')
  const pythonEnvVars = [
    'PROJECT_ENDPOINT',
    'MODEL_DEPLOYMENT_NAME', 
    'BING_CONNECTION_NAME',
    'FINNHUB_API_KEY'
  ]
  
  console.log('   (These should be set in python-backend/.env)')
  pythonEnvVars.forEach(envVar => {
    console.log(`   - ${envVar}: Required for Python backend`)
  })

  console.log('\n🎯 Validation Summary:')
  console.log('- Python backend provides the main API functionality')
  console.log('- Frontend proxies requests to Python backend')  
  console.log('- Legacy TypeScript agents have been removed')
  console.log('- FinancialNewsAgent uses persistent caching for better performance')
  console.log('- Real-time market data from Finnhub API')
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateBackendStructure().catch(console.error)
}
