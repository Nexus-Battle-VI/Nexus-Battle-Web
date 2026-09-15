import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { BannerManagementPage } from './BannerManagementPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const wasPostCalled = (fetchImpl: ReturnType<typeof vi.fn>): boolean =>
  (fetchImpl.mock.calls as [string, RequestInit | undefined][]).some(
    ([, init]) => init?.method === 'POST',
  )

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/título del banner/iu), 'Mantenimiento programado')
  await user.type(
    screen.getByLabelText(/mensaje del banner/iu),
    'El catálogo estará en mantenimiento el sábado.',
  )
  const [start, end] = screen.getAllByLabelText(/vigencia/u)
  await user.type(start!, '2026-09-06T10:00')
  await user.type(end!, '2026-09-10T10:00')
}

describe('BannerManagementPage (HU-38, Task #181)', () => {
  it('rechaza el envio si falta algun campo obligatorio, sin llamar al servicio', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ items: [] }))
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BannerManagementPage />)
    await screen.findByText('Todavía no se ha publicado ningún banner.')

    await user.click(screen.getByRole('button', { name: 'Publicar banner' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Completa título, mensaje, inicio y fin de vigencia.',
    )
    expect(wasPostCalled(fetchImpl)).toBe(false)
  })

  it('rechaza cuando el inicio de vigencia es posterior al fin, sin llamar al servicio', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ items: [] }))
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BannerManagementPage />)
    await screen.findByText('Todavía no se ha publicado ningún banner.')

    await user.type(screen.getByLabelText(/título del banner/iu), 'Aviso')
    await user.type(screen.getByLabelText(/mensaje del banner/iu), 'Contenido')
    const [start, end] = screen.getAllByLabelText(/vigencia/u)
    await user.type(start!, '2026-09-10T10:00')
    await user.type(end!, '2026-09-06T10:00')

    await user.click(screen.getByRole('button', { name: 'Publicar banner' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El inicio de vigencia debe ser anterior o igual al fin de vigencia.',
    )
    expect(wasPostCalled(fetchImpl)).toBe(false)
  })

  it('envia exactamente title/content/publishAt/expiresAt como instantes ISO y confirma el exito', async () => {
    const fetchImpl = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/v1/admin/banners') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ id: 'b1' }, 201))
      }
      return Promise.resolve(jsonResponse({ items: [] }))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BannerManagementPage />)
    await screen.findByText('Todavía no se ha publicado ningún banner.')

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Publicar banner' }))

    expect(await screen.findByText('Banner publicado.')).toBeInTheDocument()

    const postCall = fetchImpl.mock.calls.find(([, init]) => init?.method === 'POST') as [
      string,
      RequestInit,
    ]
    const body = JSON.parse(postCall[1].body as string) as Record<string, string>

    expect(Object.keys(body).sort()).toEqual(['content', 'expiresAt', 'publishAt', 'title'])
    expect(body.title).toBe('Mantenimiento programado')
    expect(body.content).toBe('El catálogo estará en mantenimiento el sábado.')
    expect(new Date(body.publishAt!).toISOString()).toBe(body.publishAt)
    expect(new Date(body.expiresAt!).toISOString()).toBe(body.expiresAt)
  })

  it('muestra un error controlado si el servicio rechaza la creacion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes('/v1/admin/banners') && init?.method === 'POST') {
          return Promise.resolve(jsonResponse({ message: 'Conflicto de vigencia.' }, 409))
        }
        return Promise.resolve(jsonResponse({ items: [] }))
      }),
    )
    const user = userEvent.setup()

    renderWithProviders(<BannerManagementPage />)
    await screen.findByText('Todavía no se ha publicado ningún banner.')

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Publicar banner' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto de vigencia.')
  })

  it('lista los banners administrados usando isActive, sin calcular vigencia por fecha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            {
              id: 'b1',
              title: 'Vigente ahora',
              content: 'Contenido vigente',
              publishAt: '2026-09-01T00:00:00.000Z',
              expiresAt: '2026-09-30T00:00:00.000Z',
              status: 'ACTIVE',
              isActive: true,
              createdBy: 'admin-1',
              createdAt: '2026-09-01T00:00:00.000Z',
            },
            {
              id: 'b2',
              title: 'Fuera de vigencia',
              content: 'Contenido vencido',
              publishAt: '2000-01-01T00:00:00.000Z',
              expiresAt: '2000-01-31T00:00:00.000Z',
              status: 'EXPIRED',
              isActive: false,
              createdBy: 'admin-1',
              createdAt: '2000-01-01T00:00:00.000Z',
            },
          ],
        }),
      ),
    )

    renderWithProviders(<BannerManagementPage />)

    expect(await screen.findByText('Vigente ahora')).toBeInTheDocument()
    expect(screen.getByText('Vigente')).toBeInTheDocument()
    // "Fuera de vigencia" aparece dos veces: como titulo del segundo banner y
    // como etiqueta de su badge -son textos distintos que coinciden por azar-.
    expect(screen.getAllByText('Fuera de vigencia')).toHaveLength(2)
  })

  it('no ofrece editar ni eliminar: el backend no lo soporta todavia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            {
              id: 'b1',
              title: 'Aviso',
              content: 'Contenido',
              publishAt: '2026-09-01T00:00:00.000Z',
              expiresAt: '2026-09-30T00:00:00.000Z',
              status: 'ACTIVE',
              isActive: true,
              createdBy: 'admin-1',
              createdAt: '2026-09-01T00:00:00.000Z',
            },
          ],
        }),
      ),
    )

    renderWithProviders(<BannerManagementPage />)

    await screen.findByText('Aviso')
    expect(screen.queryByRole('button', { name: /editar/iu })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /eliminar/iu })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /despublicar/iu })).not.toBeInTheDocument()
  })

  it('el enlace "Volver" lleva a /ecommerce', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })))

    renderWithProviders(<BannerManagementPage />)
    await screen.findByText('Todavía no se ha publicado ningún banner.')

    expect(screen.getByRole('link', { name: '← Volver' })).toHaveAttribute('href', '/ecommerce')
  })
})
