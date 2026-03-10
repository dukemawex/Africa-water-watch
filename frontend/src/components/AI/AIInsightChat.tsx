import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Droplets } from 'lucide-react'
import type { WaterPoint } from '../../types'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  'Is this water safe to drink?',
  'When should this be serviced?',
  'What treatment is recommended?',
  'What are the main contamination risks?',
]

interface AIInsightChatProps {
  waterPoint: WaterPoint | null
}

export function AIInsightChat({ waterPoint }: AIInsightChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [language, setLanguage] = useState('english')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!waterPoint || !text.trim() || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    const newMessages = [...messages, userMsg]
    let assistantText = ''
    setMessages((prev) => [...prev, { role: 'assistant', content: '▌' }])

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
        body: JSON.stringify({
          water_point_id: waterPoint.id,
          question: text,
          language,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const lines = decoder.decode(value).split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              try {
                const parsed = JSON.parse(data)
                if (parsed.token) {
                  assistantText += parsed.token
                  setMessages((prev) => [
                    ...prev.slice(0, -1),
                    { role: 'assistant', content: assistantText + '▌' },
                  ])
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: assistantText },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ])
    }

    setStreaming(false)
  }, [waterPoint, messages, streaming, language])

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-teal-500 hover:bg-teal-600 rounded-full flex items-center justify-center shadow-lg transition-colors"
        aria-label="Open AI Chat"
      >
        {open ? <X className="w-5 h-5 text-white" /> : <Droplets className="w-5 h-5 text-white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-navy-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-500/20 rounded-full flex items-center justify-center">
                <Droplets className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">AquaWatch AI</p>
                {waterPoint && <p className="text-xs text-muted truncate max-w-40">{waterPoint.name}</p>}
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs bg-navy-700 border border-navy-600 text-muted rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="english">EN</option>
              <option value="french">FR</option>
              <option value="hausa">HA</option>
              <option value="swahili">SW</option>
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-muted mb-3">Ask about water quality</p>
                <div className="space-y-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left text-xs px-3 py-2 bg-navy-700 hover:bg-navy-600 rounded-lg text-muted hover:text-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-teal-500 text-white rounded-tr-sm'
                      : 'bg-navy-700 text-[#E8F4F3] rounded-tl-sm'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-navy-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                placeholder={waterPoint ? 'Ask about water quality...' : 'Select a water point first'}
                disabled={!waterPoint || streaming}
                className="flex-1 bg-navy-700 border border-navy-600 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!waterPoint || !input.trim() || streaming}
                className="w-8 h-8 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 rounded-lg flex items-center justify-center transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
