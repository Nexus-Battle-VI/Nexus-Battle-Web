import { useState } from 'react'
import { Link } from 'react-router'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { formatDateTime } from '@/lib/format'
import { useLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'
import { useAdminBanners, useCreateBanner } from './useAdminBanners'

interface BannerFormState {
  readonly title: string
  readonly content: string
  readonly publishAt: string
  readonly expiresAt: string
}

const EMPTY_FORM: BannerFormState = { title: '', content: '', publishAt: '', expiresAt: '' }

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
  // Guarda la CLAVE del aviso; se traduce al pintar.
  const [validationError, setValidationError] = useState<string | undefined>(undefined)
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
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
      setValidationError('notifications:admin.required')
      return
    }

    const publishAt = new Date(form.publishAt)
    const expiresAt = new Date(form.expiresAt)

    if (Number.isNaN(publishAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
      setValidationError('notifications:admin.invalidDates')
      return
    }

    if (publishAt.getTime() > expiresAt.getTime()) {
      setValidationError('notifications:admin.dateOrder')
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
        items={[
          { label: t('notifications:home'), to: '/ecommerce' },
          { label: t('notifications:admin.crumb') },
        ]}
      />

      <header>
        <h1 className="text-2xl font-semibold text-ink">{t('notifications:admin.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('notifications:admin.subtitle')}</p>
      </header>

      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5"
      >
        <TextField
          label={t('notifications:admin.titleField')}
          required
          value={form.title}
          onChange={(event) => {
            patch({ title: event.target.value })
          }}
        />

        <TextareaField
          label={t('notifications:admin.content')}
          required
          value={form.content}
          onChange={(event) => {
            patch({ content: event.target.value })
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t('notifications:admin.publishAt')}
            type="datetime-local"
            required
            value={form.publishAt}
            onChange={(event) => {
              patch({ publishAt: event.target.value })
            }}
          />
          <TextField
            label={t('notifications:admin.expiresAt')}
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
            {t(validationError)}
          </p>
        )}

        {mutation.isError && (
          <p role="alert" className="text-sm text-danger">
            {mutation.error instanceof Error
              ? describeFailure(mutation.error, t, language)
              : t('notifications:admin.failed')}
          </p>
        )}

        {mutation.isSuccess && (
          <p role="status" aria-live="polite" className="text-sm text-brand">
            {t('notifications:admin.published')}
          </p>
        )}

        <div>
          <Button type="submit" loading={mutation.isPending}>
            {t('notifications:admin.publish')}
          </Button>
        </div>
      </form>

      <section aria-label={t('notifications:admin.list')}>
        <h2 className="text-sm font-semibold text-muted">{t('notifications:admin.list')}</h2>

        {isLoading && (
          <p role="status" className="mt-2 text-sm text-muted">
            {t('notifications:loading')}
          </p>
        )}

        {!isLoading && error !== null && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {t('notifications:admin.listFailed')}
          </p>
        )}

        {!isLoading && error === null && items.length === 0 && (
          <p className="mt-2 text-sm text-muted">{t('notifications:admin.empty')}</p>
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
                    {banner.isActive
                      ? t('notifications:admin.active')
                      : t('notifications:admin.inactive')}
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
        {t('notifications:admin.back')}
      </Link>
    </div>
  )
}
