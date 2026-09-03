import { describe, expect, it, vi } from 'vitest'

import {
  createProductPrimaryImageUploader,
  ProductAssetUploadError,
  validatePrimaryImage,
} from './product-assets'

const asset = {
  assetId: 'f293ce6b-98e9-41da-99ef-0ad4e3a95120',
  purpose: 'PRIMARY_IMAGE' as const,
  status: 'READY' as const,
  contentType: 'image/webp',
  contentLength: 4,
  width: 1024,
  height: 1024,
  checksumSha256: 'b64:checksum',
  imageUrl:
    'https://api.example.test/api/v1/catalog/product-assets/f293ce6b-98e9-41da-99ef-0ad4e3a95120/content',
}

const image = (): File => new File(['webp'], 'espada.webp', { type: 'image/webp' })

describe('carga de imagen principal de Producto', () => {
  it('copia los campos firmados sin interpretarlos, sube el archivo y finaliza el asset', async () => {
    const client = {
      post: vi
        .fn()
        .mockResolvedValueOnce({
          assetId: asset.assetId,
          upload: {
            method: 'POST' as const,
            url: 'https://bucket.example.test',
            fields: {
              key: 'staging/opaque',
              policy: 'opaque-policy',
              'Content-Type': 'image/webp',
            },
            expiresAt: '2026-09-03T00:10:00.000Z',
          },
        })
        .mockResolvedValueOnce(asset),
    }
    const uploadToStorage = vi.fn().mockResolvedValue({ ok: true })
    const upload = createProductPrimaryImageUploader({
      client,
      fetchImpl: uploadToStorage as unknown as typeof fetch,
      checksum: () => Promise.resolve('b64:checksum'),
    })

    await expect(upload(image())).resolves.toEqual(asset)

    expect(client.post).toHaveBeenNthCalledWith(1, '/v1/admin/product-assets/uploads', {
      purpose: 'PRIMARY_IMAGE',
      contentType: 'image/webp',
      contentLength: 4,
      checksumSha256: 'b64:checksum',
    })
    expect(uploadToStorage).toHaveBeenCalledWith(
      'https://bucket.example.test',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )

    const form = (uploadToStorage.mock.calls[0]?.[1] as RequestInit).body as FormData
    expect(form.get('key')).toBe('staging/opaque')
    expect(form.get('policy')).toBe('opaque-policy')
    expect(form.get('Content-Type')).toBe('image/webp')
    expect(form.get('file')).toBeInstanceOf(File)
    expect(client.post).toHaveBeenNthCalledWith(
      2,
      `/v1/admin/product-assets/${asset.assetId}/finalization`,
    )
  })

  it('no solicita una intención para un tipo no admitido', async () => {
    const client = { post: vi.fn() }
    const upload = createProductPrimaryImageUploader({
      client,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    })

    await expect(
      upload(new File(['svg'], 'espada.svg', { type: 'image/svg+xml' })),
    ).rejects.toBeInstanceOf(ProductAssetUploadError)
    expect(client.post).not.toHaveBeenCalled()
  })

  it('rechaza localmente archivos superiores a 5 MiB', () => {
    expect(() => {
      validatePrimaryImage(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'x.png', { type: 'image/png' }),
      )
    }).toThrow(/5 MiB/i)
  })
})
