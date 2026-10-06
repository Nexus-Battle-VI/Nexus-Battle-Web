import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { TeamAvatar, type AvatarDownload } from './TeamAvatar'

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})
describe('avatar existente con autorización y ausencia explícita', () => {
  it('descarga por sujeto codificado con JWT del httpClient y libera Object URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:test-account-avatar')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(new Response('test-image', { headers: { 'content-type': 'image/png' } })),
    )
    vi.stubGlobal('fetch', fetch)
    useSession.setState({
      subject: 'A',
      accessToken: 'avatar-token',
      expiresAt: Date.now() + 60000,
    })
    const { unmount } = renderWithProviders(<TeamAvatar subject="A" avatarSubject="B/subject" />)
    expect(
      await screen.findByRole('img', { name: 'Avatar de cuenta elegido para el equipo' }),
    ).toHaveAttribute('src', 'blob:test-account-avatar')
    expect(fetch).toHaveBeenCalledWith('/api/accounts/by-subject/B%2Fsubject/avatar', {
      method: 'GET',
      headers: { authorization: 'Bearer avatar-token' },
    })
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-account-avatar')
  })
  it('el error no inventa una imagen: informa y permite reintentar', async () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:account'), revokeObjectURL: vi.fn() })
    const download = vi
      .fn<AvatarDownload>()
      .mockRejectedValueOnce(new Error('No disponible'))
      .mockResolvedValueOnce({
        content: new Blob(['test-image']),
        mediaType: 'image/png',
        filename: null,
      })
    renderWithProviders(<TeamAvatar subject="A" avatarSubject="B" download={download} />)
    expect(await screen.findByText('Avatar no disponible.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar avatar' }))
    expect(await screen.findByRole('img')).toBeInTheDocument()
    expect(download).toHaveBeenCalledTimes(2)
  })
  it('no conserva imagen anterior al cambiar el sujeto y rechaza contenido no imagen', async () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:account'), revokeObjectURL: vi.fn() })
    const download = vi
      .fn<AvatarDownload>()
      .mockResolvedValueOnce({
        content: new Blob(['test-image']),
        mediaType: 'image/png',
        filename: null,
      })
      .mockResolvedValueOnce({
        content: new Blob(['unexpected']),
        mediaType: 'text/html',
        filename: null,
      })
    const { rerender } = renderWithProviders(
      <TeamAvatar subject="A" avatarSubject="B" download={download} />,
    )
    await screen.findByRole('img')
    rerender(<TeamAvatar subject="A" avatarSubject="C" download={download} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(await screen.findByText('Avatar no disponible.')).toBeInTheDocument()
  })
  it('una respuesta tardía del avatar anterior no aparece en otro equipo', async () => {
    const createObjectURL = vi.fn(() => 'blob:account')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
    let resolve: (value: Awaited<ReturnType<AvatarDownload>>) => void = () => undefined
    const download = vi
      .fn<AvatarDownload>()
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done
          }),
      )
      .mockRejectedValueOnce(new Error('Nuevo avatar no disponible'))
    const { rerender } = renderWithProviders(
      <TeamAvatar subject="A" avatarSubject="B" download={download} />,
    )
    rerender(<TeamAvatar subject="A" avatarSubject="C" download={download} />)
    await screen.findByText('Avatar no disponible.')
    await act(async () => {
      resolve({ content: new Blob(['old-image']), mediaType: 'image/png', filename: null })
      await Promise.resolve()
    })
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
