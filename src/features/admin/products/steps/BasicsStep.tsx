import { useState } from 'react'

import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'

import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type ProductType } from '../contract'
import type { ProductDraft } from '../draft'
import type { FieldErrors } from '../validation'

export interface StepProps {
  readonly draft: ProductDraft
  readonly onChange: (patch: Partial<ProductDraft>) => void
  readonly errors: FieldErrors
}

/**
 * Paso 1: los datos que todo producto tiene, sea del tipo que sea.
 *
 * SOBRE LA IMAGEN. El diseño dibuja un selector de archivo, y aqui hay un campo
 * de URL. No es una simplificacion por comodidad: el servicio de
 * almacenamiento de objetos todavia no existe -ADR-016 esta «Proposed» y sin
 * provisionar-, asi que un boton «Seleccionar archivo» no tendria donde subir
 * nada. Catalog persiste una REFERENCIA (`imageUrl`), que es exactamente lo
 * que este campo captura, y la propia HU-33 lo dice: «el microservicio de
 * catalogo solo persiste la referencia/URL».
 *
 * Poner el boton y no subir el archivo seria peor que no ponerlo: la pantalla
 * afirmaria algo que no ocurre. Cuando ADR-016 se acepte y se provisione, este
 * campo se sustituye por la carga real sin tocar el resto del formulario.
 */
export const BasicsStep = ({ draft, onChange, errors }: StepProps): React.JSX.Element => {
  const [previewFailed, setPreviewFailed] = useState(false)
  const image = draft.imageUrl.trim()
  const showPreview = image !== '' && !previewFailed

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
            <img
              src={image}
              alt=""
              className="size-full object-cover"
              onError={() => {
                setPreviewFailed(true)
              }}
            />
          ) : (
            <span className="px-2 text-center text-xs text-muted">
              {previewFailed ? 'No se pudo cargar la imagen' : 'Vista previa de la imagen'}
            </span>
          )}
        </div>

        <TextField
          label="Imagen representativa"
          required
          type="url"
          value={draft.imageUrl}
          error={errors.imageUrl}
          placeholder="https://…/espada.webp"
          hint="Referencia a una imagen ya publicada (PNG, JPG o WEBP). La carga de archivos llega con ADR-016."
          onChange={(event) => {
            setPreviewFailed(false)
            onChange({ imageUrl: event.target.value })
          }}
        />
      </div>
    </div>
  )
}
