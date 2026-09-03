import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { useSession } from '@/shared/session'
import { ProductImage } from './ProductImage'

const createObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const revokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
const revoke = vi.fn()
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:product-test')
  revoke.mockClear()
  URL.revokeObjectURL = revoke
  useSession.setState({ subject: 'A', accessToken: 'secret-token', expiresAt: Date.now() + 60000 })
})
afterEach(() => {
  if (createObjectURL === undefined) Reflect.deleteProperty(URL, 'createObjectURL')
  else Object.defineProperty(URL, 'createObjectURL', createObjectURL)
  if (revokeObjectURL === undefined) Reflect.deleteProperty(URL, 'revokeObjectURL')
  else Object.defineProperty(URL, 'revokeObjectURL', revokeObjectURL)
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.unstubAllGlobals()
})
describe('Imagen de producto autenticada', () => {
  it('descarga la API con Bearer y presenta un Blob sin token en la URL; libera el recurso', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }),
      )
    vi.stubGlobal('fetch', fetcher)
    const { unmount } = render(
      <ProductImage source="/api/v1/admin/product-assets/asset/content" name="Espada" />,
    )
    expect(await screen.findByRole('img', { name: 'Espada' })).toHaveAttribute(
      'src',
      'blob:product-test',
    )
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/admin/product-assets/asset/content',
      expect.objectContaining({ headers: { authorization: 'Bearer secret-token' } }),
    )
    expect(screen.getByRole('img', { name: 'Espada' }).getAttribute('src')).not.toContain(
      'secret-token',
    )
    unmount()
    expect(revoke).toHaveBeenCalledWith('blob:product-test')
  })
  it('una imagen externa no recibe el token ni pasa por el cliente autenticado', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    render(<ProductImage source="https://cdn.example.test/item.png" name="Ítem" />)
    expect(screen.getByRole('img', { name: 'Ítem' })).toHaveAttribute(
      'src',
      'https://cdn.example.test/item.png',
    )
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('una URL no admitida conserva una alternativa accesible', () => {
    render(<ProductImage source="javascript:alert(1)" name="Ítem" />)
    expect(screen.getByRole('img', { name: 'Imagen no disponible de Ítem' })).toBeInTheDocument()
  })
})
