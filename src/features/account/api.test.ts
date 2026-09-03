import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError, httpClient, type HttpDownload } from '@/lib/http'
import {
  downloadOwnPersonalData,
  fetchOwnAccount,
  fetchOwnPersonalData,
  saveOwnPersonalDataDownload,
  updateOwnAccount,
  validateDisplayName,
  type PrivacyExportFormat,
} from './api'

const ACCOUNT = {
  id: 'acc-1',
  email: 'ana@nexus.test',
  displayName: 'Ana Ramirez',
  firstNames: 'Ana',
  lastNames: 'Ramirez',
  status: 'ACTIVE',
  roles: ['PLAYER'],
}

const PERSONAL_DATA = {
  email: 'valeria.privacidad@nexus.test',
  displayName: 'Valeria Privacidad',
  firstNames: 'Valeria',
  lastNames: 'Rios',
  roles: ['PLAYER'],
  termsAccepted: true,
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchOwnAccount', () => {
  it('pide GET /api/accounts/me y devuelve la cuenta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, ACCOUNT))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await fetchOwnAccount()

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts/me',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual(ACCOUNT)
  })

  it('propaga un 401 como HttpError no autorizado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Falta el testimonio' })),
    )

    await expect(fetchOwnAccount()).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isUnauthorized,
    )
  })
})

describe('fetchOwnPersonalData', () => {
  it('delega en httpClient con la ruta relativa del contrato de privacidad', async () => {
    const signal = new AbortController().signal
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue(PERSONAL_DATA)

    const result = await fetchOwnPersonalData(signal)

    expect(get).toHaveBeenCalledWith('/accounts/me/privacy', signal)
    expect(get.mock.calls[0]?.[0]).not.toContain('/api/')
    expect(get.mock.calls[0]?.[0]).not.toMatch(/^https?:\/\//u)
    expect(get.mock.calls[0]?.[0]).not.toMatch(/accountId|subject/u)
    expect(result).toEqual(PERSONAL_DATA)
  })

  it('pide GET /api/accounts/me/privacy sin identificador de titular ni body', async () => {
    const signal = new AbortController().signal
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, PERSONAL_DATA))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await fetchOwnPersonalData(signal)

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/accounts/me/privacy')
    expect(url).not.toMatch(/^https?:\/\//u)
    expect(url).not.toMatch(/accountId|subject/u)
    expect(init.method).toBe('GET')
    expect(init.signal).toBe(signal)
    expect(init.body).toBeUndefined()
    expect(result).toEqual(PERSONAL_DATA)
  })
})

describe('exportacion de datos personales', () => {
  it.each(['json', 'xml', 'pdf'] as const)(
    'descarga %s mediante httpClient sin enviar identificadores ni body',
    async (format) => {
      const signal = new AbortController().signal
      const expected: HttpDownload = {
        content: new Blob([format]),
        filename: `datos.${format}`,
        mediaType: 'application/octet-stream',
      }
      const download = vi.spyOn(httpClient, 'download').mockResolvedValue(expected)

      const result = await downloadOwnPersonalData(format, signal)

      expect(download).toHaveBeenCalledWith(`/accounts/me/privacy/export?format=${format}`, signal)
      const path = download.mock.calls[0]?.[0] ?? ''
      expect(path).not.toMatch(/^https?:\/\//u)
      expect(path).not.toMatch(/accountId|ownerId|customerId|subject|userId/iu)
      expect(result).toBe(expected)
    },
  )

  it.each([
    ['json', 'nexus-battles-personal-data.json'],
    ['xml', 'nexus-battles-personal-data.xml'],
    ['pdf', 'nexus-battles-privacy-report.pdf'],
  ] as const)('usa el fallback de %s y revoca la Object URL', (format, fallback) => {
    const createObjectURL = vi.fn().mockReturnValue('blob:privacy-export')
    const revokeObjectURL = vi.fn()
    const clickedAnchors: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureAnchor(
      this: HTMLAnchorElement,
    ) {
      clickedAnchors.push(this)
    })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    saveOwnPersonalDataDownload(
      { content: new Blob([format]), filename: null, mediaType: 'application/octet-stream' },
      format satisfies PrivacyExportFormat,
    )

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickedAnchors[0]?.download).toBe(fallback)
    expect(clickedAnchors[0]?.href).toBe('blob:privacy-export')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:privacy-export')
    expect(document.body.contains(clickedAnchors[0] ?? null)).toBe(false)
  })

  it('prefiere el filename recibido en Content-Disposition', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:privacy-export')
    const clickedAnchors: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureAnchor(
      this: HTMLAnchorElement,
    ) {
      clickedAnchors.push(this)
    })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })

    saveOwnPersonalDataDownload(
      {
        content: new Blob(['{}']),
        filename: 'mi-exportacion.json',
        mediaType: 'application/json',
      },
      'json',
    )

    expect(clickedAnchors[0]?.download).toBe('mi-exportacion.json')
  })
})

describe('updateOwnAccount', () => {
  it.each(['CO', null])(
    'envía countryCode %s cuando el usuario lo modifica',
    async (countryCode) => {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ...ACCOUNT, countryCode }))
      vi.stubGlobal('fetch', fetchImpl)
      await updateOwnAccount({ displayName: ACCOUNT.displayName, countryCode })
      const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
      expect(JSON.parse(init.body as string)).toEqual({
        displayName: ACCOUNT.displayName,
        countryCode,
      })
    },
  )

  it('envia PATCH /api/accounts/me solo con displayName', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { ...ACCOUNT, displayName: 'Ana Nueva' }))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await updateOwnAccount({ displayName: 'Ana Nueva' })

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/accounts/me')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ displayName: 'Ana Nueva' })
    expect(result.displayName).toBe('Ana Nueva')
  })

  it('propaga el 409 de apodo en uso con el mensaje del servicio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(409, { message: 'El apodo ya esta en uso.' })),
    )

    await expect(updateOwnAccount({ displayName: 'Duplicado' })).rejects.toThrow(
      'El apodo ya esta en uso.',
    )
  })
})

describe('validateDisplayName', () => {
  it('acepta un apodo dentro del rango', () => {
    expect(validateDisplayName('Ana Ramirez')).toBeNull()
  })

  it('rechaza por longitud fuera de rango', () => {
    expect(validateDisplayName('ab')).toMatch(/entre 3 y 32/u)
    expect(validateDisplayName('x'.repeat(33))).toMatch(/entre 3 y 32/u)
  })

  it('rechaza simbolos y delimitadores en los extremos', () => {
    expect(validateDisplayName('_ana')).not.toBeNull()
    expect(validateDisplayName('ana!')).not.toBeNull()
  })
})
