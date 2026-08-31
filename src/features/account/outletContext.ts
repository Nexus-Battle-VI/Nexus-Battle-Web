import { useOutletContext } from 'react-router'

import type { OwnAccount } from './api'

/**
 * Puente entre `AccountPage` -que resuelve `GET /api/accounts/me` una sola vez y
 * gestiona carga/error/sesion- y las secciones que necesitan la cuenta ya
 * cargada. Evita que cada seccion vuelva a consultar y a repetir esos estados.
 */
export interface AccountOutletContext {
  readonly account: OwnAccount
}

export const useAccountContext = (): AccountOutletContext =>
  useOutletContext<AccountOutletContext>()
