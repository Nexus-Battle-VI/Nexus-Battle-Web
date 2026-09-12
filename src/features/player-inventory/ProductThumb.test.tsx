import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { useSession } from '@/shared/session'
import { ProductThumb } from './ProductThumb'

/**
 * Regresion: el endpoint de contenido de Catalog exige testimonio Bearer
 * (AUTH_MODE=jwt). Un `<img src>` plano no puede llevarlo -el navegador no
 * adjunta cabeceras a una carga de imagen-, asi que antes de este fix toda
 * imagen real de Catalog en el inventario fallaba con 401 en silencio y solo
 * se veia el marcador neutro. Mismo patron de prueba que
 * `features/commerce/ProductImage.test.tsx`, que cubre el mismo problema
 * para la Vitrina.
 */
const createObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const revokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
const revoke = vi.fn()

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:inventory-thumb-test')
  revoke.mockClear()
  URL.revokeObjectURL = revoke
  useSession.setState({ subject: 'A', accessToken: 'secret-token', expiresAt: Date.now() + 60_000 })
})

afterEach(() => {
  if (createObjectURL === undefined) Reflect.deleteProperty(URL, 'createObjectURL')
  else Object.defineProperty(URL, 'createObjectURL', createObjectURL)
  if (revokeObjectURL === undefined) Reflect.deleteProperty(URL, 'revokeObjectURL')
  else Object.defineProperty(URL, 'revokeObjectURL', revokeObjectURL)
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.unstubAllGlobals()
})

describe('ProductThumb', () => {
  it('descarga la API con Bearer y presenta un Blob, no la URL cruda del producto', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }),
      )
    vi.stubGlobal('fetch', fetcher)

    const { container, unmount } = render(
      <ProductThumb src="/api/v1/catalog/product-assets/asset-1/content" alt="Espada Relámpago" />,
    )

    // Se busca la etiqueta <img> en concreto, no por rol: el marcador neutro
    // TAMBIEN expone role="img" con el mismo nombre accesible mientras la
    // descarga esta en curso, y `findByRole` devolveria ese en vez de esperar
    // a la imagen real.
    await vi.waitFor(() => {
      expect(container.querySelector('img')).not.toBeNull()
    })
    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:inventory-thumb-test')
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/catalog/product-assets/asset-1/content',
      expect.objectContaining({ headers: { authorization: 'Bearer secret-token' } }),
    )

    unmount()
    expect(revoke).toHaveBeenCalledWith('blob:inventory-thumb-test')
  })

  it('una imagen externa no recibe el token ni pasa por el cliente autenticado', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)

    render(<ProductThumb src="https://cdn.example.test/item.png" alt="Ítem externo" />)

    expect(screen.getByRole('img', { name: 'Ítem externo' })).toHaveAttribute(
      'src',
      'https://cdn.example.test/item.png',
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('sin src, muestra el marcador neutro sin pedir nada a la red', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)

    render(<ProductThumb src={null} alt="Sin imagen" />)

    expect(screen.getByRole('img', { name: 'Sin imagen' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Sin imagen', hidden: false })).not.toHaveAttribute(
      'src',
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('si la descarga autenticada falla, conserva el marcador neutro en vez de un <img> roto', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetcher)

    const { container } = render(
      <ProductThumb src="/api/v1/catalog/product-assets/asset-1/content" alt="Espada" />,
    )

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole('img', { name: 'Espada' })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
