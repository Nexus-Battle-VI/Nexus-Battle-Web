/**
 * Estadísticas y logros del jugador — VIEW MODEL DE PRESENTACIÓN FRONTEND (HU-06.4).
 *
 * Estos tipos describen SÓLO lo que la vista necesita para pintar. **No son el
 * DTO del futuro backend** (HU-06.3 quedó diferida a un Sprint posterior: hoy no
 * existe bounded context, contrato ni endpoint de estadísticas/logros). Cuando
 * ese servicio exista, su contrato real vivirá en un `statistics/api.ts` y se
 * mapeará a estas formas en un único punto; hasta entonces no se congela aquí
 * ninguna decisión de dominio (ni `progressPercentage`, ni nivel, ni XP).
 *
 * RF-06 sólo autoriza representar: partidas jugadas, victorias y progreso
 * general. No se modelan derrotas, win rate, ranking, nivel, experiencia,
 * rarezas, puntos ni condiciones de desbloqueo.
 */

/**
 * Progreso general. RF-06 exige mostrarlo, pero HU-06.2 dejó pendiente la
 * definición funcional (fórmula, escala, relación con nivel/XP). Mientras no
 * exista esa definición, `kind: 'pending-definition'` es el único valor real; el
 * `summary` textual queda disponible para cuando el servicio entregue una
 * descripción ya aprobada, y nunca lleva porcentaje.
 */
export type GeneralProgress =
  { readonly kind: 'pending-definition' } | { readonly kind: 'summary'; readonly label: string }

export interface PlayerStatistics {
  /** `null` = el servicio existe pero aún no hay registros; distinto de "pendiente de servicio". */
  readonly gamesPlayed: number | null
  readonly wins: number | null
  readonly generalProgress: GeneralProgress
}

/**
 * Un logro YA obtenido. No hay logros bloqueados ni progreso de desbloqueo: la
 * lista sólo contiene reconocimientos conseguidos.
 */
export interface PlayerAchievement {
  readonly id: string
  readonly name: string
  readonly description?: string
  /** ISO 8601. Sólo para mostrar ("Obtenido el …"); la vista no calcula con él. */
  readonly obtainedAt?: string
}

/**
 * Estado de presentación del panel. Unión discriminada mínima: cubre los seis
 * estados de la referencia UX sin una máquina de estados. `Unauthorized` no está
 * aquí a propósito: cuando `GET /api/accounts/me` responde 401 lo resuelve el
 * shell `AccountPage` y esta sección ni se monta.
 */
export type StatisticsPanelState =
  | { readonly status: 'pending' }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message?: string }
  | {
      readonly status: 'ready'
      readonly statistics: PlayerStatistics
      readonly achievements: readonly PlayerAchievement[]
    }
