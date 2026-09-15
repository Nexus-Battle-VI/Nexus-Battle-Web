import { useState } from 'react'
import { Link } from 'react-router'
import clsx from 'clsx'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { formatDateTime } from '@/lib/format'
import { useAdminBanners, useCreateBanner } from './useAdminBanners'

interface BannerFormState {
  readonly title: string
  readonly content: string
  readonly publishAt: string
  readonly expiresAt: string
}

const EMPTY_FORM: BannerFormState = { title: '', content: '', publishAt: '', expiresAt: '' }

const describeCreateBannerFailure = (error: unknown): string =>
  error instanceof Error ? error.message : 'No se pudo publicar el banner.'

/**
 * Gestion administrativa del banner informativo (HU-38, Task #181).
 *
 * Adaptacion del mockup de Figma: el diseño solo dibuja "Mensaje del banner"
 * + fechas, pero el contrato real de `POST /v1/admin/banners` exige tambien
 * `title`. Se añade "Título del banner" como adaptacion del diseño al
 * contrato ya implementado, no como un requisito inventado.
 *
 * El mockup muestra dd/mm/aaaa; el backend espera instantes ISO-8601. Se usa
 * `datetime-local` -la persona elige fecha Y hora explicitamente- y se
 * convierte con `toISOString()` al enviar, sin inventar una regla de "dia
 * completo" (00:00 a 23:59:59) que ningun contrato define.
 *
 * Solo permite CREAR y CONSULTAR: el backend no ofrece editar/eliminar/
 * despublicar todavia, asi que esta pantalla no inventa esos botones.
 */
export const BannerManagementPage = (): React.JSX.Element => {
  const [form, setForm] = useState<BannerFormState>(EMPTY_FORM)
  const [validationError, setValidationError] = useState<string | undefined>(undefined)
  const { items, isLoading, error } = useAdminBanners()
  const mutation = useCreateBanner()

  const patch = (changes: Partial<BannerFormState>): void => {
    setForm((current) => ({ ...current, ...changes }))
  }

  const submit = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    mutation.reset()

    const title = form.title.trim()
    const content = form.content.trim()

    if (title === '' || content === '' || form.publishAt === '' || form.expiresAt === '') {
      setValidationError('Completa título, mensaje, inicio y fin de vigencia.')
      return
    }

    const publishAt = new Date(form.publishAt)
    const expiresAt = new Date(form.expiresAt)

    if (Number.isNaN(publishAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
      setValidationError('Las fechas de vigencia no son válidas.')
      return
    }

    if (publishAt.getTime() > expiresAt.getTime()) {
      setValidationError('El inicio de vigencia debe ser anterior o igual al fin de vigencia.')
      return
    }

    setValidationError(undefined)
    mutation.mutate(
      { title, content, publishAt: publishAt.toISOString(), expiresAt: expiresAt.toISOString() },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM)
        },
      },
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Breadcrumb
        items={[{ label: 'Inicio', to: '/ecommerce' }, { label: 'Banner informativo' }]}
      />

      <header>
        <h1 className="text-2xl font-semibold text-ink">Banner informativo</h1>
        <p className="mt-1 text-sm text-muted">
          Vigencia por fechas. Fuera de vigencia se excluye silenciosamente.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5"
      >
        <TextField
          label="Título del banner"
          required
          value={form.title}
          onChange={(event) => {
            patch({ title: event.target.value })
          }}
        />

        <TextareaField
          label="Mensaje del banner"
          required
          value={form.content}
          onChange={(event) => {
            patch({ content: event.target.value })
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Inicio de vigencia"
            type="datetime-local"
            required
            value={form.publishAt}
            onChange={(event) => {
              patch({ publishAt: event.target.value })
            }}
          />
          <TextField
            label="Fin de vigencia"
            type="datetime-local"
            required
            value={form.expiresAt}
            onChange={(event) => {
              patch({ expiresAt: event.target.value })
            }}
          />
        </div>

        {validationError !== undefined && (
          <p role="alert" className="text-sm text-danger">
            {validationError}
          </p>
        )}

        {mutation.isError && (
          <p role="alert" className="text-sm text-danger">
            {describeCreateBannerFailure(mutation.error)}
          </p>
        )}

        {mutation.isSuccess && (
          <p role="status" aria-live="polite" className="text-sm text-brand">
            Banner publicado.
          </p>
        )}

        <div>
          <Button type="submit" loading={mutation.isPending}>
            Publicar banner
          </Button>
        </div>
      </form>

      <section aria-label="Banners administrados">
        <h2 className="text-sm font-semibold text-muted">Banners administrados</h2>

        {isLoading && (
          <p role="status" className="mt-2 text-sm text-muted">
            Cargando...
          </p>
        )}

        {!isLoading && error !== null && (
          <p role="alert" className="mt-2 text-sm text-danger">
            No se pudo cargar el listado de banners.
          </p>
        )}

        {!isLoading && error === null && items.length === 0 && (
          <p className="mt-2 text-sm text-muted">Todavía no se ha publicado ningún banner.</p>
        )}

        {!isLoading && error === null && items.length > 0 && (
          <ul className="mt-2 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface-raised">
            {items.map((banner) => (
              <li key={banner.id} className="flex flex-col gap-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{banner.title}</p>
                  <span
                    className={clsx(
                      'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      banner.isActive ? 'bg-success/15 text-success' : 'bg-border text-muted',
                    )}
                  >
                    {banner.isActive ? 'Vigente' : 'Fuera de vigencia'}
                  </span>
                </div>
                <p className="text-sm text-muted">{banner.content}</p>
                <p className="text-xs text-muted">
                  {formatDateTime(banner.publishAt)} — {formatDateTime(banner.expiresAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link to="/ecommerce" className="text-sm text-muted underline">
        ← Volver
      </Link>
    </div>
  )
}
