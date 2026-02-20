'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Loader2 } from 'lucide-react'
import { sendChatMessage, type ChatMessage } from '@/app/actions/ask-lvl3'

const STARTERS = [
  'What are our biggest SEO wins this month?',
  'Which keywords should we prioritize next?',
  'What content should we create based on the gaps?',
  'How is our branded search trending?',
]

interface Props {
  clientId: string | null
  clientName: string | null
}

export default function AskLvl3Chat({ clientId, clientName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text?: string) {
    const content = (text ?? input).trim()
    if (!content || !clientId || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    const result = await sendChatMessage(clientId, newMessages)

    if (result.error) {
      setError(result.error)
      setMessages(messages)
    } else if (result.reply) {
      setMessages([...newMessages, { role: 'assistant', content: result.reply }])
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const empty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="px-6 py-4 border-b border-surface-700 flex items-center gap-3 shrink-0">
        <MessageCircle className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-lg font-semibold text-surface-100">Ask LVL3</h1>
          <p className="text-xs text-surface-500">
            {clientName
              ? `Advising on ${clientName}`
              : 'Select a client from the top bar to start'}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([])
              setError(null)
            }}
            className="ml-auto text-xs text-surface-500 hover:text-surface-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {empty && clientId && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <p className="text-surface-100 font-medium mb-1">
                What do you want to know about {clientName ?? 'this client'}?
              </p>
              <p className="text-xs text-surface-500">
                I have access to their analytics summary and live GSC data.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-xs text-surface-300 bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 hover:border-surface-500 hover:text-surface-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {empty && !clientId && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-surface-500">
              Select a client from the top bar to start chatting.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-400/15 text-surface-100 border border-brand-400/20'
                  : 'bg-surface-900 text-surface-200 border border-surface-700'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-900 border border-surface-700 rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t border-surface-700 shrink-0">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={clientId ? 'Ask anything about this client...' : 'Select a client first'}
            disabled={!clientId || loading}
            rows={1}
            className="flex-1 bg-surface-900 border border-surface-600 text-surface-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder-surface-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '44px', maxHeight: '160px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 160) + 'px'
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || !clientId || loading}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-marigold)' }}
          >
            <Send className="w-4 h-4 text-surface-950" />
          </button>
        </div>
        <p className="text-center text-xs text-surface-600 mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
