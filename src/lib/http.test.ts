import { describe, expect, it, vi } from 'vitest'

import { HttpClient, HttpError } from './http'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

describe('HttpClient', () => {
  it('invoca fetch del entorno como metodo del Window, no suelto', async () => {
    const bound = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    const windowFetch = function windowFetch(
      this: unknown,
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation")
      }

      return bound(input, init) as Promise<Response>
    }

    vi.stubGlobal('fetch', windowFetch)

    try {
      await new HttpClient().get('/products')
    } finally {
      vi.unstubAllGlobals()
    }

    expect(bound).toHaveBeenCalledWith('/api/products', expect.objectContaining({ method: 'GET' }))
  })

  it('construye la URL bajo el prefijo del proxy inverso', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    await client.get('/products')

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/products',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('respeta una URL base explicita', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    const client = new HttpClient({
      baseUrl: 'https://demo.local/api',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await client.get('/products')

    expect(fetchImpl).toHaveBeenCalledWith('https://demo.local/api/products', expect.anything())
  })

  it('envia FormData sin forzar application/json', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { id: 'acc-1' }))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })
    const form = new FormData()
    form.set('email', 'ana@nexus.test')

    await client.post('/accounts', form)

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(init.body).toBe(form)
    expect(init.headers).toBeUndefined()
  })

  it('envia el cuerpo como JSON con la cabecera correspondiente', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { id: 'ord-1' }))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    await client.post('/orders', { customerId: 'acc-1' })

    expect(fetchImpl).toHaveBeenCalledWith('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerId: 'acc-1' }),
    })
  })

  it('no envia cabecera de contenido cuando no hay cuerpo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    await client.delete('/orders/ord-1/lines/espada')

    // La propiedad no se declara en absoluto, en lugar de declararse como
    // `undefined`: `exactOptionalPropertyTypes` prohibe lo segundo.
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit

    expect(init.method).toBe('DELETE')
    expect('headers' in init).toBe(false)
    expect('body' in init).toBe(false)
  })

  it('devuelve null ante una respuesta sin cuerpo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    expect(await client.get('/health')).toBeNull()
  })

  it('devuelve el texto crudo cuando la respuesta no es JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    expect(await client.get('/health')).toBe('ok')
  })

  it('lanza HttpError con el mensaje del servicio', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(409, { message: 'El correo ya esta registrado.' }))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    await expect(client.post('/accounts', {})).rejects.toMatchObject({
      name: 'HttpError',
      status: 409,
      message: 'El correo ya esta registrado.',
    })
  })

  it('une los mensajes cuando el servicio devuelve una lista de errores', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { message: ['correo invalido', 'nombre corto'] }))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    await expect(client.post('/accounts', {})).rejects.toThrow('correo invalido, nombre corto')
  })

  it('usa un mensaje por defecto cuando la respuesta de error no lo trae', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    await expect(client.get('/products')).rejects.toThrow(
      'La peticion a /products fallo con estado 500.',
    )
  })

  it('clasifica los errores de cliente y el no encontrado', () => {
    expect(new HttpError(404, 'no existe', null).isNotFound).toBe(true)
    expect(new HttpError(404, 'no existe', null).isClientError).toBe(true)
    expect(new HttpError(422, 'no procesable', null).isClientError).toBe(true)
    expect(new HttpError(500, 'fallo', null).isClientError).toBe(false)
    expect(new HttpError(500, 'fallo', null).isNotFound).toBe(false)
  })

  it('propaga la senal de cancelacion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })
    const controller = new AbortController()

    await client.get('/products', controller.signal)

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal })
    expect('signal' in ((fetchImpl.mock.calls[0]?.[1] ?? {}) as RequestInit)).toBe(true)
  })
})

describe('Testimonio de identidad en las peticiones', () => {
  const headersOf = (call: unknown): Record<string, string> =>
    ((call as [string, RequestInit])[1].headers ?? {}) as Record<string, string>

  it('adjunta el testimonio cuando hay sesion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    const client = new HttpClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      tokenProvider: () => 'token-de-acceso',
    })

    await client.get('/products')

    expect(headersOf(fetchImpl.mock.calls[0]).authorization).toBe('Bearer token-de-acceso')
  })

  it('no adjunta cabecera alguna cuando no hay sesion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    await client.get('/products')

    expect((fetchImpl.mock.calls[0] as [string, RequestInit])[1].headers).toBeUndefined()
  })

  /**
   * El testimonio se resuelve en CADA peticion, no al construir el cliente. El
   * cliente es un singleton que existe antes de que haya sesion: capturarlo al
   * arrancar significaria enviar siempre `null`.
   */
  it('resuelve el testimonio en cada peticion, no al construir el cliente', async () => {
    // Cada llamada devuelve una Response NUEVA: el cuerpo de una respuesta solo
    // se puede leer una vez, y reutilizar el objeto haria fallar la segunda.
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(200, {})))
    let token: string | null = null
    const client = new HttpClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      tokenProvider: () => token,
    })

    await client.get('/products')
    token = 'token-posterior'
    await client.get('/products')

    expect(headersOf(fetchImpl.mock.calls[0]).authorization).toBeUndefined()
    expect(headersOf(fetchImpl.mock.calls[1]).authorization).toBe('Bearer token-posterior')
  })

  it('conserva el tipo de contenido junto al testimonio en un envio con cuerpo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    const client = new HttpClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      tokenProvider: () => 'token',
    })

    await client.post('/orders', { currency: 'COP' })

    expect(headersOf(fetchImpl.mock.calls[0])).toEqual({
      'content-type': 'application/json',
      authorization: 'Bearer token',
    })
  })

  it.each([
    [401, 'isUnauthorized'],
    [403, 'isForbidden'],
  ])('clasifica el estado %s', async (status, flag) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(status, { message: 'no' }))
    const client = new HttpClient({ fetchImpl: fetchImpl as unknown as typeof fetch })

    await expect(client.get('/products')).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error[flag as 'isUnauthorized'],
    )
  })
})
