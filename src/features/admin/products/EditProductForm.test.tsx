import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { renderWithProviders } from '@/test/render'

import { EditProductForm } from './EditProductForm'
import type { AdministeredProduct, UpdateProductDetailsRequest } from './api'
import type { FinalizedProductAsset } from './product-assets'

const PRODUCT_ID = '5f2a1c9d-7b3e-4a11-9c5d-2e8f0a6b4c37'

const updated = (): AdministeredProduct => ({
  productId: PRODUCT_ID,
  name: 'Espada de Hielo',
  type: 'ARMA',
  printRun: 150,
  printRunMode: 'LIMITED',
  availableUnits: 150,
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 40,
  premium: false,
})

const uploadedAsset = (): FinalizedProductAsset => ({
  assetId: 'f293ce6b-98e9-41da-99ef-0ad4e3a95120',
  purpose: 'PRIMARY_IMAGE',
  status: 'READY',
  contentType: 'image/webp',
  contentLength: 3,
  width: 1024,
  height: 1024,
  checksumSha256: 'b64:checksum',
  imageUrl: 'https://cdn.nexus.test/espada-hielo.webp',
})

const uploadPrimaryImage = vi.fn<(file: File) => Promise<FinalizedProductAsset>>(() =>
  Promise.resolve(uploadedAsset()),
)

describe('EditProductForm (Gestion de productos)', () => {
  it('no envia nada si ningun campo cambio', async () => {
    const onSubmit = vi.fn()

    renderWithProviders(
      <EditProductForm
        productId={PRODUCT_ID}
        initialName="Espada de Fuego"
        initialImageUrl="https://cdn.nexus.test/espada.png"
        onSubmit={onSubmit}
        onUploadPrimaryImage={uploadPrimaryImage}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('Cambia al menos un campo antes de guardar.'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia solo el nombre cuando es lo unico que cambio', async () => {
    const onSubmit = vi.fn<
      (productId: string, request: UpdateProductDetailsRequest) => Promise<AdministeredProduct>
    >(() => Promise.resolve(updated()))
    const onSuccess = vi.fn()

    renderWithProviders(
      <EditProductForm
        productId={PRODUCT_ID}
        initialName="Espada de Fuego"
        initialImageUrl="https://cdn.nexus.test/espada.png"
        onSubmit={onSubmit}
        onUploadPrimaryImage={uploadPrimaryImage}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />,
    )

    const nameField = screen.getByLabelText('Nombre del producto')
    await userEvent.clear(nameField)
    await userEvent.type(nameField, 'Espada de Hielo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onSubmit).toHaveBeenCalledWith(PRODUCT_ID, { name: 'Espada de Hielo' })
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
    // React Query llama a `onSuccess` con (data, variables, context): solo el
    // primer argumento (el producto actualizado) le importa a este formulario.
    expect(onSuccess.mock.calls[0]?.[0]).toEqual(updated())
  })

  it('incluye la descripcion solo si se escribe algo (la lista no trae la vigente)', async () => {
    const onSubmit = vi.fn<
      (productId: string, request: UpdateProductDetailsRequest) => Promise<AdministeredProduct>
    >(() => Promise.resolve(updated()))

    renderWithProviders(
      <EditProductForm
        productId={PRODUCT_ID}
        initialName="Espada de Fuego"
        initialImageUrl="https://cdn.nexus.test/espada.png"
        onSubmit={onSubmit}
        onUploadPrimaryImage={uploadPrimaryImage}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await userEvent.type(
      screen.getByLabelText('Descripción (opcional)'),
      'Forjada en el volcán de Nexus.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onSubmit).toHaveBeenCalledWith(PRODUCT_ID, {
      description: 'Forjada en el volcán de Nexus.',
    })
  })

  it('sube una imagen nueva y la incluye en el envio', async () => {
    const onSubmit = vi.fn<
      (productId: string, request: UpdateProductDetailsRequest) => Promise<AdministeredProduct>
    >(() => Promise.resolve(updated()))

    renderWithProviders(
      <EditProductForm
        productId={PRODUCT_ID}
        initialName="Espada de Fuego"
        initialImageUrl="https://cdn.nexus.test/espada.png"
        onSubmit={onSubmit}
        onUploadPrimaryImage={uploadPrimaryImage}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await userEvent.upload(
      screen.getByLabelText('Imagen representativa'),
      new File(['webp'], 'espada-hielo.webp', { type: 'image/webp' }),
    )
    await screen.findByText(/cargando y validando imagen|imagen cargada y validada/i)

    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onSubmit).toHaveBeenCalledWith(PRODUCT_ID, { imageUrl: uploadedAsset().imageUrl })
  })

  it('cancelar llama a onCancel sin enviar nada', async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    renderWithProviders(
      <EditProductForm
        productId={PRODUCT_ID}
        initialName="Espada de Fuego"
        initialImageUrl="https://cdn.nexus.test/espada.png"
        onSubmit={onSubmit}
        onUploadPrimaryImage={uploadPrimaryImage}
        onSuccess={vi.fn()}
        onCancel={onCancel}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  /**
   * El 403 mas probable en esta pantalla, igual que en la creacion, no es de
   * rol: es la evidencia de segundo factor que Catalog exige.
   */
  it('menciona el segundo factor cuando el servicio responde 403', async () => {
    const onSubmit = vi.fn(() =>
      Promise.reject(new HttpError(403, 'Forbidden', { message: 'Forbidden' })),
    )

    renderWithProviders(
      <EditProductForm
        productId={PRODUCT_ID}
        initialName="Espada de Fuego"
        initialImageUrl="https://cdn.nexus.test/espada.png"
        onSubmit={onSubmit}
        onUploadPrimaryImage={uploadPrimaryImage}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const nameField = screen.getByLabelText('Nombre del producto')
    await userEvent.clear(nameField)
    await userEvent.type(nameField, 'Espada de Hielo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText(/segundo factor verificado/i)).toBeInTheDocument()
  })

  it('un producto ya modificado por otra persona explica el conflicto (409)', async () => {
    const onSubmit = vi.fn(() =>
      Promise.reject(new HttpError(409, 'Conflict', { message: 'Conflict' })),
    )

    renderWithProviders(
      <EditProductForm
        productId={PRODUCT_ID}
        initialName="Espada de Fuego"
        initialImageUrl="https://cdn.nexus.test/espada.png"
        onSubmit={onSubmit}
        onUploadPrimaryImage={uploadPrimaryImage}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const nameField = screen.getByLabelText('Nombre del producto')
    await userEvent.clear(nameField)
    await userEvent.type(nameField, 'Espada de Hielo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText(/otra edición modificó el producto/i)).toBeInTheDocument()
  })
})
