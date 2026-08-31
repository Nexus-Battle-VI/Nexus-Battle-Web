import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useSession } from '@/shared/session'
import { primaryRole, roleLabel } from '@/shared/rbac'
import { ChevronDown, LogOut, Package, User } from '@/components/ui/icons'

/**
 * Control de sesion de la cabecera (HU-02, HU-03, HU-05.4).
 *
 * Implementa el diseno de navegacion autenticada de Figma (Node 628:14151):
 * - Usuario no autenticado: accesos a "Crear cuenta" e "Iniciar sesion".
 * - Usuario autenticado: menu desplegable "Mi cuenta" con avatar, informacion
 *   de usuario, accesos de navegacion y la accion destacada "Cerrar sesion".
 *
 * HU-05.4: los colores hex embebidos se sustituyen por tokens del Design System
 * para que el menu funcione en claro y oscuro; se conserva profundidad y
 * desenfoque. La etiqueta "Mi perfil" pasa a "Mi cuenta" (misma ruta `/account`).
 * Al cerrar con Escape, el foco vuelve al disparador.
 */
export const SessionControl = (): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  const available = useSession((state) => state.authenticationAvailable)
  const subject = useSession((state) => state.subject)
  const email = useSession((state) => state.email)
  const displayName = useSession((state) => state.displayName)
  const roles = useSession((state) => state.roles)
  const signOut = useSession((state) => state.signOut)
  const role = primaryRole(roles)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        // Devolver el foco al disparador: cerrar con teclado no debe dejar el
        // foco perdido en el `body`.
        triggerRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!available) {
    return (
      <p className="ml-auto text-xs text-muted" data-testid="auth-unavailable">
        Sin proveedor de identidad: nadie verifica quien realiza las peticiones
      </p>
    )
  }

  if (subject === null) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/register"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-ink"
          data-testid="sign-up"
        >
          Crear cuenta
        </Link>
        <Link
          to="/login"
          className="rounded-md bg-brand px-3 py-1.5 text-sm text-brand-ink"
          data-testid="sign-in"
        >
          Iniciar sesion
        </Link>
      </div>
    )
  }

  const initial = (displayName ?? email ?? subject).charAt(0).toUpperCase()
  const userHandle =
    email !== null
      ? `@${email.split('@')[0] ?? ''}`
      : `@${(displayName ?? 'jugador').toLowerCase().replace(/\s+/g, '_')}`

  const handleLogout = async (): Promise<void> => {
    setIsOpen(false)
    await signOut()
    void navigate('/login')
  }

  return (
    <div className="relative ml-auto" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Menú de cuenta"
        onClick={() => {
          setIsOpen((prev) => !prev)
        }}
        className="flex items-center gap-2 rounded-lg border border-brand/60 bg-brand/12 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-brand/20"
        data-testid="user-menu-trigger"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-ink"
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="text-sm font-medium text-ink">Mi cuenta</span>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Opciones de cuenta"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-surface-raised py-1 shadow-2xl backdrop-blur-md"
          data-testid="user-menu-dropdown"
        >
          {/* Cabecera del usuario */}
          <div className="flex items-center gap-3 border-b border-border p-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand/70 text-sm font-bold text-brand-ink shadow-inner"
              aria-hidden="true"
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {displayName ?? 'Jugador Nexus'}
              </p>
              <p className="truncate text-xs text-muted">{userHandle}</p>
              {role !== null && (
                <span className="mt-0.5 inline-block rounded-full bg-brand/20 px-1.5 py-0.2 text-[10px] font-medium text-brand">
                  {roleLabel(role)}
                </span>
              )}
            </div>
          </div>

          {/* Opciones de navegacion */}
          <div className="py-1">
            <Link
              to="/account"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-brand/10"
            >
              <User className="h-5 w-5 text-muted" aria-hidden="true" />
              <span>Mi cuenta</span>
            </Link>
            <Link
              to="/inventory"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-brand/10"
            >
              <Package className="h-5 w-5 text-muted" aria-hidden="true" />
              <span>Mi inventario</span>
            </Link>
          </div>

          {/* Divisor */}
          <div className="mx-3 my-1 h-px bg-border" aria-hidden="true" />

          {/* Accion de cierre de sesion (HU-03 / Figma) */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void handleLogout()
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            data-testid="logout-button"
          >
            <LogOut className="h-5 w-5 text-danger" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  )
}
