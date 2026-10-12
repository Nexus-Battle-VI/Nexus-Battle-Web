import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { AuthPixelIcon } from '@/components/auth/AuthPixelIcon'
import {
  fetchPendingCatalogNotifications,
  markCatalogNotificationsRead,
} from '@/features/notifications/api'
import { NotificationRow } from '@/features/notifications/NotificationRow'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { playSfx } from '@/shared/sound'

/** Cuantas se muestran en el panel; el resto, en el historial. */
const SHOWN = 5
const REFRESH_MS = 60_000

/**
 * Campana de notificaciones de la cabecera (EN-031).
 *
 * Solo con sesion, como `CreditsBadge`: las notificaciones son por cuenta y
 * el servicio deduce al jugador del testimonio. Usa el endpoint que ya existe
 * (`GET /me/pending`), con su propia clave de cache (ver `queryKeys`), y se
 * refresca al volver el foco y cada minuto.
 *
 * Marca como leidas SOLO las que el panel muestra, y al abrirlo -que es
 * cuando se presentan-, con el mismo criterio que el resumen de la vitrina:
 * todas las `notificationIds` de cada fila consolidada. El contador se
 * recalcula al cerrar, no mientras el panel esta abierto, para que las filas
 * no desaparezcan bajo la vista.
 *
 * Si la consulta falla, la campana se queda sin contador; el panel lo dice.
 * Un problema de Notifications no debe romper la cabecera.
 */
export const NotificationBell = (): React.JSX.Element | null => {
  const subject = useSession((state) => state.subject)
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const key = queryKeys.notifications.bell(subject)

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchPendingCatalogNotifications(signal),
    enabled: subject !== null,
    refetchOnWindowFocus: true,
    refetchInterval: REFRESH_MS,
  })

  // EN-031: suena SOLO cuando llegan notificaciones nuevas (el contador sube
  // respecto a la lectura anterior), nunca en la primera carga ni al bajar.
  const pendingCount = query.data?.length
  const previousCount = useRef<number | null>(null)
  useEffect(() => {
    if (pendingCount === undefined) return
    if (previousCount.current !== null && pendingCount > previousCount.current) {
      playSfx('notification')
    }
    previousCount.current = pendingCount
  }, [pendingCount])

  const markRead = useMutation({
    mutationFn: markCatalogNotificationsRead,
    // Se lanza sola al abrir el panel: no es una accion que deba sonar.
    meta: { sfx: false },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.history(subject) })
    },
  })

  const close = (returnFocus: boolean): void => {
    playSfx('menuClose')
    setOpen(false)
    void queryClient.invalidateQueries({ queryKey: key })
    if (returnFocus) buttonRef.current?.focus()
  }

  // Cerrar al pulsar fuera o con Escape. Los oyentes solo existen con el
  // panel abierto.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.bell(subject),
        })
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.bell(subject),
        })
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, queryClient, subject])

  if (subject === null) {
    return null
  }

  const items = query.data ?? []
  const shown = items.slice(0, SHOWN)
  const count = items.length

  const toggle = (): void => {
    if (open) {
      close(false)
      return
    }
    playSfx('menuOpen')
    setOpen(true)
    const ids = [...new Set(shown.flatMap((item) => item.notificationIds))]
    if (ids.length > 0) markRead.mutate(ids)
  }

  const label =
    count > 0 ? t('notifications:bell.unread', { count }) : t('notifications:bell.label')

  return (
    <div ref={containerRef} className="nb-bell">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="nb-hud-pill inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <AuthPixelIcon icon="bell" size="md" />
        {count > 0 && (
          <span aria-hidden="true" className="nb-bell-count">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <section
          id={panelId}
          aria-label={t('notifications:bell.title')}
          className="nb-bell-popover nb-notice-panel p-4"
        >
          <h2 className="text-sm font-semibold text-ink">{t('notifications:bell.title')}</h2>

          {query.isLoading && (
            <p role="status" className="mt-3 text-sm text-muted">
              {t('notifications:bell.loading')}
            </p>
          )}

          {query.isError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {t('notifications:bell.failed')}
            </p>
          )}

          {!query.isLoading && !query.isError && shown.length === 0 && (
            <p className="mt-3 text-sm text-muted">{t('notifications:bell.empty')}</p>
          )}

          {shown.length > 0 && (
            <ul className="mt-2 flex max-h-96 flex-col divide-y divide-border overflow-y-auto">
              {shown.map((item) => (
                <li key={item.id} className="py-3">
                  <NotificationRow item={item} />
                </li>
              ))}
            </ul>
          )}

          {count > SHOWN && (
            <p className="mt-1 text-xs text-muted">
              {t('notifications:bell.more', { count: count - SHOWN })}
            </p>
          )}

          <Link
            to="/notifications"
            onClick={() => {
              close(false)
            }}
            className="mt-3 inline-block text-sm font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t('notifications:bell.viewAll')}
          </Link>
        </section>
      )}
    </div>
  )
}
