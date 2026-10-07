import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, Link } from 'react-router'

import { BattlePixelIcon } from '@/features/battle-rooms/BattlePixelIcon'

import './chat.css'

import {
  askChat,
  chatHistory,
  chatPreferences,
  clearChatHistory,
  openSupportTicket,
  rateChat,
  saveChatPreferences,
  viewFromPath,
  type ChatTurn,
} from './api'

interface Bubble {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly at: string
  readonly path: string | null
  readonly rateId: string | null
  readonly useful: boolean | null
}

const TIME_KEY = 'chat-show-time'
const SESSION_KEY = 'chat-session-id'

const stamp = (): string =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const safePath = (path: string | null | undefined): string | null => {
  if (path === undefined || path === null || !path.startsWith('/') || path.startsWith('//')) {
    return null
  }
  return path
}

const turnsToBubbles = (turns: readonly ChatTurn[], empty: string): readonly Bubble[] =>
  turns.flatMap((turn) => [
    {
      id: `${turn.id}-question`,
      role: 'user' as const,
      text: turn.question,
      at: '',
      path: null,
      rateId: null,
      useful: null,
    },
    {
      id: turn.id,
      role: 'assistant' as const,
      text: turn.answer ?? empty,
      at: '',
      path: null,
      rateId: turn.id,
      useful: turn.useful,
    },
  ])

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

  useEffect(() => {
    if (!open) {
      return
    }
    const stored = globalThis.sessionStorage.getItem(SESSION_KEY)
    void chatHistory(stored)
      .then((history) => {
        if (history.sessionId !== null) {
          globalThis.sessionStorage.setItem(SESSION_KEY, history.sessionId)
          setSessionId(history.sessionId)
        }
        setBubbles((current) =>
          current.length > 0 ? current : turnsToBubbles(history.turns, t('chat:empty')),
        )
        return chatPreferences(history.sessionId ?? stored)
      })
      .then((prefs) => {
        setShowTime(prefs.showTime)
        globalThis.sessionStorage.setItem(TIME_KEY, prefs.showTime ? '1' : '0')
      })
      .catch(() => undefined)
  }, [open, t])

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
      {
        id: crypto.randomUUID(),
        role: 'user',
        text,
        at: stamp(),
        path: null,
        rateId: null,
        useful: null,
      },
    ])
    void askChat(text, viewFromPath(pathname), sessionId)
      .then((reply) => {
        setSessionId(reply.sessionId)
        setSuggestions(reply.suggestions)
        setTicketId(reply.ticketId ?? null)
        setBubbles((current) => [
          ...current,
          {
            id: reply.turnId ?? crypto.randomUUID(),
            role: 'assistant',
            text: reply.answer ?? t('chat:empty'),
            at: stamp(),
            path: safePath(reply.assistedAction?.path),
            rateId: reply.turnId ?? null,
            useful: null,
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
      <div className="help-dock">
        <button
          type="button"
          aria-label={t('chat:open')}
          aria-expanded={false}
          className="help-launcher"
          onClick={() => {
            setOpen(true)
          }}
        >
          <BattlePixelIcon icon="chat" size="lg" />
        </button>
      </div>
    )
  }

  return (
    <div className="help-dock">
      <section aria-label={t('chat:title')} className="help-panel">
        <header className="help-panel-header">
          <h2 className="help-panel-title">{t('chat:title')}</h2>
          <button
            type="button"
            aria-label={t('chat:close')}
            className="help-btn"
            onClick={() => {
              setOpen(false)
            }}
          >
            {t('chat:close')}
          </button>
        </header>
        <div className="help-panel-scroll">
          {bubbles.length === 0 ? <p className="text-sm text-muted">{t('chat:empty')}</p> : null}
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              className={
                bubble.role === 'user'
                  ? 'help-bubble help-bubble-user'
                  : 'help-bubble help-bubble-assistant'
              }
            >
              <p>
                {bubble.text}
                {showTime ? <span className="ml-2 text-xs text-muted">{bubble.at}</span> : null}
              </p>
              {bubble.path !== null ? <Link to={bubble.path}>{t('chat:openSection')}</Link> : null}
              {bubble.rateId !== null ? (
                <p className="mt-1 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="help-btn"
                    aria-pressed={bubble.useful === true}
                    onClick={() => {
                      void rateChat(bubble.rateId ?? '', true, sessionId)
                        .then(() => {
                          setBubbles((current) =>
                            current.map((item) =>
                              item.id === bubble.id ? { ...item, useful: true } : item,
                            ),
                          )
                        })
                        .catch(() => {
                          setFailed(true)
                        })
                    }}
                  >
                    {t('chat:useful')}
                  </button>
                  <button
                    type="button"
                    className="help-btn"
                    aria-pressed={bubble.useful === false}
                    onClick={() => {
                      void rateChat(bubble.rateId ?? '', false, sessionId)
                        .then(() => {
                          setBubbles((current) =>
                            current.map((item) =>
                              item.id === bubble.id ? { ...item, useful: false } : item,
                            ),
                          )
                        })
                        .catch(() => {
                          setFailed(true)
                        })
                    }}
                  >
                    {t('chat:notUseful')}
                  </button>
                </p>
              ) : null}
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
          <ul aria-label={t('chat:suggestions')} className="help-topics">
            {suggestions.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className="help-btn"
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
        <div className="help-topics" aria-label={t('chat:topics')}>
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              className="help-btn"
              onClick={() => {
                setDraft(topic)
              }}
            >
              {topic}
            </button>
          ))}
        </div>
        <form
          className="help-panel-form"
          onSubmit={(event) => {
            event.preventDefault()
            send(draft)
          }}
        >
          <input
            aria-label={t('chat:placeholder')}
            list="chat-topics"
            value={draft}
            className="help-field"
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
          <button type="submit" className="help-btn help-btn-primary" disabled={pending}>
            {t('chat:send')}
          </button>
        </form>
        <footer className="help-panel-footer">
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
          <button type="button" className="help-btn" onClick={clear}>
            {t('chat:clear')}
          </button>
          <button type="button" className="help-btn" onClick={transfer}>
            {t('chat:transfer')}
          </button>
          <button
            type="button"
            className="help-btn"
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
                void saveChatPreferences(event.target.checked, sessionId).catch(() => {
                  setFailed(true)
                })
              }}
            />
            {t('chat:showTime')}
          </label>
        ) : null}
      </section>
    </div>
  )
}
