import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Stepper, type StepDefinition } from '@/components/ui/Stepper'

import { createProduct, describeCreationFailure } from './api'
import type { CreateProductRequest, CreatedProduct } from './contract'
import { emptyDraft, type ProductDraft } from './draft'
import { buildCreateRequest } from './payload'
import { BasicsStep } from './steps/BasicsStep'
import { AttributesStep } from './steps/AttributesStep'
import { PricingStep } from './steps/PricingStep'
import { ReviewStep } from './steps/ReviewStep'
import { validateAttributes, validateBasics, validatePricing, type FieldErrors } from './validation'

const STEPS: readonly StepDefinition[] = [
  { id: 'basics', label: 'Datos básicos' },
  { id: 'attributes', label: 'Tipo y atributos' },
  { id: 'pricing', label: 'Tiraje y precio' },
  { id: 'review', label: 'Confirmar' },
]

const VALIDATORS = [validateBasics, validateAttributes, validatePricing] as const

const NO_ERRORS: FieldErrors = {}

/**
 * Alta de producto del catalogo (HU-33, RF-33).
 *
 * ES UN ASISTENTE Y NO UN FORMULARIO LARGO por una razon del dominio, no de
 * estilo: los atributos del paso 2 dependen del tipo elegido en el paso 1, y
 * seis conjuntos de campos mutuamente excluyentes en una sola pantalla obligan
 * a ignorar casi todo lo que se ve.
 *
 * CADA PASO SE VALIDA ANTES DE AVANZAR, no al enviar. Descubrir en el paso 4
 * que el nombre tenia dos caracteres significaria rehacer el recorrido. Los
 * pasos ya visitados quedan navegables hacia atras desde el propio indicador.
 *
 * LA AUTORIZACION NO VIVE AQUI. Esta pantalla se monta tras una guarda de
 * presentacion, pero quien manda es Catalog: exige rol administrativo Y
 * evidencia de segundo factor sobre el mismo testimonio, y responde 403 aunque
 * alguien escriba la URL a mano. Por eso el envio traduce sus codigos en lugar
 * de suponer que nunca llegaran.
 */
export interface CreateProductPageProps {
  /**
   * Envio del alta. Se inyecta -como en la gestion de roles- para que las
   * pruebas ejerciten el recorrido completo sin doblar el modulo HTTP.
   */
  readonly onCreate?: (request: CreateProductRequest) => Promise<CreatedProduct>
}

export const CreateProductPage = ({
  onCreate = createProduct,
}: CreateProductPageProps = {}): React.JSX.Element => {
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS)
  const [created, setCreated] = useState<CreatedProduct | null>(null)

  const mutation = useMutation({
    mutationFn: onCreate,
    onSuccess: (product) => {
      setCreated(product)
    },
  })

  const patch = (changes: Partial<ProductDraft>): void => {
    setDraft((current) => ({ ...current, ...changes }))
  }

  const validateCurrent = (): FieldErrors => {
    const validator = VALIDATORS[step]

    return validator === undefined ? NO_ERRORS : validator(draft)
  }

  const goNext = (): void => {
    const found = validateCurrent()
    setErrors(found)

    if (Object.keys(found).length > 0) {
      return
    }

    const next = Math.min(step + 1, STEPS.length - 1)
    setStep(next)
    setReached((current) => Math.max(current, next))
  }

  const goBack = (): void => {
    setErrors(NO_ERRORS)
    setStep((current) => Math.max(0, current - 1))
  }

  const submit = (): void => {
    // Se revalidan LOS TRES pasos, no solo el ultimo. Volver atras con el
    // indicador y cambiar un dato puede invalidar un paso ya superado, y sin
    // esta comprobacion el formulario enviaria ese estado roto.
    const found = {
      ...validateBasics(draft),
      ...validateAttributes(draft),
      ...validatePricing(draft),
    }

    if (Object.keys(found).length > 0) {
      setErrors(found)
      setStep(Object.keys(validateBasics(draft)).length > 0 ? 0 : 1)
      return
    }

    setErrors(NO_ERRORS)
    mutation.mutate(buildCreateRequest(draft))
  }

  const startAnother = (): void => {
    setDraft(emptyDraft())
    setStep(0)
    setReached(0)
    setErrors(NO_ERRORS)
    setCreated(null)
    mutation.reset()
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Inicio', to: '/ecommerce' },
          { label: 'Catálogo', to: '/catalog' },
          { label: 'Crear producto' },
        ]}
      />

      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          Administración de productos
        </p>
        <h1 className="text-3xl font-bold text-ink">Crear producto</h1>
        <p className="max-w-3xl text-sm text-muted">
          Los campos específicos aparecen únicamente después de seleccionar el tipo de producto.
        </p>
      </header>

      <section className="overflow-hidden rounded-lg border border-border bg-surface-raised">
        <Stepper
          steps={STEPS}
          current={step}
          reached={reached}
          label="Pasos para crear un producto"
          onSelect={(index) => {
            setErrors(NO_ERRORS)
            setStep(index)
          }}
        />

        <div className="p-6">
          {created !== null ? (
            <div className="flex flex-col gap-4">
              <div
                role="status"
                className="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-ink"
              >
                <p className="font-semibold">Producto creado.</p>
                <p className="mt-1 text-muted">
                  «{created.name}» ya está disponible en el catálogo con identificador{' '}
                  <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
                    {created.productId}
                  </code>
                  .
                </p>
              </div>
              <div>
                <Button onClick={startAnother}>Crear otro producto</Button>
              </div>
            </div>
          ) : (
            <>
              {step === 0 && <BasicsStep draft={draft} onChange={patch} errors={errors} />}
              {step === 1 && <AttributesStep draft={draft} onChange={patch} errors={errors} />}
              {step === 2 && <PricingStep draft={draft} onChange={patch} errors={errors} />}
              {step === 3 && <ReviewStep draft={draft} />}

              {mutation.isError && (
                <p role="alert" className="mt-6 text-sm text-danger">
                  {describeCreationFailure(mutation.error)}
                </p>
              )}
            </>
          )}
        </div>

        {created === null && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
            {step > 0 ? (
              <Button variant="secondary" onClick={goBack}>
                Atrás
              </Button>
            ) : (
              <span />
            )}

            {step < STEPS.length - 1 ? (
              <Button onClick={goNext}>Continuar</Button>
            ) : (
              <Button onClick={submit} loading={mutation.isPending}>
                Publicar producto
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
