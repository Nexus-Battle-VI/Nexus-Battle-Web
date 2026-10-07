import { useEffect, useMemo, useRef } from 'react'
import { useSession } from '@/shared/session'

/** An awaited mutation may only update the tournament and session that issued it. */
export const useTournamentRequestScope = (id: string): (() => boolean) => {
  const subject = useSession((s) => s.subject)
  const token = useSession((s) => s.accessToken)
  const roles = useSession((s) => s.roles).join('|')
  const scope = useMemo(() => ({ id, subject, token, roles }), [id, subject, token, roles])
  const active = useRef<typeof scope | null>(scope)
  useEffect(() => {
    active.current = scope
    return () => {
      if (active.current === scope) active.current = null
    }
  }, [scope])
  return () => {
    const session = useSession.getState()
    return (
      active.current === scope &&
      session.subject === scope.subject &&
      session.accessToken === scope.token &&
      session.roles.join('|') === scope.roles
    )
  }
}
