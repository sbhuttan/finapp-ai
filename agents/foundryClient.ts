/*
  Azure AI Foundry Agents client using the proper AI Foundry REST API
  Based on the Python example you provided with BingGroundingTool
*/

import { AgentDefinition, AgentRunOptions, AgentRunResult } from './types'

const API_VERSION = '2024-07-01-preview' // Use newer API version for Foundry agents

interface AzureAIFoundryConfig {
  endpoint: string
  project: string
  apiKey: string
  bingConnectionId: string
}

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

function getFoundryConfig(): AzureAIFoundryConfig {
  const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT?.trim()
  const project = process.env.AZURE_AI_FOUNDRY_PROJECT?.trim()
  const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY?.trim()
  const bingConnectionId = process.env.BING_GROUNDING_CONNECTION_ID?.trim()

  if (!endpoint) {
    throw new ConfigurationError('AZURE_AI_FOUNDRY_ENDPOINT is required')
  }
  if (!project) {
    throw new ConfigurationError('AZURE_AI_FOUNDRY_PROJECT is required')
  }
  if (!apiKey) {
    throw new ConfigurationError('AZURE_AI_FOUNDRY_API_KEY is required')
  }
  if (!bingConnectionId) {
    throw new ConfigurationError('BING_GROUNDING_CONNECTION_ID is required')
  }

  return { endpoint, project, apiKey, bingConnectionId }
}

function getFoundryHeaders(config: AzureAIFoundryConfig) {
  return {
    'Content-Type': 'application/json',
    'api-key': config.apiKey
  }
}

async function createFoundryAgent(config: AzureAIFoundryConfig, definition: AgentDefinition): Promise<string> {
  // Format tools for Azure AI Foundry agents API (similar to Python example)
  const tools = definition.tools?.map(tool => {
    if (tool.type === 'web_search') {
      return {
        type: 'bing_grounding',
        bing_grounding: {
          connection_id: config.bingConnectionId
        }
      }
    }
    return { type: tool.type }
  }) || []

  const agentData = {
    model: definition.model,
    name: definition.name,
    instructions: definition.instructions,
    tools: tools
  }

  // Use Azure AI Foundry REST API endpoint with project
  const agentsUrl = `${config.endpoint}/api/agents?api-version=${API_VERSION}`
  
  console.log('Creating Foundry agent with URL:', agentsUrl)
  console.log('Agent data:', JSON.stringify(agentData, null, 2))

  const response = await fetch(agentsUrl, {
    method: 'POST',
    headers: getFoundryHeaders(config),
    body: JSON.stringify(agentData)
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Foundry agent creation failed:', response.status, error)
    throw new Error(`Failed to create Foundry agent: ${response.status} ${error}`)
  }

  const agent = await response.json()
  console.log('✅ Foundry agent created:', agent.id)
  return agent.id
}

async function createFoundryThread(config: AzureAIFoundryConfig, agentId: string): Promise<string> {
  const response = await fetch(
    `${config.endpoint}/agents/${agentId}/threads?api-version=${API_VERSION}`,
    {
      method: 'POST',
      headers: getFoundryHeaders(config),
      body: JSON.stringify({})
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create thread: ${response.status} ${error}`)
  }

  const thread = await response.json()
  return thread.id
}

async function postFoundryMessage(config: AzureAIFoundryConfig, agentId: string, threadId: string, message: string): Promise<string> {
  const response = await fetch(
    `${config.endpoint}/agents/${agentId}/threads/${threadId}/messages?api-version=${API_VERSION}`,
    {
      method: 'POST',
      headers: getFoundryHeaders(config),
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to post message: ${response.status} ${error}`)
  }

  const messageResponse = await response.json()
  return messageResponse.id
}

async function createFoundryRun(config: AzureAIFoundryConfig, agentId: string, threadId: string): Promise<string> {
  const response = await fetch(
    `${config.endpoint}/agents/${agentId}/threads/${threadId}/runs?api-version=${API_VERSION}`,
    {
      method: 'POST',
      headers: getFoundryHeaders(config),
      body: JSON.stringify({
        agent_id: agentId
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create run: ${response.status} ${error}`)
  }

  const run = await response.json()
  return run.id
}

async function pollFoundryRun(config: AzureAIFoundryConfig, agentId: string, threadId: string, runId: string, timeoutMs: number = 30000): Promise<any> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(
      `${config.endpoint}/agents/${agentId}/threads/${threadId}/runs/${runId}?api-version=${API_VERSION}`,
      {
        method: 'GET',
        headers: getFoundryHeaders(config)
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get run status: ${response.status} ${error}`)
    }

    const run = await response.json()
    
    if (run.status === 'completed') {
      return run
    } else if (run.status === 'failed') {
      throw new Error(`Run failed: ${run.last_error?.message || 'Unknown error'}`)
    } else if (run.status === 'cancelled') {
      throw new Error('Run was cancelled')
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error('Run timed out')
}

async function getFoundryMessages(config: AzureAIFoundryConfig, agentId: string, threadId: string): Promise<any[]> {
  const response = await fetch(
    `${config.endpoint}/agents/${agentId}/threads/${threadId}/messages?api-version=${API_VERSION}`,
    {
      method: 'GET',
      headers: getFoundryHeaders(config)
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get messages: ${response.status} ${error}`)
  }

  const messages = await response.json()
  return messages.data || []
}

export async function runFoundryAgent<T = any>(definition: AgentDefinition, options: AgentRunOptions): Promise<AgentRunResult<T>> {
  try {
    const config = getFoundryConfig()
    
    console.log('🚀 Using Azure AI Foundry agents with Bing grounding')
    
    // Create agent
    const agentId = await createFoundryAgent(config, definition)
    
    // Create thread
    const threadId = await createFoundryThread(config, agentId)
    
    // Post message
    await postFoundryMessage(config, agentId, threadId, options.input)
    
    // Create and wait for run
    const runId = await createFoundryRun(config, agentId, threadId)
    const run = await pollFoundryRun(config, agentId, threadId, runId, options.timeoutMs)
    
    // Get messages
    const messages = await getFoundryMessages(config, agentId, threadId)
    
    // Find the assistant's response
    const assistantMessage = messages.find(m => m.role === 'assistant')
    
    if (!assistantMessage) {
      throw new Error('No assistant response found')
    }

    let output = assistantMessage.content?.[0]?.text?.value || ''
    let outputJson: T | undefined

    if (options.jsonExpected) {
      try {
        // Try to extract JSON from the response
        const jsonMatch = output.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          outputJson = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.warn('Failed to parse JSON from response:', e)
      }
    }

    return {
      ok: true,
      provider: "azure-foundry",
      outputText: output,
      outputJson,
      asOf: new Date().toISOString()
    }

  } catch (error) {
    console.error('Foundry agent run failed:', error)
    return {
      ok: false,
      provider: "azure-foundry",
      error: error instanceof Error ? error.message : String(error),
      asOf: new Date().toISOString()
    }
  }
}
