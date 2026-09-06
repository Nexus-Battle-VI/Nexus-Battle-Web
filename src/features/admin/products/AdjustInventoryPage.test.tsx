import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'

import { AdjustInventoryPage } from './AdjustInventoryPage'
import * as api from './api'

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const producto = (patch: Partial<api.AdministeredProduct> = {}): api.AdministeredProduct => ({
  productId: ID,
  name: 'Escudo del Guardián',
  type: 'ARMADURA',
  printRun: 200,
  printRunMode: 'LIMITED',
  availableUnits: 0,
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 500,
  premium: false,
  ...patch,
})

const montar = (): void => {
  renderWithProviders(
    <Routes>
      <Route path="/admin/products/:productId/inventory" element={<AdjustInventoryPage />} />
    </Routes>,
    { route: `/admin/products/${ID}/inventory` },
  )
}

describe('Ajuste de tiraje (HU-34)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * El caso del enunciado: 200 entregadas, agotado, se amplía a 350.
   *
   * El control es doble: se envía SOLO el tiraje -no la disponibilidad- y la
   * insignia pasa de «Agotado» a mostrar las 150 unidades que devuelve el
   * servicio. Comprobar solo la llamada dejaría pasar una pantalla que pide el
   * cambio y no enseña el resultado.
   */
  it('amplía el tiraje y la insignia deja de decir Agotado', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(producto())
    const ajustar = vi
      .spyOn(api, 'adjustProductInventory')
      .mockResolvedValue(producto({ printRun: 350, availableUnits: 150 }))

    montar()

    expect(await screen.findByText('Agotado')).toBeInTheDocument()

    const cantidad = screen.getByLabelText(/cantidad de unidades/i)
    await userEvent.clear(cantidad)
    await userEvent.type(cantidad, '350')
    await userEvent.click(screen.getByRole('button', { name: /ajustar tiraje/i }))

    expect(await screen.findByText(/Disponible · 150 unidades/i)).toBeInTheDocument()
    expect(ajustar).toHaveBeenCalledWith(ID, 350)
    expect(screen.queryByText('Agotado')).not.toBeInTheDocument()
  })

  /**
   * CA-01: agotado NO es suspendido. La pantalla debe decirlo, porque la
   * confusión entre las dos condiciones es justo lo que lleva a «reactivar» un
   * producto que nunca se suspendió.
   */
  it('deja claro que un producto agotado sigue activo', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(producto())

    montar()

    expect(await screen.findByText('Agotado')).toBeInTheDocument()
    expect(screen.getByText(/Estado del producto: activo/i)).toBeInTheDocument()
    expect(screen.getByText(/condiciones independientes/i)).toBeInTheDocument()
  })

  it('muestra las unidades entregadas, que son las que marcan el mínimo', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(
      producto({ printRun: 10, availableUnits: 4 }),
    )

    montar()

    // 10 - 4 = 6. Se deriva igual que en el servicio; no viaja por la red.
    expect(await screen.findByText('6')).toBeInTheDocument()
  })

  /** CA-02: no se puede reducir por debajo de lo entregado. */
  it('no gasta la petición si la cantidad es inferior a lo entregado', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(
      producto({ printRun: 10, availableUnits: 4 }),
    )
    const ajustar = vi.spyOn(api, 'adjustProductInventory')

    montar()

    const cantidad = await screen.findByLabelText(/cantidad de unidades/i)
    await userEvent.clear(cantidad)
    await userEvent.type(cantidad, '3')
    await userEvent.click(screen.getByRole('button', { name: /ajustar tiraje/i }))

    expect(await screen.findByText(/inferior a las 6 unidades ya entregadas/i)).toBeInTheDocument()
    expect(ajustar).not.toHaveBeenCalled()
  })

  /** CA-03: infinito no lleva contador, y la pantalla no lo inventa. */
  it('un producto de tiraje infinito no muestra contador', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(
      producto({ printRun: -1, printRunMode: 'INFINITE', availableUnits: null }),
    )

    montar()

    expect(await screen.findByText('Disponible (infinito)')).toBeInTheDocument()
    expect(screen.getByText('No se cuentan')).toBeInTheDocument()
    expect(screen.queryByText('Agotado')).not.toBeInTheDocument()
  })

  it('elegir infinito envía -1 sin pedir cantidad', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(producto())
    const ajustar = vi
      .spyOn(api, 'adjustProductInventory')
      .mockResolvedValue(producto({ printRun: -1, printRunMode: 'INFINITE', availableUnits: null }))

    montar()

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: /disponibilidad/i }),
      'INFINITE',
    )

    expect(screen.queryByLabelText(/cantidad de unidades/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /ajustar tiraje/i }))

    expect(ajustar).toHaveBeenCalledWith(ID, -1)
  })

  /**
   * El 409 del servicio significa que otro ajuste llegó antes. El mensaje debe
   * decir qué hacer -recargar y repetir-, no solo que algo falló.
   */
  it('explica el conflicto de concurrencia', async () => {
    const { HttpError } = await import('@/lib/http')

    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(producto())
    vi.spyOn(api, 'adjustProductInventory').mockRejectedValue(
      new HttpError(409, 'Conflict', { message: 'Conflict' }),
    )

    montar()

    const cantidad = await screen.findByLabelText(/cantidad de unidades/i)
    await userEvent.clear(cantidad)
    await userEvent.type(cantidad, '350')
    await userEvent.click(screen.getByRole('button', { name: /ajustar tiraje/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Vuelve a cargarlo/i)
  })
})

/**
 * Suspension y reactivacion (HU-35, Management#43). Comparten pantalla y
 * fixture con el ajuste de tiraje (HU-34); estas pruebas cubren unicamente el
 * comportamiento nuevo.
 */
