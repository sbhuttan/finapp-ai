#!/usr/bin/env node

// Test Azure AI Agents with Bing grounding for news retrieval
import { AIProjectClient } from '@azure/ai-projects'
import { DefaultAzureCredential } from '@azure/identity'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

async function testBingGrounding() {
  try {
    console.log('🧪 Testing Azure AI Agents with Bing grounding...')
    
    console.log('📋 Available environment variables:')
    console.log('- AZURE_AI_FOUNDRY_ENDPOINT:', process.env.AZURE_AI_FOUNDRY_ENDPOINT)
    console.log('- AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT)
    console.log('- BING_GROUNDING_CONNECTION_ID:', process.env.BING_GROUNDING_CONNECTION_ID)
    
    // Initialize project client
    const projectEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT
    if (!projectEndpoint) {
      throw new Error('AZURE_AI_FOUNDRY_ENDPOINT not found')
    }
    
    const projectClient = new AIProjectClient(
      projectEndpoint,
      new DefaultAzureCredential()
    )
    
    console.log('✅ Project client initialized')
    
    // Get Bing connection ID
    const bingConnectionName = process.env.BING_GROUNDING_CONNECTION_ID || 'bingsearchsample01'
    console.log(`🔍 Looking for Bing connection: ${bingConnectionName}`)
    
    // Test creating an agent with Bing grounding
    console.log('🤖 Creating agent with Bing grounding tools...')
    
    // Get connections to find the Bing connection ID
    try {
      const connections = await projectClient.connections.list()
      console.log('📋 Connections response type:', typeof connections)
      console.log('📋 Connections response:', JSON.stringify(connections, null, 2))
      
    } catch (error) {
      console.error('❌ Failed to list connections:', error.message)
      console.log('🔧 Error details:', error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testBingGrounding()
