import { httpClient, type HttpClient } from '@/lib/http'

/** Límites del contrato Catalog Product Assets v1 (ADR-016). */
const ACCEPTED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export interface ProductAssetUploadIntent {
  readonly assetId: string
  readonly upload: {
    readonly method: 'POST'
    readonly url: string
    readonly fields: Readonly<Record<string, string>>
    readonly expiresAt: string
  }
}

export interface FinalizedProductAsset {
  readonly assetId: string
  readonly purpose: 'PRIMARY_IMAGE'
  readonly status: 'READY'
  readonly contentType: string
  readonly contentLength: number
  readonly width: number
  readonly height: number
  readonly checksumSha256: string
  readonly imageUrl: string
}

export class ProductAssetUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProductAssetUploadError'
  }
}

export const validatePrimaryImage = (file: File): void => {
  if (!ACCEPTED_CONTENT_TYPES.has(file.type)) {
    throw new ProductAssetUploadError('Selecciona una imagen JPG, PNG o WEBP.')
  }

  if (file.size < 1 || file.size > MAX_FILE_SIZE_BYTES) {
    throw new ProductAssetUploadError('La imagen debe pesar entre 1 byte y 5 MiB.')
  }
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

/** Calcula el checksum que Catalog firma y verifica al finalizar el asset. */
export const sha256Base64 = async (file: File): Promise<string> => {
  const subtle = Reflect.get(globalThis.crypto, 'subtle') as SubtleCrypto | undefined

  if (subtle === undefined) {
    throw new ProductAssetUploadError('El navegador no puede comprobar la integridad del archivo.')
  }

  const digest = await subtle.digest('SHA-256', await file.arrayBuffer())

  return `b64:${toBase64(new Uint8Array(digest))}`
}

export interface ProductAssetUploaderDependencies {
  readonly client?: Pick<HttpClient, 'post'>
  readonly fetchImpl?: typeof fetch
  readonly checksum?: (file: File) => Promise<string>
}

/**
 * Crea el flujo de tres pasos del contrato v1. Los datos de la política firmada
 * son opacos: se copian al formulario y no se registran ni se reinterpretan.
 */
export const createProductPrimaryImageUploader = ({
  client = httpClient,
  fetchImpl,
  checksum = sha256Base64,
}: ProductAssetUploaderDependencies = {}) => {
  const postToStorage =
    fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init))

  return async (file: File): Promise<FinalizedProductAsset> => {
    validatePrimaryImage(file)

    const checksumSha256 = await checksum(file)
    const intent = await client.post<ProductAssetUploadIntent>('/v1/admin/product-assets/uploads', {
      purpose: 'PRIMARY_IMAGE',
      contentType: file.type,
      contentLength: file.size,
      checksumSha256,
    })

    const form = new FormData()
    Object.entries(intent.upload.fields).forEach(([name, value]) => {
      form.append(name, value)
    })
    form.append('file', file)

    const uploadResponse = await postToStorage(intent.upload.url, {
      method: intent.upload.method,
      body: form,
    })

    if (!uploadResponse.ok) {
      throw new ProductAssetUploadError(
        'No se pudo cargar la imagen. Selecciona el archivo e inténtalo de nuevo.',
      )
    }

    return client.post<FinalizedProductAsset>(
      `/v1/admin/product-assets/${intent.assetId}/finalization`,
    )
  }
}

export const uploadProductPrimaryImage = createProductPrimaryImageUploader()
