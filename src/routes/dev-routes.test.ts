import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NAVIGATION } from './routes'
import { devRoutes, publicDevRoutes } from './dev-routes'

describe('devRoutes', () => {
  it('el harness de sprites (EN-031) es publico de desarrollo y queda fuera de NAVIGATION', () => {
    expect(devRoutes).toHaveLength(0)
    expect(publicDevRoutes.map((route) => route.path)).toContain('__dev/visual-library/items')
    expect(NAVIGATION.some((item) => item.path.includes('__dev'))).toBe(false)
  })

  it('las vistas previas publicas son de solo desarrollo y no aparecen en NAVIGATION', () => {
    // En modo test `import.meta.env.DEV` es verdadero: las rutas existen aqui.
    // Son las pantallas que viven tras una sesion que el entorno local no
    // puede establecer: "Mi cuenta" (HU-05.4), el alta de producto (HU-33), la
    // seleccion de heroe (HU-07), la cola de moderacion (HU-41.4), las
    // novedades/banner de catalogo (HU-38, Task #181/#185) y el lobby de
    // preparacion de sala de batalla (HU-15.3), el medidor de Poder (HU-11),
    // que aun no esta montado en ninguna pantalla del producto, la pantalla de
    // batalla (HU-17) y el chat (HU-13), que necesitan Combat por WebSocket, y
    // la tarjeta de compra inmediata (HU-64.1), el registro de puja (HU-63.8)
    // y la configuracion de puja automatica (HU-67.6) con datos de ejemplo,
    // revisables en claro y oscuro sin depender de una subasta real, y los
    // productos ganados pendientes de reclamo (HU-69.7), que ademas de datos
    // de ejemplo falsea una sesion (necesita Auction real) y se monta dentro
    // de `AppLayout` para revisar tambien el header (badge de pendientes), y
    // la lista de seguimiento de subastas (HU-68) con Auction falseado, el
    // selector de dificultad (HU-75.3), que espera la matricula de HU-70.3, y
    // la vista previa de mercado (remaster visual E-commerce Sprint 3, 4a
    // pasada) con productos ficticios, porque el catalogo local no siempre
    // tiene productos publicados para inspeccionar la Product Card real, y
    // los tres previews consolidados del remaster visual de "Jugar Online"
    // (lobby/sala de espera/batalla, Sprint 3), por la misma razon: el
    // catalogo local no siempre tiene salas/heroes suficientes para
    // inspeccionar cada estado.
    expect(publicDevRoutes.map((route) => route.path)).toEqual([
      '__dev/visual-library/items',
      '__dev/tournament/formats',
      '__dev/chatbot-admin',
      '__dev/ecommerce/marketplace-preview',
      '__dev/battle-rooms/lobby-remaster-preview',
      '__dev/battle-rooms/room-remaster-preview',
      '__dev/battle-rooms/room-remaster-preview/:roomId',
      '__dev/battle-rooms/battle-remaster-preview',
      '__dev/hu68/watchlist',
      '__dev/admin/console',
      '__dev/shell',
      '__dev/admin/auction-metrics',
      '__dev/auction/immediate-purchase',
      '__dev/auction/bidding',
      '__dev/auction/auto-bid',
      '__dev/auction/activity',
      '__dev/auction/publish',
      '__dev/auction/publish-official',
      '__dev/auction/marketplace',
      '__dev/auction/detail',
      '__dev/auction/detail/:auctionId',
      '__dev/auction/pending-claims',
      '__dev/account',
      '__dev/admin/products/new',
      '__dev/heroes',
      '__dev/inventory',
      '__dev/admin/comments/moderation',
      '__dev/hu38/notifications',
      '__dev/hu38/admin-banners',
      '__dev/hu15/lobby',
      '__dev/hu15/lobby/:roomId',
      '__dev/hu11/poder',
      '__dev/hu17/battle',
      '__dev/hu13/chat',
      '__dev/hu75/dificultad',
      '__dev/tournament',
      '__dev/tournament/local',
      '__dev/tournament/registration',
      '__dev/tournament/admin',
      '__dev/missions',
      '__dev/auth',
      '__dev/notifications',
    ])
    expect(NAVIGATION.some((item) => item.path.includes('__dev'))).toBe(false)

    // La unica forma de que exista es la guarda `import.meta.env.DEV`: en una
    // compilacion de produccion (`DEV === false`) el arreglo queda vacio.
    expect(import.meta.env.DEV).toBe(true)
  })

  it('el harness perezoso de sprites muestra los 8 heroes y el arte de todos los productos oficiales', async () => {
    const route = publicDevRoutes.find((entry) => entry.path === '__dev/visual-library/items')
    if (!route) {
      throw new Error(
        'se esperaba que devRoutes declarara el harness de sprites en modo test (DEV)',
      )
    }

    render(route.element)

    expect(
      await screen.findByText(/vista previa en-031 · sprites/iu, {}, { timeout: 10000 }),
    ).toBeInTheDocument()
    expect(screen.getByText(/0 productos oficiales sin arte/iu)).toBeInTheDocument()

    for (const name of [
      'Guerrero Tanque',
      'Guerrero Armas',
      'Mago Fuego',
      'Mago Hielo',
      'Pícaro Veneno',
      'Pícaro Machete',
      'Chamán',
      'Médico',
    ]) {
      expect(screen.getByRole('img', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('img', { name: 'espada-de-una-mano' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'reanimador-3000' })).toBeInTheDocument()
  })
})
