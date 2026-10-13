import { useEffect, useState } from 'react'
import { TournamentButton as Button } from '../TournamentVisuals'
import { Avatar } from '@/components/ui/Avatar'
import { HttpError, httpClient, type HttpDownload } from '@/lib/http'
import { avatarPathForSubject } from '@/shared/avatar'

export type AvatarDownload = (path: string) => Promise<HttpDownload>
const downloadAvatar: AvatarDownload = (path) => httpClient.download(path)
export const TeamAvatar = ({
  subject,
  avatarSubject,
  download = downloadAvatar,
}: {
  readonly subject: string
  readonly avatarSubject: string
  readonly download?: AvatarDownload
}): React.JSX.Element => {
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([subject, avatarSubject, attempt])
  const [loaded, setLoaded] = useState<{
    key: string
    url: string | null
    error: boolean
    // 404: la cuenta no tiene avatar recuperable. Es permanente: reintentar no lo arregla.
    missing: boolean
  } | null>(null)
  useEffect(() => {
    const path = avatarPathForSubject(avatarSubject)
    if (path === null) return
    let active = true
    let objectUrl: string | null = null
    void download(path)
      .then(({ content, mediaType }) => {
        if (!active) return
        if (!mediaType.startsWith('image/')) {
          setLoaded({ key, url: null, error: true, missing: false })
          return
        }
        objectUrl = URL.createObjectURL(content)
        setLoaded({ key, url: objectUrl, error: false, missing: false })
      })
      .catch((error: unknown) => {
        if (active) {
          const missing = error instanceof HttpError && error.isNotFound
          setLoaded({ key, url: null, error: true, missing })
        }
      })
    return () => {
      active = false
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }
  }, [key, avatarSubject, download])
  const current = loaded?.key === key ? loaded : null
  if (current?.missing) {
    // Sin avatar en Account (404): mismo respaldo que el resto de la app, sin boton de reintento.
    return (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar avatarUrl={null} alt="" initials="?" size="lg" />
        <p className="text-sm text-muted" role="status">
          Sin avatar.
        </p>
      </div>
    )
  }
  return (
    <div className="flex min-w-0 items-center gap-3">
      {current?.url && !current.error ? (
        <img
          className="h-16 w-16 shrink-0 rounded-full object-cover"
          alt="Avatar de cuenta elegido para el equipo"
          src={current.url}
          onError={() => {
            setLoaded({ ...current, error: true, missing: false })
          }}
        />
      ) : (
        <div className="min-w-0 text-sm text-muted">
          <p role="status">{current === null ? 'Consultando avatar…' : 'Avatar no disponible.'}</p>
          {current?.error && (
            <Button
              variant="secondary"
              onClick={() => {
                setAttempt((n) => n + 1)
              }}
            >
              Reintentar avatar
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
