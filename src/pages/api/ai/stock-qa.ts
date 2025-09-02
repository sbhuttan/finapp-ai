import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { getStockOverview } from '../../../lib/stocks'
import { buildStockContext, buildStockQAPrompt } from '../../../lib/ai'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { symbol, range, question } = req.body || {}
  if (!symbol || !question) return res.status(400).json({ error: 'symbol and question are required' })

  try {
    const overview = await getStockOverview(symbol, range || '6M')
    const ctx = buildStockContext(overview, range || '6M')
    const { system, user } = buildStockQAPrompt(question, ctx)

    // Try Azure OpenAI first
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT
    const azureKey = process.env.AZURE_OPENAI_API_KEY
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT

    if (azureEndpoint && azureKey && azureDeployment) {
      try {
        const url = `${azureEndpoint.replace(/\/$/, '')}/openai/deployments/${azureDeployment}/chat/completions?api-version=2023-05-15`
        const resp = await axios.post(url, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: 500 }, { headers: { 'api-key': azureKey, 'Content-Type': 'application/json' }, timeout: 20000 })
        const answer = resp?.data?.choices?.[0]?.message?.content ?? ''
        return res.status(200).json({ answer, usedProvider: 'azure-openai', asOf: ctx.asOf })
      } catch (err: any) {
        console.error('azure openai error', err?.response?.data || err.message)
        // fall through to openai if available
      }
    }

    // Fallback to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY
    const openaiModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    if (openaiKey) {
      try {
        const resp = await axios.post('https://api.openai.com/v1/chat/completions', { model: openaiModel, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: 500 }, { headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' }, timeout: 20000 })
        const answer = resp?.data?.choices?.[0]?.message?.content ?? ''
        return res.status(200).json({ answer, usedProvider: 'openai', asOf: ctx.asOf })
      } catch (err: any) {
        console.error('openai error', err?.response?.data || err.message)
        return res.status(502).json({ error: 'AI provider error' })
      }
    }

    return res.status(501).json({ error: 'No AI provider configured' })
  } catch (err: any) {
    console.error('stock-qa error', err)
    return res.status(502).json({ error: 'Failed to process request' })
  }
}
