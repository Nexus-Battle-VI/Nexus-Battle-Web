import { useLayoutEffect, useState } from 'react'

import { useSession } from '@/shared/session'

/**
 * Vista previa de desarrollo del armazon remasterizado (EN-031): el mundo vivo
 * de fondo, la cabecera estandarte y el cajon movil, dentro del `AppLayout`
 * real.
 *
 * NO ES UNA PANTALLA DEL PRODUCTO. Pone una sesion de ejemplo con el rol
 * elegido SOLO mientras esta montada (asi se ve el cajon con y sin el grupo
 * de administracion) y al desmontar devuelve la sesion como estaba. El
 * contenido es largo a proposito, para ver el parallax al desplazarse. Solo
 * existe con `import.meta.env.DEV`.
 */
const ROLES = [
  ['Jugador', 'PLAYER'],
  ['Moderador', 'MODERATOR'],
  ['Administrador', 'ADMINISTRATOR'],
  ['Super administrador', 'SUPER_ADMINISTRATOR'],
] as const

export const ShellRemasterPreview = (): React.JSX.Element => {
  const [role, setRole] = useState<string>('PLAYER')

  useLayoutEffect(() => {
    const previous = useSession.getState()
    useSession.setState({ subject: 'sujeto-armazon-vista-previa', roles: ['PLAYER'] })
    return () => {
      useSession.setState({ subject: previous.subject, roles: previous.roles })
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-surface-raised/90 p-5">
        <h1 className="text-xl font-semibold text-ink">Vista previa EN-031 · Armazón</h1>
        <p className="mt-1 text-sm text-muted">
          Mundo vivo de fondo, cabecera estandarte y cajón móvil (por debajo de 640 px).
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Rol de ejemplo">
          {ROLES.map(([label, value]) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              className="rounded-md border border-border px-3 py-1 text-sm aria-pressed:bg-brand aria-pressed:text-brand-ink"
              onClick={() => {
                setRole(value)
                useSession.setState({ roles: [value] })
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {Array.from({ length: 6 }, (_, index) => (
        <section
          key={index}
          className="rounded-xl border border-border bg-surface-raised/80 p-5 text-sm text-muted"
        >
          Bloque de contenido {index + 1}: desplázate para ver el parallax de las colinas y las
          brasas (o el polen, en Light) subiendo detrás del contenido.
        </section>
      ))}
    </div>
  )
}
