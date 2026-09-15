import { useEffect } from 'react'

import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useSession } from '@/shared/session'
import { ApplySanctionPage } from '../ApplySanctionPage'
import type { AppliedSanction, ApplySanctionInput } from '../api'

const previewSanction = (
  targetAccountId: string,
  input: ApplySanctionInput,
): Promise<AppliedSanction> => {
  const createdAt = new Date()
  const expiresAt =
    input.type === 'TEMPORARY_SUSPENSION' && input.suspensionDurationMinutes !== undefined
      ? new Date(createdAt.getTime() + input.suspensionDurationMinutes * 60_000).toISOString()
      : null

  return Promise.resolve({
    id: 'preview-sanction',
    targetAccountId,
    actorAccountId: 'preview-moderator',
    type: input.type,
    reason: input.reason,
    createdAt: createdAt.toISOString(),
    expiresAt,
    appealDeadline: new Date(createdAt.getTime() + 30 * 24 * 60 * 60_000).toISOString(),
  })
}

/** Vista local simulada: no establece una sesión real ni contacta Account. */
export const ApplySanctionDevPreview = (): React.JSX.Element => {
  useEffect(() => {
    const previousSession = useSession.getState()
    useSession.setState({
      subject: 'dev-preview-moderator',
      displayName: 'Moderador de vista previa',
      roles: ['MODERATOR'],
    })

    return () => {
      useSession.setState(previousSession)
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface/70 p-3">
        <p className="text-xs text-muted">
          Vista previa de desarrollo. La cuenta, el envío y la respuesta son simulados; nada llega a
          Account.
        </p>
        <ThemeToggle />
      </div>
      <ApplySanctionPage
        initialTarget={{ targetAccountId: '00891', displayName: 'MiraSong' }}
        submitSanction={previewSanction}
      />
    </div>
  )
}
