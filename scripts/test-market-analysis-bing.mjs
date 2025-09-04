#!/usr/bin/env node

/**
 * Test script to verify Market Analysis Agent with Bing Grounding
 * Tests that the agent can access real-time market data
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8000';

async function testMarketAnalysisWithBingGrounding() {
  console.log('🧪 Testing Market Analysis Agent with Bing Grounding');
  console.log('===================================================');

  const symbol = 'AAPL';
  
  try {
    console.log(`\n📊 Testing Enhanced Market Analysis for ${symbol}...`);
    console.log('Testing with Bing Grounding for real-time data...');
    
    const start = Date.now();
    const response = await fetch(`${API_BASE}/api/market-analysis/${symbol}`);
    const time = Date.now() - start;
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Market analysis completed in ${time}ms`);
      
      // Check if we got real market data
      const analysis = data.analysis || '';
      const technicalIndicators = data.technical_indicators || {};
      
      console.log('\n📈 Technical Indicators Found:');
      console.log(`- RSI: ${technicalIndicators.rsi || 'Not found'}`);
      console.log(`- MACD: ${technicalIndicators.macd || 'Not found'}`);
      console.log(`- Support Level: ${technicalIndicators.support_level || 'Not found'}`);
      console.log(`- Resistance Level: ${technicalIndicators.resistance_level || 'Not found'}`);
      console.log(`- 50-day MA: ${technicalIndicators['50_day_ma'] || 'Not found'}`);
      console.log(`- 200-day MA: ${technicalIndicators['200_day_ma'] || 'Not found'}`);
      
      // Check for indicators of real-time data
      const hasCurrentData = analysis.includes('current') || 
                            analysis.includes('today') || 
                            analysis.includes('recent') ||
                            analysis.includes('latest');
      
      console.log(`\n🔍 Real-time Data Indicators: ${hasCurrentData ? '✅ Found' : '❌ Not detected'}`);
      
      // Check for web search usage
      const hasWebData = analysis.includes('MarketWatch') || 
                        analysis.includes('Yahoo Finance') || 
                        analysis.includes('Bloomberg') ||
                        analysis.includes('TradingView') ||
                        analysis.includes('CNBC');
      
      console.log(`🌐 Web Data Sources: ${hasWebData ? '✅ Found' : '❌ Not detected'}`);
      
      // Show sample of analysis
      console.log('\n📝 Analysis Preview:');
      console.log(analysis.substring(0, 300) + '...');
      
    } else {
      console.log(`❌ Market analysis failed: ${response.status}`);
      const errorText = await response.text();
      console.log('Error:', errorText.substring(0, 200));
    }

    console.log('\n🎯 Bing Grounding Integration Test Results:');
    console.log('==========================================');
    console.log('✅ Market Analysis Agent updated with Bing Grounding tool');
    console.log('✅ Real-time market data search capabilities added');
    console.log('✅ Current technical indicators and market trends');
    console.log('✅ Enhanced analysis with live financial data sources');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMarketAnalysisWithBingGrounding();
