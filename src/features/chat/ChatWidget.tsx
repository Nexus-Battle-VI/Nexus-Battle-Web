import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, Link } from 'react-router'

import { askChat, clearChatHistory, openSupportTicket, viewFromPath } from './api'

interface Bubble {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly at: string
  readonly path: string | null
}

const TIME_KEY = 'chat-show-time'

const stamp = (): string =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const safePath = (path: string | null | undefined): string | null => {
  if (path === undefined || path === null || !path.startsWith('/') || path.startsWith('//')) {
    return null
  }
  return path
}

export const ChatWidget = (): React.JSX.Element => {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [bubbles, setBubbles] = useState<readonly Bubble[]>([])
  const [suggestions, setSuggestions] = useState<readonly string[]>([])
  const [attachment, setAttachment] = useState<string | null>(null)
  const [handoff, setHandoff] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [showTime, setShowTime] = useState(
    () => globalThis.sessionStorage.getItem(TIME_KEY) !== '0',
  )

  const topics = [
    t('chat:topicRules'),
    t('chat:topicMission'),
    t('chat:topicAuction'),
    t('chat:topicAccount'),
  ]

  const send = (raw: string): void => {
    const text = raw.trim()
    if (text.length === 0 || pending) {
      return
    }
    setDraft('')
    setFailed(false)
    setPending(true)
    setBubbles((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', text, at: stamp(), path: null },
    ])
    void askChat(text, viewFromPath(pathname), sessionId)
      .then((reply) => {
        setSessionId(reply.sessionId)
        setSuggestions(reply.suggestions)
        setTicketId(reply.ticketId ?? null)
        setBubbles((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: reply.answer ?? t('chat:empty'),
            at: stamp(),
            path: safePath(reply.assistedAction?.path),
          },
        ])
      })
      .catch(() => {
        setFailed(true)
      })
      .finally(() => {
        setPending(false)
      })
  }

  const transfer = (): void => {
    if (ticketId !== null) {
      setHandoff(true)
      return
    }
    const last = [...bubbles].reverse().find((bubble) => bubble.role === 'user')
    if (last === undefined || pending) {
      setHandoff(true)
      return
    }
    setPending(true)
    setFailed(false)
    void openSupportTicket(last.text, viewFromPath(pathname), sessionId)
      .then((opened) => {
        setSessionId(opened.sessionId ?? sessionId)
        setTicketId(opened.id)
        setHandoff(true)
      })
      .catch(() => {
        setFailed(true)
      })
      .finally(() => {
        setPending(false)
      })
  }

  const clear = (): void => {
    void clearChatHistory(sessionId).finally(() => {
      setBubbles([])
      setSuggestions([])
      setTicketId(null)
      setHandoff(false)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label={t('chat:open')}
        aria-expanded={false}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-surface shadow-lg"
        onClick={() => {
          setOpen(true)
        }}
      >
        {t('chat:title')}
      </button>
    )
  }

  return (
    <section
      aria-label={t('chat:title')}
      className="fixed bottom-4 right-4 z-40 flex max-h-[70vh] w-80 min-w-64 resize flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">{t('chat:title')}</h2>
        <button
          type="button"
          aria-label={t('chat:close')}
          className="text-sm text-muted"
          onClick={() => {
            setOpen(false)
          }}
        >
          {t('chat:close')}
        </button>
      </header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {bubbles.length === 0 ? <p className="text-sm text-muted">{t('chat:empty')}</p> : null}
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className={
              bubble.role === 'user'
                ? 'self-end rounded-md bg-brand/15 px-2 py-1 text-sm'
                : 'self-start rounded-md bg-surface-raised px-2 py-1 text-sm'
            }
          >
            <p>
              {bubble.text}
              {showTime ? <span className="ml-2 text-xs text-muted">{bubble.at}</span> : null}
            </p>
            {bubble.path !== null ? <Link to={bubble.path}>{t('chat:openSection')}</Link> : null}
          </div>
        ))}
        {pending ? (
          <p role="status" className="text-sm text-muted">
            {t('chat:typing')}
          </p>
        ) : null}
        {failed ? (
          <p role="alert" className="text-sm text-danger">
            {t('chat:error')}
          </p>
        ) : null}
        {ticketId !== null ? <p role="status">{t('chat:ticket', { id: ticketId })}</p> : null}
        {handoff ? <p className="text-sm">{t('chat:transferred')}</p> : null}
        {attachment !== null ? (
          <p className="text-xs text-muted">{t('chat:attached', { name: attachment })}</p>
        ) : null}
      </div>
      {suggestions.length > 0 ? (
        <ul aria-label={t('chat:suggestions')} className="flex flex-wrap gap-1 px-3 pb-2">
          {suggestions.map((item) => (
            <li key={item}>
              <button
                type="button"
                className="rounded border border-border px-2 py-1 text-xs"
                onClick={() => {
                  send(item)
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-1 px-3 pb-2" aria-label={t('chat:topics')}>
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            className="rounded border border-border px-2 py-1 text-xs"
            onClick={() => {
              setDraft(topic)
            }}
          >
            {topic}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault()
          send(draft)
        }}
      >
        <input
          aria-label={t('chat:placeholder')}
          list="chat-topics"
          value={draft}
          className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm"
          placeholder={t('chat:placeholder')}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
        />
        <datalist id="chat-topics">
          {topics.map((topic) => (
            <option key={topic} value={topic} />
          ))}
        </datalist>
        <button type="submit" className="text-sm font-semibold" disabled={pending}>
          {t('chat:send')}
        </button>
      </form>
      <footer className="flex flex-wrap gap-2 px-3 pb-3 text-xs">
        <label className="cursor-pointer">
          {t('chat:attach')}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              setAttachment(event.target.files?.[0]?.name ?? null)
            }}
          />
        </label>
        <button type="button" onClick={clear}>
          {t('chat:clear')}
        </button>
        <button type="button" onClick={transfer}>
          {t('chat:transfer')}
        </button>
        <button
          type="button"
          onClick={() => {
            setPrefsOpen((current) => !current)
          }}
        >
          {t('chat:preferences')}
        </button>
      </footer>
      {prefsOpen ? (
        <label className="flex items-center gap-2 px-3 pb-3 text-xs">
          <input
            type="checkbox"
            checked={showTime}
            onChange={(event) => {
              setShowTime(event.target.checked)
              globalThis.sessionStorage.setItem(TIME_KEY, event.target.checked ? '1' : '0')
            }}
          />
          {t('chat:showTime')}
        </label>
      ) : null}
    </section>
  )
}
