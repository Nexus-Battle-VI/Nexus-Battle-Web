import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { ProductImage } from '@/components/ui/ProductImage'

import {
  describeUpdateDetailsFailure,
  updateProductDetails,
  type AdministeredProduct,
  type UpdateProductDetailsRequest,
} from './api'
import { uploadProductPrimaryImage, type FinalizedProductAsset } from './product-assets'

export interface EditProductFormProps {
  readonly productId: string
  readonly initialName: string
  readonly initialImageUrl: string
  /** Envio inyectable, mismo patron que `CreateProductPage.onCreate`. */
  readonly onSubmit?: (
    productId: string,
    request: UpdateProductDetailsRequest,
  ) => Promise<AdministeredProduct>
  readonly onUploadPrimaryImage?: (file: File) => Promise<FinalizedProductAsset>
  readonly onSuccess: (updated: AdministeredProduct) => void
  readonly onCancel: () => void
}

/**
 * Formulario de edicion de un producto ya creado (Gestion de productos,
 * pedido del profesor 2026-09-26): `PATCH /v1/admin/products/{id}/details`.
 *
 * ADAPTA el paso "Datos basicos" del asistente de creacion (`BasicsStep`) en
 * vez de reescribirlo: mismos tres campos (nombre, descripcion, imagen), pero
 * SOLO ESTOS TRES -no el tipo, que Catalog no permite cambiar tras crear el
 * producto- y ninguno obligatorio, porque el servicio admite cualquier
 * SUBCONJUNTO no vacio.
 *
 * SOLO SE ENVIAN LOS CAMPOS QUE REALMENTE CAMBIARON. La lista administrativa
 * no trae la descripcion vigente (el contrato de `GET /v1/admin/products` no
 * la incluye), asi que el campo empieza vacio: dejarlo vacio significa "no
 * tocar la descripcion", no "borrarla" -por eso NUNCA se envia vacio-. Nombre
 * e imagen si llegan precargados, y solo viajan si la persona los cambio.
 */
export const EditProductForm = ({
  productId,
  initialName,
  initialImageUrl,
  onSubmit = updateProductDetails,
  onUploadPrimaryImage = uploadProductPrimaryImage,
  onSuccess,
  onCancel,
}: EditProductFormProps): React.JSX.Element => {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState(initialImageUrl)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (request: UpdateProductDetailsRequest) => onSubmit(productId, request),
    onSuccess,
  })

  const selectImage = async (file: File | undefined): Promise<void> => {
    if (file === undefined) {
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const asset = await onUploadPrimaryImage(file)
      setImageUrl(asset.imageUrl)
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : t('admin:products.failures.upload'))
    } finally {
      setUploading(false)
    }
  }

  const submit = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    mutation.reset()

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    const request: UpdateProductDetailsRequest = {
      ...(trimmedName !== '' && trimmedName !== initialName ? { name: trimmedName } : {}),
      ...(trimmedDescription !== '' ? { description: trimmedDescription } : {}),
      ...(imageUrl.trim() !== '' && imageUrl !== initialImageUrl ? { imageUrl } : {}),
    }

    if (Object.keys(request).length === 0) {
      setFormError(t('admin:products.manage.editNoChanges'))
      return
    }

    setFormError(null)
    mutation.mutate(request)
  }

  return (
    <form
      onSubmit={submit}
      aria-label={t('admin:products.manage.editTitle', { name: initialName })}
      className="mt-4 space-y-4 rounded-lg border border-border bg-surface/60 p-4"
    >
      <TextField
        label={t('admin:products.manage.editName')}
        value={name}
        onChange={(event) => {
          setName(event.target.value)
        }}
      />

      <TextareaField
        label={t('admin:products.manage.editDescription')}
        hint={t('admin:products.manage.editDescriptionHint')}
        value={description}
        onChange={(event) => {
          setDescription(event.target.value)
        }}
      />

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr] sm:items-start">
        <div
          className="flex h-20 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-surface/60"
          aria-hidden="true"
        >
          <ProductImage
            source={imageUrl}
            name={name.trim() === '' ? initialName : name}
            className="size-full object-contain"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium text-ink"
            htmlFor={`edit-product-image-${productId}`}
          >
            {t('admin:products.manage.editImage')}
          </label>
          <input
            id={`edit-product-image-${productId}`}
            className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(event) => {
              void selectImage(event.target.files?.[0])
            }}
          />
          <p className="text-xs text-muted">{t('admin:products.manage.editImageHint')}</p>
          {uploading && (
            <p role="status" className="text-sm text-muted">
              {t('admin:products.basics.uploading')}
            </p>
          )}
          {!uploading && imageUrl.trim() !== '' && imageUrl !== initialImageUrl && (
            <p role="status" className="text-sm text-success">
              {t('admin:products.basics.uploaded')}
            </p>
          )}
          {uploadError !== null && (
            <p role="alert" className="text-sm text-danger">
              {uploadError}
            </p>
          )}
        </div>
      </div>

      {formError !== null && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}

      {mutation.isError && (
        <p role="alert" className="text-sm text-danger">
          {describeUpdateDetailsFailure(mutation.error)}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={mutation.isPending || uploading}>
          {mutation.isPending
            ? t('admin:products.manage.editSaving')
            : t('admin:products.manage.editSave')}
        </Button>
        <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onCancel}>
          {t('admin:products.manage.editCancel')}
        </Button>
      </div>
    </form>
  )
}
