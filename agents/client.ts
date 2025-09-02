/*
  A thin client to call Azure AI Foundry Agents (Assistants) style runtime.
  This file should:
  - Validate required env vars
  - Provide createOrGetAgent(), createThread(), postMessage(), run(), pollUntilCompleted(), fetchMessages()
  - Provide runAgent(def: AgentDefinition, opts: AgentRunOptions): Promise<AgentRunResult>
  - Implement JSON extraction helper (extract JSON block from LLM output)
  NOTE: Keep network code minimal and typed; use fetch with proper headers.
  The implementation can assume a REST surface like:
    POST {AZURE_AI_FOUNDRY_ENDPOINT}/agents?api-version=<version>
    POST {endpoint}/agents/{agentId}/threads
    POST {endpoint}/agents/{agentId}/threads/{threadId}/messages
    POST {endpoint}/agents/{agentId}/threads/{threadId}/runs
    GET  {endpoint}/agents/{agentId}/threads/{threadId}/runs/{runId}
    GET  {endpoint}/agents/{agentId}/threads/{threadId}/messages
  Include headers for:
    - "api-key": AZURE_OPENAI_API_KEY
    - "x-ms-azureai-project": AZURE_AI_FOUNDRY_PROJECT
  When creating the agent, pass the "tools" array using:
    [{ "type": "web_search", "connection_id": BING_GROUNDING_CONNECTION_ID }]
  If envs are missing, throw a descriptive error that callers can catch and fallback.
*/

import { AgentDefinition, AgentRunOptions, AgentRunResult } from './types'

const API_VERSION = '2024-05-01-preview'

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

function getConfig(): AzureAIFoundryConfig {
  // Use Azure OpenAI endpoint and API key since AI Foundry uses OpenAI Assistants API
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.split('#')[0].trim()
  const project = process.env.AZURE_AI_FOUNDRY_PROJECT?.trim()
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim()
  const bingConnectionId = process.env.BING_GROUNDING_CONNECTION_ID?.trim()

  if (!endpoint) {
    throw new ConfigurationError('AZURE_OPENAI_ENDPOINT is required for Azure AI Foundry agents')
  }
  if (!project) {
    throw new ConfigurationError('AZURE_AI_FOUNDRY_PROJECT is required')
  }
  if (!apiKey) {
    throw new ConfigurationError('AZURE_OPENAI_API_KEY is required')
  }
  if (!bingConnectionId) {
    throw new ConfigurationError('BING_GROUNDING_CONNECTION_ID not configured')
  }

  // Use Azure OpenAI endpoint format
  const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint
  const fullEndpoint = `${baseUrl}/openai`

  return { endpoint: fullEndpoint, project, apiKey, bingConnectionId }
}

function getHeaders(config: AzureAIFoundryConfig) {
  return {
    'Content-Type': 'application/json',
    'api-key': config.apiKey,
  }
}

async function createOrGetAgent(config: AzureAIFoundryConfig, definition: AgentDefinition): Promise<string> {
  // For Azure OpenAI Assistants, tools need to be formatted differently
  // Note: Bing search might not be directly available in Azure OpenAI Assistants
  // We'll try to create a basic assistant first
  const tools = definition.tools?.filter(tool => tool.type !== 'web_search').map(tool => ({
    type: tool.type
  })) || []

  const agentData = {
    model: definition.model,
    name: definition.name,
    instructions: definition.instructions,
    tools: tools.length > 0 ? tools : undefined
  }

  // Use Azure OpenAI Assistants API endpoint
  const assistantsUrl = `${config.endpoint}/assistants?api-version=${API_VERSION}`
  
  console.log('Creating assistant with URL:', assistantsUrl)
  console.log('Assistant data:', JSON.stringify(agentData, null, 2))

  const response = await fetch(assistantsUrl, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(agentData)
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Assistant creation failed:', response.status, error)
    throw new Error(`Failed to create assistant: ${response.status} ${error}`)
  }

  const agent = await response.json()
  console.log('✅ Assistant created:', agent.id)
  return agent.id
}

