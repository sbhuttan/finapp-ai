import React from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          // Customize heading styles
          h1: ({ children, ...props }) => <h1 {...props} className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>,
          h2: ({ children, ...props }) => <h2 {...props} className="text-xl font-semibold mb-3 text-gray-800">{children}</h2>,
          h3: ({ children, ...props }) => <h3 {...props} className="text-lg font-medium mb-2 text-gray-700">{children}</h3>,
          h4: ({ children, ...props }) => <h4 {...props} className="text-base font-medium mb-2 text-gray-700">{children}</h4>,
          
          // Customize paragraph styles
          p: ({ children, ...props }) => <p {...props} className="mb-3 text-gray-700 leading-relaxed">{children}</p>,
          
          // Customize list styles
          ul: ({ children, ...props }) => <ul {...props} className="mb-3 pl-5 space-y-1">{children}</ul>,
          ol: ({ children, ...props }) => <ol {...props} className="mb-3 pl-5 space-y-1">{children}</ol>,
          li: ({ children, ...props }) => <li {...props} className="text-gray-700">{children}</li>,
          
          // Customize emphasis
          strong: ({ children, ...props }) => <strong {...props} className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children, ...props }) => <em {...props} className="italic text-gray-700">{children}</em>,
          
          // Customize code
          code: ({ children, className, ...props }) => {
            const isInline = !className
            if (isInline) {
              return <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
            }
            return <pre className="bg-gray-100 p-3 rounded overflow-x-auto"><code {...props}>{children}</code></pre>
          },
          
          // Customize blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote {...props} className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">
              {children}
            </blockquote>
          ),
          
          // Customize horizontal rules
          hr: (props) => <hr {...props} className="my-6 border-gray-300" />,
          
          // Customize links
          a: ({ href, children, ...props }) => (
            <a {...props} href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
