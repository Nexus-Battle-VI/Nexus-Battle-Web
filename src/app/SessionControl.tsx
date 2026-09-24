import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/shared/session'
import { primaryRole, roleLabel } from '@/shared/rbac'
import { ChevronDown, LogOut, Package, User } from '@/components/ui/icons'
import { Avatar } from '@/components/ui/Avatar'
import { useOwnAccount } from '@/features/account/useOwnAccount'
import { useAccountLanguageSync } from '@/shared/i18n/useAccountLanguageSync'

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
export const SessionControl = (): React.JSX.Element | null => {
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
  // Sin sesion no hay testimonio: la consulta se desactiva en lugar de
  // producir un 401 predecible (ver `useOwnAccount`).
  const account = useOwnAccount({ enabled: subject !== null })
  // Reutiliza la MISMA consulta de la cuenta (ninguna peticion extra): si la
  // cuenta tiene un idioma guardado, manda sobre el espejo local.
  useAccountLanguageSync(subject, account.data?.preferredLanguage)
  const { t } = useTranslation()

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

  // Sin proveedor de identidad configurado no hay sesion posible: un boton de
  // "Iniciar sesion" aqui no podria funcionar. En vez de ofrecer algo roto, o
  // un aviso que le resta espacio a la navegacion, no se renderiza nada.
  if (!available) {
    return null
  }

  if (subject === null) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/register"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-ink"
          data-testid="sign-up"
        >
          {t('app:session.signUp')}
        </Link>
        <Link
          to="/login"
          className="rounded-md bg-brand px-3 py-1.5 text-sm text-brand-ink"
          data-testid="sign-in"
        >
          {t('app:session.signIn')}
        </Link>
      </div>
    )
  }

  // Misma regla de siempre (una letra, del nombre visible o, en su defecto,
  // del correo o del sujeto): HU-15.3 solo anade la imagen real por encima,
  // no cambia como se deriva la inicial de respaldo.
  const initials = (displayName ?? email ?? subject).charAt(0).toUpperCase()
  const avatarUrl = account.data?.avatarUrl ?? null
  const avatarAlt = displayName ?? email ?? subject
  const userHandle =
    email !== null
      ? `@${email.split('@')[0] ?? ''}`
      : `@${(displayName ?? t('app:session.fallbackHandle')).toLowerCase().replace(/\s+/g, '_')}`

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
        aria-label={t('app:session.menu')}
        onClick={() => {
          setIsOpen((prev) => !prev)
        }}
        className="flex items-center gap-2 rounded-lg border border-brand/60 bg-brand/12 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-brand/20"
        data-testid="user-menu-trigger"
      >
        <Avatar avatarUrl={avatarUrl} alt={avatarAlt} initials={initials} size="sm" />
        <span className="text-sm font-medium text-ink">{t('app:session.myAccount')}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={t('app:session.menuOptions')}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-surface-raised py-1 shadow-2xl backdrop-blur-md"
          data-testid="user-menu-dropdown"
        >
          {/* Cabecera del usuario */}
          <div className="flex items-center gap-3 border-b border-border p-3">
            <Avatar avatarUrl={avatarUrl} alt={avatarAlt} initials={initials} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {displayName ?? t('app:session.fallbackName')}
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
              <span>{t('app:session.myAccount')}</span>
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
              <span>{t('app:session.myInventory')}</span>
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
            <span>{t('app:session.signOut')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
