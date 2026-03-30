'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Send, ChevronDown, ChevronUp, Trash2, RefreshCw, Paperclip, X } from 'lucide-react'
import { useProfile } from '@/hooks/use-profile'
import { useStreaming } from '@/hooks/use-streaming'
import { DriftCard } from '@/components/ui/drift-card'
import { LinkPicker } from '@/components/links/link-picker'
import { getActiveLinks } from '@/lib/saved-links'
import { cn } from '@/lib/utils'
import { logActivity } from '@/lib/activity-log'
import type { Verdict, StoredVerdict } from '@/types/verdict'
import type { SavedLink } from '@/types/saved-link'

// ─── localStorage helpers ──────────────────────────────────────────────────

const HISTORY_KEY = 'drift_ask_history'
const MAX_HISTORY = 50

function loadHistory(): StoredVerdict[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as StoredVerdict[]) : []
  } catch {
    return []
  }
}

function saveHistory(items: StoredVerdict[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)))
  } catch {
    // storage unavailable
  }
}

// ─── Verdict config ────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  YES: {
    label: 'YES',
    accent: 'bg-gradient-to-r from-drift-accent/70 via-drift-accent/20 to-transparent',
    pillClass: 'text-drift-accent bg-drift-accent/[0.12] border-drift-accent/30',
  },
  NOT_YET: {
    label: 'NOT YET',
    accent: 'bg-gradient-to-r from-amber-400/70 via-amber-400/20 to-transparent',
    pillClass: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
  },
  SKIP: {
    label: 'SKIP',
    accent: 'bg-gradient-to-r from-white/20 via-white/5 to-transparent',
    pillClass: 'text-white/40 bg-white/[0.05] border-white/[0.10]',
  },
} as const

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = 'ask' | 'history'
type Message = { role: 'user' | 'assistant'; content: string }

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AskPage() {
  return <AskPageContent />
}

function AskPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>('ask')
  const [history, setHistory] = useState<StoredVerdict[]>(() => loadHistory())

  const persistToHistory = useCallback((item: StoredVerdict) => {
    setHistory(prev => {
      const next = [item, ...prev].slice(0, MAX_HISTORY)
      saveHistory(next)
      return next
    })
  }, [])

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(v => v.id !== id)
      saveHistory(next)
      return next
    })
  }, [])

  const historyCount = history.length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-h1 text-drift-text-primary leading-none">Ask Drift</h1>
        <p className="text-body-sm text-drift-text-tertiary mt-2">
          Ask anything — should I learn X, is Y worth it, when should I use Z?
        </p>
        <div className="mt-5 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
        {(['ask', 'history'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 rounded-lg text-label font-medium transition-all duration-200',
              activeTab === tab
                ? 'bg-drift-accent text-[#0a0f1a]'
                : 'text-drift-text-tertiary hover:text-drift-text-secondary'
            )}
          >
            {tab === 'ask' ? 'Ask' : `History${historyCount > 0 ? ` (${historyCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* Tab content — always mounted to preserve state when switching tabs */}
      <div className={activeTab === 'ask' ? undefined : 'hidden'}>
        <AskTab onSaveToHistory={persistToHistory} />
      </div>
      <div className={activeTab === 'history' ? undefined : 'hidden'}>
        <HistoryTab history={history} onRemove={removeFromHistory} />
      </div>
    </div>
  )
}

// ─── StreamingCard ─────────────────────────────────────────────────────────

function StreamingCard({ text, error, onRetry }: {
  text: string
  error: string | null
  onRetry: () => void
}) {
  return (
    <DriftCard className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-drift-accent/70 via-drift-accent/20 to-transparent animate-pulse" />
      <div className="px-5 pt-5 pb-5 space-y-4">
        <div className="flex items-center gap-2.5">
          {error ? (
            <span className="text-body-sm text-red-400">Failed to get verdict</span>
          ) : (
            <>
              <div className="w-4 h-4 rounded-full border border-drift-accent/30 border-t-drift-accent animate-spin" />
              <span className="text-body-sm text-drift-text-tertiary">Thinking...</span>
            </>
          )}
        </div>
        {error ? (
          <div className="space-y-3">
            <p className="text-body text-drift-text-secondary">{error}</p>
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm bg-drift-accent/10 text-drift-accent border border-drift-accent/20 hover:bg-drift-accent/15 transition-all duration-200"
            >
              <RefreshCw className="w-3 h-3" />
              Try again
            </button>
          </div>
        ) : text ? (
          <p className="text-body text-drift-text-secondary leading-relaxed">
            {text}
            <span className="inline-block w-0.5 h-3.5 bg-drift-accent ml-0.5 animate-pulse align-middle" />
          </p>
        ) : null}
      </div>
    </DriftCard>
  )
}

// ─── VerdictCard ───────────────────────────────────────────────────────────

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const config = VERDICT_CONFIG[verdict.verdict] ?? VERDICT_CONFIG.SKIP

  return (
    <DriftCard className="relative overflow-hidden">
      <div className={cn('absolute top-0 left-0 right-0 h-[2px]', config.accent)} />
      <div className="px-5 pt-5 pb-5 space-y-4">
        {/* Query label */}
        <p className="text-body-sm text-drift-text-tertiary">{verdict.query}</p>

        {/* Verdict pill + confidence */}
        <div className="flex items-center gap-3">
          <span className={cn(
            'inline-flex items-center px-4 py-2 rounded-full text-body font-bold border',
            config.pillClass
          )}>
            {config.label}
          </span>
          <span className="text-body-sm text-drift-text-tertiary">
            {verdict.confidence} confidence
          </span>
        </div>

        {/* For you */}
        <p className="text-body text-drift-text-primary leading-relaxed">{verdict.for_you}</p>

        {/* Case for / case against */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-drift-accent/[0.05] border border-drift-accent/[0.10] rounded-xl p-4 space-y-2">
            <p className="text-body-sm text-drift-accent/70 uppercase tracking-wide font-medium">Case for</p>
            <p className="text-body-sm text-drift-text-secondary leading-relaxed">{verdict.case_for}</p>
          </div>
          <div className="bg-red-500/[0.05] border border-red-500/[0.15] rounded-xl p-4 space-y-2">
            <p className="text-body-sm text-red-400/70 uppercase tracking-wide font-medium">Case against</p>
            <p className="text-body-sm text-drift-text-tertiary leading-relaxed">{verdict.case_against}</p>
          </div>
        </div>

        {/* Alternative — only when present */}
        {verdict.alternative && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-5 py-4">
            <p className="text-body-sm text-drift-text-tertiary uppercase tracking-wide font-medium mb-2">Alternative</p>
            <p className="text-body text-drift-text-secondary">{verdict.alternative}</p>
          </div>
        )}
      </div>
    </DriftCard>
  )
}