describe('Suspension y reactivacion de producto (HU-35)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const REASON = 'Rebalanceo pendiente de estadísticas'

  it('un producto ACTIVE muestra la accion Suspender', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(
      producto({ lifecycleStatus: 'ACTIVE' }),
    )

    montar()

    expect(await screen.findByRole('button', { name: 'Suspender producto' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reactivar producto' })).not.toBeInTheDocument()
  })

  it('un producto SUSPENDED muestra la accion Reactivar', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(
      producto({ lifecycleStatus: 'SUSPENDED' }),
    )

    montar()

    expect(await screen.findByRole('button', { name: 'Reactivar producto' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspender producto' })).not.toBeInTheDocument()
  })

  it('abre la confirmacion sin ejecutar la operacion todavia', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(producto())
    const cambiar = vi.spyOn(api, 'updateProductLifecycleStatus')

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspender producto' }))

    expect(screen.getByRole('form', { name: 'Suspender producto' })).toBeInTheDocument()
    expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument()
    expect(cambiar).not.toHaveBeenCalled()
  })

  it('no permite confirmar con el motivo vacío', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(producto())
    const cambiar = vi.spyOn(api, 'updateProductLifecycleStatus')

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspender producto' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar suspensión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/obligatorio, mínimo 10 caracteres/i)
    expect(cambiar).not.toHaveBeenCalled()
  })

  it('no permite confirmar con un motivo de menos de 10 caracteres', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(producto())
    const cambiar = vi.spyOn(api, 'updateProductLifecycleStatus')

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspender producto' }))
    await userEvent.type(screen.getByLabelText(/motivo/i), 'corto')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar suspensión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/obligatorio, mínimo 10 caracteres/i)
    expect(cambiar).not.toHaveBeenCalled()
  })

  it('envia SUSPENDED con el motivo, y solo actualiza tras la respuesta real de Catalog', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(
      producto({ lifecycleStatus: 'ACTIVE' }),
    )
    const cambiar = vi
      .spyOn(api, 'updateProductLifecycleStatus')
      .mockResolvedValue(producto({ lifecycleStatus: 'SUSPENDED' }))

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspender producto' }))
    await userEvent.type(screen.getByLabelText(/motivo/i), REASON)

    // Antes de confirmar, la pantalla NO adelanta el estado.
    expect(screen.getByText('Activo')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar suspensión' }))

    expect(cambiar).toHaveBeenCalledWith(ID, 'SUSPENDED', REASON)
    expect(await screen.findByText('Suspendido')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Reactivar producto' })).toBeInTheDocument()
  })

  it('envia ACTIVE con el motivo al reactivar', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(
      producto({ lifecycleStatus: 'SUSPENDED' }),
    )
    const cambiar = vi
      .spyOn(api, 'updateProductLifecycleStatus')
      .mockResolvedValue(producto({ lifecycleStatus: 'ACTIVE' }))

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Reactivar producto' }))
    await userEvent.type(screen.getByLabelText(/motivo/i), REASON)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar reactivación' }))

    expect(cambiar).toHaveBeenCalledWith(ID, 'ACTIVE', REASON)
    expect(await screen.findByText('Activo')).toBeInTheDocument()
  })

  it('refresca la consulta y muestra el aviso de éxito tras confirmar', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(
      producto({ lifecycleStatus: 'ACTIVE' }),
    )
    vi.spyOn(api, 'updateProductLifecycleStatus').mockResolvedValue(
      producto({ lifecycleStatus: 'SUSPENDED' }),
    )

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspender producto' }))
    await userEvent.type(screen.getByLabelText(/motivo/i), REASON)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar suspensión' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Estado actualizado.')
    // El formulario se cierra: no queda abierto pidiendo un segundo envio.
    expect(screen.queryByRole('form', { name: /suspender|reactivar/i })).not.toBeInTheDocument()
  })

  it.each([
    [400, 'El motivo de suspensión es obligatorio, mínimo 10 caracteres'],
    [401, /sesión no es válida o venció/i],
    [403, /segundo factor verificado/i],
    [404, /el producto no existe/i],
    [503, /no se pudo comprobar el segundo factor/i],
  ])('el error %i del servicio se muestra de forma comprensible', async (status, esperado) => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(producto())
    vi.spyOn(api, 'updateProductLifecycleStatus').mockRejectedValue(
      new HttpError(status, String(esperado), { message: String(esperado) }),
    )

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspender producto' }))
    await userEvent.type(screen.getByLabelText(/motivo/i), REASON)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar suspensión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(esperado)
  })

  it('un fallo de red (sin HttpError) muestra un mensaje generico', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(producto())
    vi.spyOn(api, 'updateProductLifecycleStatus').mockRejectedValue(
      new TypeError('Failed to fetch'),
    )

    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspender producto' }))
    await userEvent.type(screen.getByLabelText(/motivo/i), REASON)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar suspensión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/revisa tu conexión/i)
  })

  /**
   * HU-35, CA-03: reactivar un producto agotado NO repone unidades. La
   * insignia deriva de `availableUnits`, que Catalog devuelve intacto.
   */
  it('un producto agotado sigue mostrando Agotado despues de reactivarse', async () => {
    vi.spyOn(api, 'fetchAdministeredProduct').mockResolvedValue(
      producto({ lifecycleStatus: 'SUSPENDED', availableUnits: 0 }),
    )
    vi.spyOn(api, 'updateProductLifecycleStatus').mockResolvedValue(
      producto({ lifecycleStatus: 'ACTIVE', availableUnits: 0 }),
    )

    montar()

    expect(await screen.findByText('Agotado')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reactivar producto' }))
    await userEvent.type(screen.getByLabelText(/motivo/i), REASON)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar reactivación' }))

    expect(await screen.findByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Agotado')).toBeInTheDocument()
  })
})
