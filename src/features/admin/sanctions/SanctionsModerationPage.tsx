import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AdminPageHeader, AdminPanel } from '@/components/admin-kit'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/form/TextField'
import { formatDateTime } from '@/lib/format'
import { useSession } from '@/shared/session'
import { ApplySanctionForm } from './ApplySanctionForm'
import type { SanctionResponse } from './api'

/**
 * Superficie de moderacion para aplicar sanciones (HU-42, §3 del cierre:
 * "proporcionar una superficie limitada de moderacion respetando sus
 * permisos"), alcanzable por Moderador sin pasar por el panel administrativo
 * completo de usuarios (`/account/admin-users`, solo Administrador).
 *
 * POR QUE PIDE EL ID DIRECTAMENTE: Account no expone ninguna busqueda de
 * cuentas para Moderador -`GET /accounts` exige ADMINISTRATOR-. Lo unico que
 * Moderador puede resolver es el NOMBRE VISIBLE de un sujeto
 * (`GET /accounts/:subject/display-name`, HU-41), que ahora tambien
 * devuelve el id de Account (HU-42) para que ese flujo -identificar al autor
 * de un comentario reportado y sancionarlo- sea real. Esta pantalla no
 * duplica esa busqueda: asume que quien llega aqui ya tiene el id, tipicamente
 * desde la cola de moderacion de comentarios.
 */
export const SanctionsModerationPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const roles = useSession((state) => state.roles)
  const [targetAccountId, setTargetAccountId] = useState('')
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null)
  const [applied, setApplied] = useState<SanctionResponse | null>(null)

  const startFor = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    const trimmed = targetAccountId.trim()
    if (trimmed.length === 0) return
    setApplied(null)
    setActiveTargetId(trimmed)
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        icon="security"
        title={t('admin:sanctions.title')}
        subtitle={t('admin:sanctions.intro')}
      >
        <Breadcrumb
          items={[{ label: t('admin:home'), to: '/admin' }, { label: t('admin:sanctions.crumb') }]}
        />
      </AdminPageHeader>

      <AdminPanel title={t('admin:sanctions.lookup.title')}>
        <form className="flex flex-wrap items-end gap-3" onSubmit={startFor}>
          <div className="min-w-[16rem] flex-1">
            <TextField
              label={t('admin:sanctions.lookup.label')}
              hint={t('admin:sanctions.lookup.hint')}
              value={targetAccountId}
              onChange={(event) => {
                setTargetAccountId(event.target.value)
              }}
            />
          </div>
          <Button type="submit" variant="admin-primary">
            {t('admin:sanctions.lookup.submit')}
          </Button>
        </form>
      </AdminPanel>

      {applied !== null && (
        <AdminPanel title={t('admin:sanctions.result.title')}>
          <p role="status" className="text-sm text-ink">
            {t('admin:sanctions.result.applied', {
              type: t(`admin:sanctions.types.${applied.type}`),
              id: applied.id,
            })}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t('admin:sanctions.result.appealDeadline', {
              date: formatDateTime(applied.appealDeadline),
            })}
          </p>
        </AdminPanel>
      )}

      {activeTargetId !== null && (
        <AdminPanel title={t('admin:sanctions.form.title', { id: activeTargetId })}>
          <ApplySanctionForm
            key={activeTargetId}
            targetAccountId={activeTargetId}
            actorRoles={roles}
            onApplied={(sanction) => {
              setApplied(sanction)
              setActiveTargetId(null)
              setTargetAccountId('')
            }}
            onCancel={() => {
              setActiveTargetId(null)
            }}
          />
        </AdminPanel>
      )}
    </div>
  )
}
