#!/usr/bin/env node

// Test the updated news agent without web search tools
import { getNewsViaAgent } from './agents/newsAgent.ts'

async function testNewsAgent() {
  console.log('🧪 Testing updated news agent...')
  
  try {
    const newsItems = await getNewsViaAgent('AAPL', 3, 7)
    console.log('✅ News items received:', newsItems.length)
    
    if (newsItems.length > 0) {
      console.log('📰 Sample news item:')
      console.log(JSON.stringify(newsItems[0], null, 2))
    } else {
      console.log('❌ No news items returned')
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testNewsAgent()
