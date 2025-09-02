import React from 'react'
import { NewsItem } from '../lib/stocks'
import Link from 'next/link'

interface Props { 
  news: NewsItem[]
  via?: 'agent' | 'provider'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / (1000 * 60 * 60))
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export default function NewsList({ news, via }: Props) {
  // Show "via Bing" only when explicitly told via prop
  const showViaBing = via === 'agent'
  
  return (
    <div className="bg-white rounded p-4">
      <h3 className="font-semibold mb-2">
        Recent News
        {showViaBing && (
          <span className="ml-2 text-xs text-gray-500 font-normal">(via Bing)</span>
        )}
      </h3>
      <ul className="space-y-3">
        {news.map(n => (
          <li key={n.id} className="">
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-gray-50 p-2 rounded">
              <div className="text-sm font-medium">{n.headline}</div>
              <div className="text-xs text-gray-500">{n.source} • {timeAgo(n.publishedAt)}</div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
