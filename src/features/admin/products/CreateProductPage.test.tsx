import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { renderWithProviders } from '@/test/render'

import { CreateProductPage } from './CreateProductPage'
import type { CreateProductRequest, CreatedProduct } from './contract'

const created = (): CreatedProduct => ({
  productId: '5f2a1c9d-7b3e-4a11-9c5d-2e8f0a6b4c37',
  name: 'Espada de Fuego',
  type: 'ARMA',
  printRun: 150,
  printRunMode: 'LIMITED',
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 40,
  premium: false,
})

/** Rellena el paso 1 con el caso base de HU-33 y avanza. */
const completeBasics = async (): Promise<void> => {
  await userEvent.type(screen.getByLabelText(/nombre del producto/i), 'Espada de Fuego')
  await userEvent.selectOptions(screen.getByLabelText(/tipo de producto/i), 'ARMA')
  await userEvent.type(screen.getByLabelText(/descripción detallada/i), 'Espada de dos manos.')
  await userEvent.type(
    screen.getByLabelText(/imagen representativa/i),
    'https://assets.example.test/espada.webp',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

const completeAttributes = async (): Promise<void> => {
  await userEvent.type(screen.getByLabelText(/^cantidad$/i), '7')
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

const completePricing = async (printRun = '150'): Promise<void> => {
  await userEvent.type(screen.getByLabelText(/cantidad de unidades/i), printRun)
  await userEvent.type(screen.getByLabelText(/precio en créditos/i), '40')
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

describe('Alta de producto (HU-33)', () => {
  /** CA-01: flujo principal completo, hasta el 201 y el identificador. */
  it('crea el producto y muestra el identificador devuelto', async () => {
    const onCreate = vi.fn<(request: CreateProductRequest) => Promise<CreatedProduct>>(() =>
      Promise.resolve(created()),
    )

    renderWithProviders(<CreateProductPage onCreate={onCreate} />)

    await completeBasics()
    await completeAttributes()
    await completePricing()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar producto' }))

    expect(await screen.findByText(/producto creado/i)).toBeInTheDocument()
    expect(screen.getByText('5f2a1c9d-7b3e-4a11-9c5d-2e8f0a6b4c37')).toBeInTheDocument()

    const request = onCreate.mock.calls[0]?.[0]
    expect(request?.name).toBe('Espada de Fuego')
    expect(request?.printRun).toBe(150)
    expect(request?.premium).toBe(false)
  })

  /**
   * CA-02: la cantidad invalida se detiene AQUI, sin gastar la peticion. El
   * control es doble: aparece el mensaje y `onCreate` no llega a llamarse.
   *
   * HU-34 cambio la forma del paso: `-5` ya no puede escribirse porque la
   * modalidad se ELIGE y el campo pide una cantidad. Se prueba con `0`, que es
   * el valor invalido que si sigue siendo tecleable.
   */
  it('no envía nada si la cantidad es 0', async () => {
    const onCreate = vi.fn<(request: CreateProductRequest) => Promise<CreatedProduct>>()

    renderWithProviders(<CreateProductPage onCreate={onCreate} />)

    await completeBasics()
    await completeAttributes()
    await userEvent.type(screen.getByLabelText(/cantidad de unidades/i), '0')
    await userEvent.type(screen.getByLabelText(/precio en créditos/i), '40')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByText(/La cantidad debe ser un entero mayor o igual que 1/i),
    ).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  /**
   * HU-34: elegir tiraje infinito manda `-1` sin que nadie lo escriba, y el
   * campo de cantidad DESAPARECE. Ese segundo control importa: un campo que el
   * servicio va a ignorar solo puede confundir sobre lo que se configura.
   */
  it('el tiraje infinito se elige y viaja como -1', async () => {
    const onCreate = vi.fn<(request: CreateProductRequest) => Promise<CreatedProduct>>(() =>
      Promise.resolve(created()),
    )

    renderWithProviders(<CreateProductPage onCreate={onCreate} />)

    await completeBasics()
    await completeAttributes()

    await userEvent.selectOptions(screen.getByLabelText(/disponibilidad/i), 'INFINITE')

    expect(screen.queryByLabelText(/cantidad de unidades/i)).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/precio en créditos/i), '40')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Publicar producto' }))

    expect(await screen.findByText(/producto creado/i)).toBeInTheDocument()
    expect(onCreate.mock.calls[0]?.[0].printRun).toBe(-1)
  })

  /** CA-03: nombre duplicado. El 409 se traduce, no se muestra crudo. */
  it('explica el nombre duplicado cuando el servicio responde 409', async () => {
    const onCreate = vi.fn(() =>
      Promise.reject(new HttpError(409, 'Conflict', { message: 'Conflict' })),
    )

    renderWithProviders(<CreateProductPage onCreate={onCreate} />)

    await completeBasics()
    await completeAttributes()
    await completePricing()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar producto' }))

    expect(
      await screen.findByText(/Ya existe un producto activo de este tipo con el mismo nombre/i),
    ).toBeInTheDocument()
  })

  /**
   * El 403 mas probable en esta pantalla NO es de rol: es la evidencia de
   * segundo factor que Catalog exige. El mensaje tiene que nombrarla, o se
   * buscara el problema en los permisos.
   */
  it('menciona el segundo factor cuando el servicio responde 403', async () => {
    const onCreate = vi.fn(() =>
      Promise.reject(new HttpError(403, 'Forbidden', { message: 'Forbidden' })),
    )

    renderWithProviders(<CreateProductPage onCreate={onCreate} />)

    await completeBasics()
    await completeAttributes()
    await completePricing()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar producto' }))

    expect(await screen.findByText(/segundo factor verificado/i)).toBeInTheDocument()
  })

  /**
   * El paso 2 depende del tipo elegido. Este caso comprueba que un heroe pide
   * lo suyo y NO lo de un arma; sin el, «el formulario se adapta al tipo»
   * podria cumplirse mostrando siempre los mismos campos.
   */
  it('pide atributos distintos según el tipo elegido', async () => {
    renderWithProviders(<CreateProductPage onCreate={vi.fn()} />)

    await userEvent.type(screen.getByLabelText(/nombre del producto/i), 'Guerrero Eterno')
    await userEvent.selectOptions(screen.getByLabelText(/tipo de producto/i), 'HEROE')
    await userEvent.type(screen.getByLabelText(/descripción detallada/i), 'Un héroe.')
    await userEvent.type(
      screen.getByLabelText(/imagen representativa/i),
      'https://assets.example.test/heroe.webp',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByLabelText(/subtipo de héroe/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/habilidad 1/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^compatibilidad$/i)).not.toBeInTheDocument()
  })

  it('el tiraje 1 anticipa que el producto nacerá único', async () => {
    renderWithProviders(<CreateProductPage onCreate={vi.fn()} />)

    await completeBasics()
    await completeAttributes()
    await userEvent.type(screen.getByLabelText(/cantidad de unidades/i), '1')

    expect(await screen.findByText(/nacerá en estado/i)).toHaveTextContent('único')
  })
})
