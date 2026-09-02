import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { SavedCartPanel } from './SavedCartPanel'
import {
  discardSavedCart,
  fetchSavedCart,
  restoreSavedCart,
  saveCart,
  SavedCartUnavailableError,
  type SavedCart,
} from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

const SAVED: SavedCart = {
  currency: 'COP',
  total: 32_000,
  itemCount: 3,
  items: [
    { sku: 'espada-de-hierro', unitPrice: 15_000, quantity: 2, subtotal: 30_000 },
    { sku: 'pocion-de-vida', unitPrice: 2_000, quantity: 1, subtotal: 2_000 },
  ],
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

/** `204 No Content` no admite cuerpo: el constructor de `Response` lo prohibe. */
const noContent = (): Response => new Response(null, { status: 204 })

const stubFetch = (response: Response) => {
  const fetchImpl = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchImpl)

  return fetchImpl
}

const renderPanel = (overrides: Partial<Parameters<typeof SavedCartPanel>[0]> = {}) =>
  renderWithProviders(
    <SavedCartPanel
      saved={null}
      unavailable={false}
      canSave
      onSave={vi.fn()}
      onRestore={vi.fn()}
      onDiscard={vi.fn()}
      {...overrides}
    />,
  )

describe('api del carrito guardado', () => {
  it('devuelve null cuando no hay nada guardado', async () => {
    stubFetch(jsonResponse({ message: 'Sin carrito guardado.' }, 404))

    expect(await fetchSavedCart()).toBeNull()
  })

  it('devuelve el carrito guardado cuando existe', async () => {
    stubFetch(jsonResponse(SAVED))

    expect(await fetchSavedCart()).toEqual(SAVED)
  })

  /**
   * CA-02: sin identidad verificada el servicio responde 401. Se traduce a un
   * error propio para poder explicarlo en vez de mostrarlo como fallo.
   */
  it.each([
    ['consultar', fetchSavedCart],
    ['guardar', saveCart],
    ['recuperar', restoreSavedCart],
    ['descartar', discardSavedCart],
  ])('traduce el 401 al %s en un error propio', async (_accion, call) => {
    stubFetch(jsonResponse({ message: 'No autorizado.' }, 401))

    await expect(call()).rejects.toBeInstanceOf(SavedCartUnavailableError)
  })

  it('guarda con POST sobre la ruta de persistencia', async () => {
    const fetchImpl = stubFetch(jsonResponse(SAVED))

    await saveCart()

    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(String(url)).toContain('/orders/cart/persistence')
    expect((init as RequestInit).method).toBe('POST')
  })

  it('recupera con POST sobre la ruta de recuperacion', async () => {
    const fetchImpl = stubFetch(
      jsonResponse({ id: 'ord-1', currency: 'COP', total: 0, itemCount: 0 }),
    )

    await restoreSavedCart()

    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('/orders/cart/persistence/restoration')
  })

  it('descarta con DELETE', async () => {
    const fetchImpl = stubFetch(noContent())

    await discardSavedCart()

    expect((fetchImpl.mock.calls[0]?.[1] as RequestInit).method).toBe('DELETE')
  })

  /** Un fallo real del servicio si se propaga tal cual. */
  it('propaga un error que no sea 401 ni 404', async () => {
    stubFetch(jsonResponse({ message: 'El servicio fallo.' }, 500))

    await expect(fetchSavedCart()).rejects.not.toBeInstanceOf(SavedCartUnavailableError)
  })
})

describe('Sin sesion verificada (CA-02)', () => {
  /**
   * No es un error: es una condicion de la funcionalidad. Mostrarlo como
   * fallo haria pensar que la pantalla esta rota.
   */
  it('explica que hace falta iniciar sesion, sin presentarlo como error', () => {
    renderPanel({ unavailable: true })

    expect(screen.getByText(/necesitas haber iniciado sesion/u)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('no ofrece ninguna accion', () => {
    renderPanel({ unavailable: true, saved: SAVED })

    expect(screen.queryByRole('button', { name: 'Guardar carrito' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Recuperar carrito' })).not.toBeInTheDocument()
  })
})

describe('Guardar el carrito (CA-01)', () => {
  it('guarda el contenido vigente', async () => {
    const onSave = vi.fn()
    renderPanel({ onSave })

    await userEvent.click(screen.getByRole('button', { name: 'Guardar carrito' }))

    expect(onSave).toHaveBeenCalledOnce()
  })

  it('no deja guardar un carrito sin contenido', () => {
    renderPanel({ canSave: false })

    expect(screen.getByRole('button', { name: 'Guardar carrito' })).toBeDisabled()
    expect(screen.getByText('Anade productos al carrito para poder guardarlo.')).toBeInTheDocument()
  })

  it('explica para que sirve guardar cuando todavia no hay nada guardado', () => {
    renderPanel()

    expect(screen.getByText(/podras recuperarlo la proxima vez/u)).toBeInTheDocument()
  })
})

describe('Carrito guardado existente', () => {
  it('muestra el recuento, el total y el detalle', () => {
    renderPanel({ saved: SAVED })

    expect(screen.getByTestId('guardado-item-count')).toHaveTextContent('3')
    expect(screen.getByTestId('guardado-total')).toHaveTextContent('320,00')
    expect(screen.getByTestId('guardado-subtotal-espada-de-hierro')).toHaveTextContent('300,00')
  })

  /** El precio guardado es el de entonces, no el vigente: lo da el servicio. */
  it('no recalcula los importes guardados', () => {
    renderPanel({ saved: { ...SAVED, total: 99_900 } })

    expect(screen.getByTestId('guardado-total')).toHaveTextContent('999,00')
  })

  /** Recuperar reemplaza: se avisa ANTES de pulsar, no despues. */
  it('avisa de que recuperar reemplaza el carrito vigente', () => {
    renderPanel({ saved: SAVED })

    expect(screen.getByText(/reemplaza lo que tengas ahora en el carrito/u)).toBeInTheDocument()
  })

  it('recupera el carrito guardado', async () => {
    const onRestore = vi.fn()
    renderPanel({ saved: SAVED, onRestore })

    await userEvent.click(screen.getByRole('button', { name: 'Recuperar carrito' }))

    expect(onRestore).toHaveBeenCalledOnce()
  })

  it('descarta el carrito guardado', async () => {
    const onDiscard = vi.fn()
    renderPanel({ saved: SAVED, onDiscard })

    await userEvent.click(screen.getByRole('button', { name: 'Descartar guardado' }))

    expect(onDiscard).toHaveBeenCalledOnce()
  })

  it('bloquea las acciones mientras hay una en curso', () => {
    renderPanel({ saved: SAVED, isBusy: true })

    expect(screen.getByRole('button', { name: 'Recuperar carrito' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descartar guardado' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardar carrito' })).toBeDisabled()
  })

  it('muestra un fallo del servicio como error', () => {
    renderPanel({ saved: SAVED, error: new Error('El servicio no respondio.') })

    expect(screen.getByRole('alert')).toHaveTextContent('El servicio no respondio.')
  })
})
