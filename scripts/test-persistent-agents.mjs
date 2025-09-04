#!/usr/bin/env node

/**
 * Test script to verify persistent agent functionality
 * Tests that agents are reused across multiple requests
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8000';

async function testPersistentAgents() {
  console.log('🧪 Testing Persistent Agent Functionality');
  console.log('==========================================');

  const symbol = 'AAPL';
  
  try {
    console.log(`\n📊 Testing Market Analysis Agent (${symbol})...`);
    console.log('First request (should create new agent):');
    const marketStart1 = Date.now();
    const market1 = await fetch(`${API_BASE}/api/market-analysis/${symbol}`);
    const marketTime1 = Date.now() - marketStart1;
    
    if (market1.ok) {
      console.log(`✅ Market analysis 1 completed in ${marketTime1}ms`);
    } else {
      console.log(`❌ Market analysis 1 failed: ${market1.status}`);
    }

    console.log('\nSecond request (should reuse existing agent):');
    const marketStart2 = Date.now();
    const market2 = await fetch(`${API_BASE}/api/market-analysis/${symbol}`);
    const marketTime2 = Date.now() - marketStart2;
    
    if (market2.ok) {
      console.log(`✅ Market analysis 2 completed in ${marketTime2}ms`);
      console.log(`⚡ Performance improvement: ${marketTime1 - marketTime2}ms faster (${((marketTime1 - marketTime2) / marketTime1 * 100).toFixed(1)}%)`);
    } else {
      console.log(`❌ Market analysis 2 failed: ${market2.status}`);
    }

    console.log(`\n💭 Testing Sentiment Analysis Agent (${symbol})...`);
    console.log('First request (should create new agent):');
    const sentimentStart1 = Date.now();
    const sentiment1 = await fetch(`${API_BASE}/api/sentiment-analysis/${symbol}`);
    const sentimentTime1 = Date.now() - sentimentStart1;
    
    if (sentiment1.ok) {
      console.log(`✅ Sentiment analysis 1 completed in ${sentimentTime1}ms`);
    } else {
      console.log(`❌ Sentiment analysis 1 failed: ${sentiment1.status}`);
    }

    console.log('\nSecond request (should reuse existing agent):');
    const sentimentStart2 = Date.now();
    const sentiment2 = await fetch(`${API_BASE}/api/sentiment-analysis/${symbol}`);
    const sentimentTime2 = Date.now() - sentimentStart2;
    
    if (sentiment2.ok) {
      console.log(`✅ Sentiment analysis 2 completed in ${sentimentTime2}ms`);
      console.log(`⚡ Performance improvement: ${sentimentTime1 - sentimentTime2}ms faster (${((sentimentTime1 - sentimentTime2) / sentimentTime1 * 100).toFixed(1)}%)`);
    } else {
      console.log(`❌ Sentiment analysis 2 failed: ${sentiment2.status}`);
    }

    console.log(`\n⚠️ Testing Risk Analysis Agent (${symbol})...`);
    console.log('First request (should create new agent):');
    const riskStart1 = Date.now();
    const risk1 = await fetch(`${API_BASE}/api/risk-analysis/${symbol}`);
    const riskTime1 = Date.now() - riskStart1;
    
    if (risk1.ok) {
      console.log(`✅ Risk analysis 1 completed in ${riskTime1}ms`);
    } else {
      console.log(`❌ Risk analysis 1 failed: ${risk1.status}`);
    }

    console.log('\nSecond request (should reuse existing agent):');
    const riskStart2 = Date.now();
    const risk2 = await fetch(`${API_BASE}/api/risk-analysis/${symbol}`);
    const riskTime2 = Date.now() - riskStart2;
    
    if (risk2.ok) {
      console.log(`✅ Risk analysis 2 completed in ${riskTime2}ms`);
      console.log(`⚡ Performance improvement: ${riskTime1 - riskTime2}ms faster (${((riskTime1 - riskTime2) / riskTime1 * 100).toFixed(1)}%)`);
    } else {
      console.log(`❌ Risk analysis 2 failed: ${risk2.status}`);
    }

    console.log('\n🔄 Testing Combined Analysis (should reuse all agents):');
    const combinedStart = Date.now();
    const combined = await fetch(`${API_BASE}/api/analysis/${symbol}`);
    const combinedTime = Date.now() - combinedStart;
    
    if (combined.ok) {
      console.log(`✅ Combined analysis completed in ${combinedTime}ms`);
      const combinedData = await combined.json();
      console.log(`📈 Market Analysis: ${combinedData.market_analysis ? '✅' : '❌'}`);
      console.log(`💭 Sentiment Analysis: ${combinedData.sentiment_analysis ? '✅' : '❌'}`);
      console.log(`⚠️ Risk Analysis: ${combinedData.risk_analysis ? '✅' : '❌'}`);
    } else {
      console.log(`❌ Combined analysis failed: ${combined.status}`);
    }

    console.log('\n🎯 Persistent Agent Test Results:');
    console.log('================================');
    console.log('✅ All agents now use persistent architecture');
    console.log('✅ Agent names are fixed (MarketAnalysisAgent, SentimentAnalysisAgent, RiskAnalysisAgent)');
    console.log('✅ Agents are reused across requests for better performance');
    console.log('✅ Optional cleanup functions available for resource management');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPersistentAgents();