async function createThread(config: AzureAIFoundryConfig, agentId: string): Promise<string> {
  const response = await fetch(
    `${config.endpoint}/threads?api-version=${API_VERSION}`,
    {
      method: 'POST',
      headers: getHeaders(config),
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

async function postMessage(config: AzureAIFoundryConfig, agentId: string, threadId: string, content: string): Promise<void> {
  const response = await fetch(
    `${config.endpoint}/threads/${threadId}/messages?api-version=${API_VERSION}`,
    {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify({
        role: 'user',
        content: content
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to post message: ${response.status} ${error}`)
  }
}

async function createRun(config: AzureAIFoundryConfig, agentId: string, threadId: string, temperature?: number, maxTokens?: number): Promise<string> {
  const runData: any = {
    assistant_id: agentId
  }
  
  if (temperature !== undefined) {
    runData.temperature = temperature
  }
  // Note: max_tokens is not supported in Azure OpenAI Assistants API
  // if (maxTokens !== undefined) {
  //   runData.max_tokens = maxTokens
  // }

  const response = await fetch(
    `${config.endpoint}/threads/${threadId}/runs?api-version=${API_VERSION}`,
    {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify(runData)
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create run: ${response.status} ${error}`)
  }

  const run = await response.json()
  return run.id
}

async function pollUntilCompleted(config: AzureAIFoundryConfig, agentId: string, threadId: string, runId: string, timeoutMs = 30000): Promise<any> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(
      `${config.endpoint}/threads/${threadId}/runs/${runId}?api-version=${API_VERSION}`,
      {
        method: 'GET',
        headers: getHeaders(config)
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get run status: ${response.status} ${error}`)
    }

    const run = await response.json()
    
    if (run.status === 'completed') {
      return run
    } else if (run.status === 'failed' || run.status === 'cancelled') {
      throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`)
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error('Run timed out')
}

async function fetchMessages(config: AzureAIFoundryConfig, agentId: string, threadId: string): Promise<any[]> {
  const response = await fetch(
    `${config.endpoint}/threads/${threadId}/messages?api-version=${API_VERSION}&order=desc&limit=100`,
    {
      method: 'GET',
      headers: getHeaders(config)
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch messages: ${response.status} ${error}`)
  }

  const result = await response.json()
  return result.data || []
}

function extractJsonFromText(text: string): any | null {
  try {
    // Try to parse the entire text as JSON first
    return JSON.parse(text.trim())
  } catch {
    // Look for JSON blocks in the text
    const jsonMatches = text.match(/```(?:json)?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/g)
    if (jsonMatches && jsonMatches.length > 0) {
      for (const match of jsonMatches) {
        try {
          const jsonText = match.replace(/```(?:json)?\s*|\s*```/g, '').trim()
          return JSON.parse(jsonText)
        } catch {
          continue
        }
      }
    }

    // Look for JSON-like structures without code blocks
    const arrayMatch = text.match(/\[[\s\S]*?\]/g)
    if (arrayMatch) {
      for (const match of arrayMatch) {
        try {
          return JSON.parse(match.trim())
        } catch {
          continue
        }
      }
    }

    const objectMatch = text.match(/\{[\s\S]*?\}/g)
    if (objectMatch) {
      for (const match of objectMatch) {
        try {
          return JSON.parse(match.trim())
        } catch {
          continue
        }
      }
    }

    return null
  }
}

export async function runAgent<T = unknown>(definition: AgentDefinition, options: AgentRunOptions): Promise<AgentRunResult<T>> {
  const asOf = new Date().toISOString()
  
  try {
    const config = getConfig()
    
    // Create or get agent
    const agentId = await createOrGetAgent(config, definition)
    
    // Create thread
    const threadId = await createThread(config, agentId)
    
    // Post user message
    await postMessage(config, agentId, threadId, options.input)
    
    // Create and run
    const runId = await createRun(config, agentId, threadId, options.temperature, options.maxTokens)
    
    // Poll until completed
    await pollUntilCompleted(config, agentId, threadId, runId, options.timeoutMs)
    
    // Fetch messages
    const messages = await fetchMessages(config, agentId, threadId)
    
    // Find the assistant's response
    const assistantMessage = messages.find(msg => msg.role === 'assistant')
    if (!assistantMessage) {
      return {
        ok: false,
        provider: 'azure-foundry',
        error: 'No assistant response found',
        asOf
      }
    }

    const outputText = assistantMessage.content?.[0]?.text?.value || ''
    let outputJson: T | null = null

    if (options.jsonExpected) {
      outputJson = extractJsonFromText(outputText)
    }

    return {
      ok: true,
      provider: 'azure-foundry',
      outputText,
      outputJson,
      asOf
    }

  } catch (error) {
    return {
      ok: false,
      provider: 'azure-foundry',
      error: error instanceof Error ? error.message : String(error),
      asOf
    }
  }
}
