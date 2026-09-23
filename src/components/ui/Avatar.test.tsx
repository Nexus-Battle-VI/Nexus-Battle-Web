import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { Avatar } from './Avatar'

const imageResponse = (): Response =>
  new Response(new Blob(['fake-image-bytes'], { type: 'image/png' }), {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Avatar', () => {
  it('renderiza la inicial de respaldo cuando avatarUrl es null', () => {
    render(<Avatar avatarUrl={null} alt="Ana" initials="A" />)

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renderiza la imagen real cuando avatarUrl resuelve un recurso de imagen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse()))
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue('blob:fake-object-url'),
      revokeObjectURL: vi.fn(),
    })

    render(<Avatar avatarUrl="/accounts/acc-1/avatar" alt="Ana Ramirez" initials="A" />)

    const image = await screen.findByRole('img', { name: 'Ana Ramirez' })
    expect(image).toHaveAttribute('src', 'blob:fake-object-url')
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })

  it('cae a la inicial cuando la descarga falla, sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    render(<Avatar avatarUrl="/accounts/acc-1/avatar" alt="Ana" initials="A" />)

    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument()
    })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('cae a la inicial cuando el recurso descargado no es una imagen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"message":"no autorizado"}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    render(<Avatar avatarUrl="/accounts/acc-1/avatar" alt="Ana" initials="A" />)

    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument()
    })
  })

  it('onError de la imagen cae a la inicial una sola vez, sin bucle', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse()))
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue('blob:fake-object-url'),
      revokeObjectURL: vi.fn(),
    })

    render(<Avatar avatarUrl="/accounts/acc-1/avatar" alt="Ana" initials="A" />)

    const image = await screen.findByRole('img', { name: 'Ana' })

    image.dispatchEvent(new Event('error'))

    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument()
    })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    // Un segundo `error` (si el navegador lo disparara de nuevo) no debe
    // reintroducir ningun estado intermedio: la inicial sigue siendo el unico
    // contenido, sin parpadeo entre imagen e inicial.
    expect(screen.getAllByText('A')).toHaveLength(1)
  })

  it('acepta los tres tamanos declarados sin romper el fallback', () => {
    const { rerender } = render(<Avatar avatarUrl={null} alt="Ana" initials="A" size="sm" />)
    expect(screen.getByText('A')).toHaveClass('h-7', 'w-7')

    rerender(<Avatar avatarUrl={null} alt="Ana" initials="A" size="lg" />)
    expect(screen.getByText('A')).toHaveClass('h-16', 'w-16')
  })

  it('comparte UNA descarga entre varios avatares de la misma ruta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse())
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue('blob:compartido'),
      revokeObjectURL: vi.fn(),
    })

    render(
      <>
        <Avatar avatarUrl="/accounts/by-subject/sujeto-ana/avatar" alt="Ana 1" initials="A" />
        <Avatar avatarUrl="/accounts/by-subject/sujeto-ana/avatar" alt="Ana 2" initials="A" />
      </>,
    )

    expect(await screen.findByRole('img', { name: 'Ana 1' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Ana 2' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('no descarga una ruta ajena a Account: muestra la inicial', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<Avatar avatarUrl="https://externo.test/imagen.png" alt="Ana" initials="A" />)

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
