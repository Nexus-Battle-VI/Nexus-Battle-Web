import { useLayoutEffect } from 'react'

import { NotificationBell } from '@/app/NotificationBell'
import { CatalogNotificationsSummary } from '@/features/notifications/CatalogNotificationsSummary'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { useSession } from '@/shared/session'

/**
 * Vista previa de desarrollo del remaster de notificaciones (EN-031): la
 * campana de la cabecera, el resumen de la vitrina y el historial, con una
 * notificacion de cada familia y los textos que escribe ahora el backend.
 *
 * NO ES UNA PANTALLA DEL PRODUCTO. Intercepta `fetch` para
 * `/api/v1/notifications/*` y pone una sesion de ejemplo SOLO mientras esta
 * montada (las notificaciones son por cuenta y no se piden sin sesion); al
 * desmontar devuelve ambos a su estado. Vive en `routes/` porque compone
 * `app/` y una feature. Solo existe con `import.meta.env.DEV`.
 */
const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString()

const SAMPLES = [
  [
    'AUCTION_BID_OUTBID',
    'Superaron tu puja en una subasta. La nueva oferta líder es de 1.500 créditos.',
  ],
  ['AUCTION_SETTLED_WINNER', 'Ganaste una subasta por 2.300 créditos.'],
  ['BATTLE_DROP_GAINED', 'Obtuviste un objeto del rival derrotado en Versus.'],
  ['AUCTION_CLOSING_SOON', 'Una subasta que sigues finaliza en una hora.'],
  ['PRODUCT_CREATED', 'Se agregó "Piedra de afilar" al catálogo.'],
  ['AUCTION_BID_ACCEPTED', 'Tu puja de 250 créditos fue aceptada.'],
  ['PRODUCT_SUSPENDED', '"Machete Óxidado" (que posees) fue suspendido temporalmente.'],
  ['BATTLE_DROP_LOST', 'Perdiste un objeto al ser derrotado en Versus.'],
] as const

const ITEMS = SAMPLES.map(([changeType, description], index) => ({
  id: `vista-previa-${String(index)}`,
  notificationIds: [`vista-previa-${String(index)}`],
  changeType,
  description,
  productId: null,
  implementedAt: minutesAgo(index * 37),
  consolidatedCount: 1,
}))

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const simulate = (url: string): Response | null => {
  if (url.includes('/v1/notifications/me/pending')) return json({ items: ITEMS })
  if (url.includes('/v1/notifications/me/history')) return json({ items: ITEMS })
  if (url.includes('/v1/notifications/me/read')) return json({ status: 'ok' })
  return null
}

export const NotificationsRemasterPreview = (): React.JSX.Element => {
  // De layout y no pasivo: tiene que correr ANTES de que las consultas de los
  // hijos salgan a la red.
  useLayoutEffect(() => {
    const original = globalThis.fetch
    const previous = useSession.getState()
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const simulated = simulate(url)
      return simulated !== null ? Promise.resolve(simulated) : original(input, init)
    }
    useSession.setState({
      subject: 'sujeto-vista-previa',
      accessToken: 'token-vista-previa',
      expiresAt: Date.now() + 3_600_000,
    })
    return () => {
      globalThis.fetch = original
      useSession.setState({
        subject: previous.subject,
        accessToken: previous.accessToken,
        expiresAt: previous.expiresAt,
      })
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-end gap-3 border-b border-border bg-surface-raised px-6 py-3">
        <strong className="mr-auto text-sm text-ink">Vista previa EN-031 · Notificaciones</strong>
        <NotificationBell />
      </header>
      <div className="mx-auto w-full max-w-3xl px-4">
        <CatalogNotificationsSummary />
      </div>
      <NotificationsPage />
    </div>
  )
}