// ─── ConversationThread ────────────────────────────────────────────────────

function ConversationThread({ messages, isStreaming, streamText, onFollowUp }: {
  messages: Message[]
  isStreaming: boolean
  streamText: string
  onFollowUp: (text: string) => void
}) {
  const [followUp, setFollowUp] = useState('')

  // Show only messages after the initial user + assistant exchange
  const threadMessages = messages.slice(2)

  const handleSend = () => {
    const trimmed = followUp.trim()
    if (!trimmed || isStreaming) return
    setFollowUp('')
    onFollowUp(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-4">
      {/* Thread messages */}
      <AnimatePresence initial={false}>
        {threadMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start gap-3')}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-drift-accent/10 border border-drift-accent/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-drift-accent text-[11px]">∿</span>
              </div>
            )}
            <div className={cn(
              'max-w-[82%] rounded-2xl px-5 py-3 text-body leading-relaxed',
              msg.role === 'user'
                ? 'bg-drift-accent/10 border border-drift-accent/20 text-drift-text-primary rounded-br-sm'
                : 'bg-white/[0.04] border border-white/[0.07] text-drift-text-secondary rounded-bl-sm'
            )}>
              {msg.content}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Live streaming reply in thread */}
      {isStreaming && streamText && threadMessages.length >= 0 && (
        <div className="flex justify-start gap-3">
          <div className="w-7 h-7 rounded-full bg-drift-accent/10 border border-drift-accent/25 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-drift-accent text-[11px]">∿</span>
          </div>
          <div className="max-w-[82%] bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-bl-sm px-5 py-3 text-body text-drift-text-secondary leading-relaxed">
            {streamText}
            <span className="inline-block w-0.5 h-3.5 bg-drift-accent ml-0.5 animate-pulse align-middle" />
          </div>
        </div>
      )}

      {/* Follow-up input */}
      <div className={cn(
        'flex items-center gap-3 px-5 py-3.5 rounded-xl bg-drift-surface border border-white/[0.08]',
        isStreaming && 'opacity-60 pointer-events-none'
      )}>
        <input
          value={followUp}
          onChange={e => setFollowUp(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Follow up..."
          disabled={isStreaming}
          className="flex-1 bg-transparent text-body text-drift-text-primary placeholder:text-drift-text-tertiary outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!followUp.trim() || isStreaming}
          className="text-drift-text-tertiary hover:text-drift-accent disabled:opacity-30 transition-colors duration-200"
        >
          <Send className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

// ─── AskTab ────────────────────────────────────────────────────────────────

const SUGGESTION_CHIPS = [
  'Is this worth my time?',
  'How does this relate to my stack?',
  'Give me the key takeaways',
  'Should I save this for later?',
]

function AskTab({ onSaveToHistory }: { onSaveToHistory: (v: StoredVerdict) => void }) {
  const { profile } = useProfile()
  const { text: streamText, isStreaming, error: streamError, stream, reset } = useStreaming()

  const [inputValue, setInputValue] = useState('')
  const [currentVerdict, setCurrentVerdict] = useState<Verdict | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [originalQuery, setOriginalQuery] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [attachedLink, setAttachedLink] = useState<SavedLink | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([])

  useEffect(() => {
    setSavedLinks(getActiveLinks())
  }, [])

  const verdictReceived = useRef(false)

  const buildQuery = (text: string, link: SavedLink | null) => {
    if (!link) return text
    return `${text}\n\n[Attached link: "${link.title}" from ${link.siteName} — ${link.summary}]`
  }

  const triggerQuery = useCallback(async (query: string, threadMessages: Message[], isFollowUp = false) => {
    if (!profile) return
    verdictReceived.current = false
    setParseError(null)
    reset()

    const finalText = await stream(
      () => fetch('/api/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          query,
          messages: threadMessages.length > 0 ? threadMessages : undefined,
        }),
      }),
      isFollowUp ? undefined : {
        onDone: (data, accumulated) => {
          verdictReceived.current = true
          const raw = data as Omit<Verdict, 'id' | 'query' | 'createdAt'>
          const verdict: Verdict = {
            ...raw,
            id: crypto.randomUUID(),
            query,
            createdAt: new Date().toISOString(),
          }
          setCurrentVerdict(verdict)
          logActivity('verdict_made')

          const assistantMessage: Message = { role: 'assistant', content: accumulated }
          const newMessages: Message[] = [...threadMessages, assistantMessage]
          setMessages(newMessages)

          const stored: StoredVerdict = { ...verdict, messages: newMessages }
          onSaveToHistory(stored)
        },
      }
    )

    if (isFollowUp) {
      const assistantMessage: Message = { role: 'assistant', content: finalText }
      setMessages(prev => [...prev, assistantMessage])
    } else if (!verdictReceived.current) {
      setParseError('Could not parse verdict. Try again.')
    }
  }, [profile, stream, reset, onSaveToHistory])

  const handleAsk = useCallback((overrideText?: string) => {
    const trimmed = (overrideText ?? inputValue).trim()
    if (!trimmed || isStreaming) return

    const finalQuery = buildQuery(trimmed, attachedLink)

    setCurrentVerdict(null)
    setMessages([])
    setParseError(null)
    setOriginalQuery(finalQuery)
    setInputValue('')

    const initialMessages: Message[] = [{ role: 'user', content: finalQuery }]
    setMessages(initialMessages)
    triggerQuery(finalQuery, initialMessages)
  }, [inputValue, attachedLink, isStreaming, triggerQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAsk()
  }

  const showStreamingCard = !currentVerdict && (isStreaming || parseError || !!streamError)

  return (
    <div className="space-y-5">
      {/* Input bar */}
      <motion.div
        animate={{
          boxShadow: isStreaming
            ? '0 0 0 1px rgba(77,217,192,0.4), 0 0 24px rgba(77,217,192,0.10)'
            : '0 0 0 1px rgba(255,255,255,0.06)'
        }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-drift-surface backdrop-blur-xl overflow-hidden"
      >
        <div className={cn('flex items-center gap-3 px-4 py-3.5', isStreaming && 'opacity-60 pointer-events-none')}>
          <Sparkles className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a tool or skill..."
            disabled={isStreaming}
            className="flex-1 bg-transparent text-body text-drift-text-primary placeholder:text-drift-text-tertiary outline-none disabled:opacity-50"
          />
          {savedLinks.length > 0 && (
            <button
              onClick={() => setShowPicker(true)}
              title="Attach a link"
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 shrink-0',
                attachedLink
                  ? 'text-drift-accent bg-drift-accent/10'
                  : 'text-drift-text-tertiary hover:text-drift-text-secondary hover:bg-white/[0.05]'
              )}
            >
              <Paperclip className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
          <AnimatePresence>
            {inputValue.trim() && !isStreaming && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => handleAsk()}
                className="flex items-center gap-1.5 text-label text-drift-accent px-3 py-1.5 rounded-lg bg-drift-accent/10 hover:bg-drift-accent/20 transition-colors duration-200 shrink-0"
              >
                Ask
                <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Attached link chip */}
        <AnimatePresence>
          {attachedLink && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 pb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-drift-accent/10 border border-drift-accent/20 min-w-0">
                  <Paperclip className="w-3 h-3 text-drift-accent shrink-0" strokeWidth={1.5} />
                  <span className="text-label text-drift-accent truncate">{attachedLink.title}</span>
                  <button
                    onClick={() => setAttachedLink(null)}
                    className="text-drift-accent/60 hover:text-drift-accent shrink-0 ml-0.5"
                  >
                    <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Suggestion chips when link attached */}
      <AnimatePresence>
        {attachedLink && !currentVerdict && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex gap-2 flex-wrap"
          >
            {SUGGESTION_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => handleAsk(chip)}
                className="px-3 py-1.5 rounded-full text-label bg-white/[0.04] border border-white/[0.07] text-drift-text-tertiary hover:text-drift-text-secondary hover:bg-white/[0.07] transition-all duration-200 shrink-0"
              >
                {chip}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link picker */}
      <AnimatePresence>
        {showPicker && (
          <LinkPicker
            links={savedLinks}
            onSelect={link => { setAttachedLink(link); setShowPicker(false) }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* Streaming card */}
      <AnimatePresence>
        {showStreamingCard && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <StreamingCard
              text={streamText}
              error={parseError ?? streamError}
              onRetry={() => {
                setParseError(null)
                const initialMessages: Message[] = [{ role: 'user', content: originalQuery }]
                triggerQuery(originalQuery, initialMessages)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verdict card + conversation thread */}
      <AnimatePresence>
        {currentVerdict && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <VerdictCard verdict={currentVerdict} />
            <ConversationThread
              messages={messages}
              isStreaming={isStreaming}
              streamText={streamText}
              onFollowUp={(followUp) => {
                const newMessages: Message[] = [...messages, { role: 'user', content: followUp }]
                setMessages(newMessages)
                triggerQuery(originalQuery, newMessages, true)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!isStreaming && !currentVerdict && !parseError && !streamError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-body text-drift-text-secondary mb-1">Ask Drift anything.</p>
          <p className="text-body-sm text-drift-text-tertiary">
            Should I learn X? Is Y worth switching to? When should I use Z?
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ─── HistoryVerdictCard ────────────────────────────────────────────────────

function HistoryVerdictCard({ item, onRemove }: {
  item: StoredVerdict
  onRemove: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const config = VERDICT_CONFIG[item.verdict] ?? VERDICT_CONFIG.SKIP
  const truncatedQuery = item.query.length > 60 ? item.query.slice(0, 60) + '…' : item.query
  const followUpCount = Math.max(0, item.messages.length - 2)
  const date = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <DriftCard className="relative overflow-hidden">
      <div className={cn('absolute top-0 left-0 right-0 h-[2px]', config.accent)} />

      {/* Collapsed header — always visible */}
      <div
        className="px-5 pt-5 pb-4 flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(p => !p)}
      >
        <span className={cn(
          'inline-flex items-center px-3 py-1.5 rounded-full text-body-sm font-bold border shrink-0',
          config.pillClass
        )}>
          {config.label}
        </span>
        <p className="flex-1 text-body text-drift-text-secondary truncate">{truncatedQuery}</p>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
          : <ChevronDown className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
        }
        <button
          onClick={e => { e.stopPropagation(); onRemove(item.id) }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.07] text-drift-text-tertiary hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200 shrink-0"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/[0.05] pt-4">
              {/* Meta */}
              <p className="text-body-sm text-drift-text-tertiary">
                {date} · {followUpCount > 0
                  ? `${followUpCount} follow-up${followUpCount !== 1 ? 's' : ''}`
                  : 'No follow-ups'}
              </p>

              {/* For you */}
              <p className="text-body text-drift-text-primary leading-relaxed">{item.for_you}</p>

              {/* Case for / against */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-drift-accent/[0.05] border border-drift-accent/[0.10] rounded-xl p-4 space-y-2">
                  <p className="text-body-sm text-drift-accent/70 uppercase tracking-wide font-medium">Case for</p>
                  <p className="text-body-sm text-drift-text-secondary leading-relaxed">{item.case_for}</p>
                </div>
                <div className="bg-red-500/[0.05] border border-red-500/[0.15] rounded-xl p-4 space-y-2">
                  <p className="text-body-sm text-red-400/70 uppercase tracking-wide font-medium">Case against</p>
                  <p className="text-body-sm text-drift-text-tertiary leading-relaxed">{item.case_against}</p>
                </div>
              </div>

              {item.alternative && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-5 py-4">
                  <p className="text-body-sm text-drift-text-tertiary uppercase tracking-wide font-medium mb-2">Alternative</p>
                  <p className="text-body text-drift-text-secondary">{item.alternative}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DriftCard>
  )
}

// ─── HistoryTab ────────────────────────────────────────────────────────────

function HistoryTab({ history, onRemove }: {
  history: StoredVerdict[]
  onRemove: (id: string) => void
}) {
  if (history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <p className="text-body text-drift-text-secondary mb-1">No verdicts yet.</p>
        <p className="text-body-sm text-drift-text-tertiary">Ask Drift something to get started.</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {history.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ delay: i * 0.03, duration: 0.25 }}
          >
            <HistoryVerdictCard item={item} onRemove={onRemove} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
