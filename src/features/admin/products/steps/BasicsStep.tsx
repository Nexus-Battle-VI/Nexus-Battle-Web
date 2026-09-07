import { useState } from 'react'

import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { ProductImage } from '@/components/ui/ProductImage'

import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type ProductType } from '../contract'
import type { ProductDraft } from '../draft'
import type { FinalizedProductAsset } from '../product-assets'
import type { FieldErrors } from '../validation'

export interface StepProps {
  readonly draft: ProductDraft
  readonly onChange: (patch: Partial<ProductDraft>) => void
  readonly errors: FieldErrors
}

interface BasicsStepProps extends StepProps {
  readonly onUploadPrimaryImage: (file: File) => Promise<FinalizedProductAsset>
}

/**
 * Paso 1: los datos que todo producto tiene, sea del tipo que sea.
 *
 * La URL no se escribe: solo Catalog puede emitir la referencia canónica tras
 * firmar, recibir y validar el archivo. Así el formulario nunca persiste una
 * URL temporal de S3 ni una referencia externa que Catalog rechazaría.
 */
export const BasicsStep = ({
  draft,
  onChange,
  errors,
  onUploadPrimaryImage,
}: BasicsStepProps): React.JSX.Element => {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const image = draft.imageUrl.trim()
  const showPreview = image !== ''

  const selectImage = async (file: File | undefined): Promise<void> => {
    if (file === undefined) {
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const asset = await onUploadPrimaryImage(file)
      onChange({ imageUrl: asset.imageUrl })
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : 'No se pudo cargar la imagen.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <TextField
          label="Nombre del producto"
          required
          value={draft.name}
          error={errors.name}
          hint="Entre 3 y 80 caracteres. Debe ser único dentro del mismo tipo."
          placeholder="Ej. Espada de Fuego"
          onChange={(event) => {
            onChange({ name: event.target.value })
          }}
        />

        <SelectField
          label="Tipo de producto"
          required
          value={draft.type}
          error={errors.type}
          placeholder="Selecciona un tipo"
          hint="El tipo determina qué atributos se piden en el paso siguiente."
          options={PRODUCT_TYPES.map((type) => ({ value: type, label: PRODUCT_TYPE_LABELS[type] }))}
          onChange={(event) => {
            onChange({ type: event.target.value as ProductType | '' })
          }}
        />
      </div>

      <TextareaField
        label="Descripción detallada"
        required
        value={draft.description}
        error={errors.description}
        placeholder="Describe la historia, función o identidad del producto dentro del juego."
        onChange={(event) => {
          onChange({ description: event.target.value })
        }}
      />

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-start">
        <div
          className="flex h-28 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-surface/60"
          aria-hidden="true"
        >
          {showPreview ? (
            <ProductImage
              source={image}
              name={draft.name || 'producto'}
              className="size-full object-contain"
            />
          ) : (
            <span className="px-2 text-center text-xs text-muted">Vista previa de la imagen</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink" htmlFor="product-primary-image">
            Imagen representativa <span aria-hidden="true">*</span>
          </label>
          <input
            id="product-primary-image"
            className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            aria-invalid={errors.imageUrl !== undefined || uploadError !== null}
            aria-describedby="product-primary-image-help"
            onChange={(event) => {
              void selectImage(event.target.files?.[0])
            }}
          />
          <p id="product-primary-image-help" className="text-xs text-muted">
            JPG, PNG o WEBP; máximo 5 MiB. La imagen se valida antes de asociarla al producto.
          </p>
          {uploading && (
            <p role="status" className="text-sm text-muted">
              Cargando y validando imagen…
            </p>
          )}
          {!uploading && image !== '' && (
            <p role="status" className="text-sm text-success">
              Imagen cargada y validada.
            </p>
          )}
          {uploadError !== null && (
            <p role="alert" className="text-sm text-danger">
              {uploadError}
            </p>
          )}
          {errors.imageUrl !== undefined && (
            <p role="alert" className="text-sm text-danger">
              {errors.imageUrl}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
