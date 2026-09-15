import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { BasicsStep } from './BasicsStep'
import { emptyDraft } from '../draft'

const createObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const revokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:admin-preview')
  URL.revokeObjectURL = vi.fn()
  useSession.setState({
    subject: 'admin',
    accessToken: 'test-admin-token',
    expiresAt: Date.now() + 60000,
  })
})
afterEach(() => {
  if (createObjectURL === undefined) Reflect.deleteProperty(URL, 'createObjectURL')
  else Object.defineProperty(URL, 'createObjectURL', createObjectURL)
  if (revokeObjectURL === undefined) Reflect.deleteProperty(URL, 'revokeObjectURL')
  else Object.defineProperty(URL, 'revokeObjectURL', revokeObjectURL)
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.unstubAllGlobals()
})
describe('Vista previa de imagen finalizada', () => {
  it('descarga el recurso protegido con la sesión y muestra el blob, no una petición img anónima', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/png' } }),
      )
    vi.stubGlobal('fetch', fetcher)
    const { container } = renderWithProviders(
      <BasicsStep
        draft={{
          ...emptyDraft(),
          name: 'Espada',
          imageUrl: '/api/v1/catalog/product-assets/asset/content',
        }}
        onChange={vi.fn()}
        errors={{}}
        onUploadPrimaryImage={vi.fn()}
      />,
    )
    await vi.waitFor(() => {
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:admin-preview')
    })
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/catalog/product-assets/asset/content',
      expect.objectContaining({ headers: { authorization: 'Bearer test-admin-token' } }),
    )
    fireEvent.error(container.querySelector('img')!)
    expect(screen.getByTitle('Imagen no disponible de Espada')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })
})
