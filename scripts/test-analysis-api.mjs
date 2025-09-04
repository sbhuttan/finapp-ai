/**
 * Test the new analysis API routes
 */

async function testAnalysisAPI() {
  const symbol = 'AAPL'
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing Analysis API Routes...\n')
  
  // Test Market Analysis
  try {
    console.log(`📊 Testing Market Analysis for ${symbol}...`)
    const response = await fetch(`${baseUrl}/api/analysis/market/${symbol}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Market Analysis API working! Generated at: ${data.generated_at}`)
    } else {
      const error = await response.text()
      console.log(`❌ Market Analysis API failed: ${response.status} - ${error}`)
    }
  } catch (error) {
    console.log(`❌ Market Analysis API error: ${error.message}`)
  }
  
  console.log('\n' + '='.repeat(50))
  
  // Test Sentiment Analysis  
  try {
    console.log(`💭 Testing Sentiment Analysis for ${symbol}...`)
    const response = await fetch(`${baseUrl}/api/analysis/sentiment/${symbol}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Sentiment Analysis API working! Generated at: ${data.generated_at}`)
    } else {
      const error = await response.text()
      console.log(`❌ Sentiment Analysis API failed: ${response.status} - ${error}`)
    }
  } catch (error) {
    console.log(`❌ Sentiment Analysis API error: ${error.message}`)
  }
  
  console.log('\n' + '='.repeat(50))
  
  // Test Risk Analysis
  try {
    console.log(`⚠️ Testing Risk Analysis for ${symbol}...`)
    const response = await fetch(`${baseUrl}/api/analysis/risk/${symbol}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Risk Analysis API working! Generated at: ${data.generated_at}`)
      console.log(`🎯 Risk Score: ${data.risk_score}/10 - Rating: ${data.overall_risk_rating}`)
    } else {
      const error = await response.text()
      console.log(`❌ Risk Analysis API failed: ${response.status} - ${error}`)
    }
  } catch (error) {
    console.log(`❌ Risk Analysis API error: ${error.message}`)
  }
}

testAnalysisAPI().catch(console.error)
