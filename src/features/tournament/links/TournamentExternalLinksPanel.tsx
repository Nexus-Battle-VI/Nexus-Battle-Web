import { TournamentHeading } from '../TournamentVisuals'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TournamentButton as Button } from '../TournamentVisuals'
import { TournamentCard as Card } from '../TournamentVisuals'
import { TextField } from '@/components/ui/form/TextField'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import { useTournamentRequestScope } from '../requestScope'
import {
  tournamentLinksApi,
  type TournamentLinks,
  type TournamentLinksApi,
  type SaveTournamentLinks,
} from './api'

const LinksEditor = ({
  snapshot,
  busy,
  save,
}: {
  readonly snapshot: TournamentLinks
  readonly busy: boolean
  readonly save: (command: SaveTournamentLinks) => Promise<void>
}): React.JSX.Element => {
  const [live, setLive] = useState(snapshot.liveUrl ?? '')
  const [archive, setArchive] = useState(snapshot.youtubeArchiveUrl ?? '')
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save({
          liveUrl: live.trim() || null,
          youtubeArchiveUrl: archive.trim() || null,
          expectedRevision: snapshot.revision,
        })
      }}
    >
      <TextField
        label="Enlace del directo"
        type="url"
        maxLength={2048}
        value={live}
        disabled={busy}
        hint="Dirección HTTPS de YouTube o Twitch. Déjala vacía si todavía no hay enlace."
        onChange={(e) => {
          setLive(e.target.value)
        }}
      />
      <TextField
        label="Canal de grabaciones en YouTube"
        type="url"
        maxLength={2048}
        value={archive}
        disabled={busy}
        hint="Canal oficial o su pestaña de vídeos/emisiones. Se publicará al guardar."
        onChange={(e) => {
          setArchive(e.target.value)
        }}
      />
      <Button type="submit" loading={busy} disabled={busy}>
        Guardar enlaces
      </Button>
    </form>
  )
}
const LinksView = ({
  id,
  api,
  subject,
  roles,
}: {
  readonly id: string
  readonly api: TournamentLinksApi
  readonly subject: string | null
  readonly roles: readonly string[]
}): React.JSX.Element => {
  const client = useQueryClient()
  const isCurrent = useTournamentRequestScope(id)
  const key = ['tournament-links', subject, id]
  const view = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const result = await api.view(id, signal)
      if (result.tournamentId !== id)
        throw new Error('Los enlaces recibidos pertenecen a otro torneo.')
      return result
    },
    enabled: subject !== null && id !== '',
    retry: false,
  })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null)
  const admin = roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR')
  const denied = view.error instanceof HttpError && [401, 403].includes(view.error.status)
  const snapshot = denied ? undefined : view.data
  const save = async (command: SaveTournamentLinks): Promise<void> => {
    if (busy) return
    setBusy(true)
    setNotice(null)
    try {
      const result = await api.save(id, command)
      if (!isCurrent()) return
      if (result.tournamentId !== id) throw new Error('La respuesta no corresponde a este torneo.')
      client.setQueryData(key, result)
      setNotice({ error: false, message: 'Enlaces guardados.' })
    } catch (error: unknown) {
      if (!isCurrent()) return
      setNotice({
        error: true,
        message:
          error instanceof HttpError && error.status === 409
            ? 'Otra persona cambió los enlaces. Revisa la versión actual antes de guardar de nuevo.'
            : error instanceof Error
              ? error.message
              : 'No se pudieron guardar los enlaces. Puedes reintentar.',
      })
      if (error instanceof HttpError && [401, 403, 409].includes(error.status)) await view.refetch()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <section aria-label="Transmisión y grabaciones" className="grid gap-4">
        <TournamentHeading icon="transmission">Transmisión y grabaciones</TournamentHeading>
        {subject === null ? (
          <p>Inicia sesión para consultar los enlaces del torneo.</p>
        ) : (
          <>
            {view.isPending && <p role="status">Consultando enlaces…</p>}
            {view.isError && (
              <div role="alert">
                <p>No se pudieron consultar los enlaces.</p>
                <Button variant="secondary" onClick={() => void view.refetch()}>
                  Volver a consultar enlaces
                </Button>
              </div>
            )}
            {snapshot && (
              <>
                <div className="flex flex-wrap gap-4">
                  {snapshot.liveUrl ? (
                    <a
                      href={snapshot.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand underline"
                    >
                      Ver transmisión
                    </a>
                  ) : (
                    <p>El enlace de la transmisión todavía no se ha publicado.</p>
                  )}
                  {snapshot.youtubeArchiveUrl ? (
                    <a
                      href={snapshot.youtubeArchiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand underline"
                    >
                      Ver grabaciones en YouTube
                    </a>
                  ) : (
                    <p>El canal de grabaciones todavía no se ha publicado.</p>
                  )}
                </div>
                <p className="text-sm text-muted">
                  La reproducción se abre en la plataforma externa. Un enlace publicado no confirma
                  que la emisión esté activa. Las grabaciones muestran las justas incluidas en la
                  emisión.
                </p>
                {admin && !view.isError && (
                  <LinksEditor
                    key={JSON.stringify([id, subject, snapshot.revision])}
                    snapshot={snapshot}
                    busy={busy}
                    save={save}
                  />
                )}
              </>
            )}
            {notice && <p role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
          </>
        )}
      </section>
    </Card>
  )
}
export const TournamentExternalLinksPanel = ({
  id,
  api = tournamentLinksApi,
  identity,
}: {
  readonly id: string
  readonly api?: TournamentLinksApi
  readonly identity?: { subject: string; roles: readonly string[] }
}): React.JSX.Element => {
  const sessionSubject = useSession((s) => s.subject),
    sessionRoles = useSession((s) => s.roles)
  const subject = identity?.subject ?? sessionSubject,
    roles = identity?.roles ?? sessionRoles
  return (
    <LinksView key={`${id}:${subject ?? ''}`} id={id} api={api} subject={subject} roles={roles} />
  )
}
