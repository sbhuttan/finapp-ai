import React, { useState } from 'react'

interface Props { symbol: string; range: string }

export default function StockQA({ symbol, range }: Props) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function ask() {
    if (!question) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/stock-qa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol, range, question }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'AI error')
      setAnswer(data.answer)
    } catch (err: any) {
      setError(err.message || 'Request failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded p-4">
      <h3 className="font-semibold mb-2">AI Q&A</h3>
      <div className="text-xs text-gray-500 mb-2">Educational. Not financial advice.</div>
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about the stock" rows={4} className="w-full rounded border-gray-200 p-2 mb-2" />
      <div className="flex items-center space-x-2">
        <button onClick={ask} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">{loading ? 'Asking...' : 'Ask AI'}</button>
        <button onClick={() => { setQuestion(''); setAnswer(null); setError(null) }} className="px-3 py-2 bg-gray-100 rounded">Clear</button>
      </div>
      <div className="mt-4">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {answer && <div className="prose max-w-none text-sm whitespace-pre-wrap">{answer}</div>}
      </div>
    </div>
  )
}
