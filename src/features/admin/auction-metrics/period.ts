import type { TrendGranularity } from './types'

export type RangePreset = '30' | '7' | '90' | 'custom'

export const DAY_MS = 86_400_000
/** Contrato `hu-91.v1` §4: el periodo no puede superar 366 dias. */
export const MAX_SPAN_DAYS = 366
/** Contrato `hu-91.v1` §4.5: con `DAY` el periodo no puede superar 92 dias. */
export const MAX_DAILY_SPAN_DAYS = 92

export const DEFAULT_PRESET = '30' as const satisfies RangePreset
export const DEFAULT_GRANULARITY: TrendGranularity = 'WEEK'

/** Lo que muestran los controles: fechas `YYYY-MM-DD` (UTC) y el rango elegido. */
export interface PeriodDraft {
  readonly preset: RangePreset
  readonly from: string
  readonly to: string
}

/** Lo que viaja al servicio: instantes ISO-8601 con zona. */
export interface ResolvedPeriod {
  readonly from: string
  readonly to: string
}

const presetDays = (preset: Exclude<RangePreset, 'custom'>): number => Number(preset)

export const toDateInput = (instant: Date): string => instant.toISOString().slice(0, 10)

/** Borrador de un rango predefinido: termina hoy (UTC) y retrocede N dias. */
export const presetDraft = (preset: Exclude<RangePreset, 'custom'>, now: Date): PeriodDraft => ({
  preset,
  from: toDateInput(new Date(now.getTime() - presetDays(preset) * DAY_MS)),
  to: toDateInput(now),
})

/** `YYYY-MM-DD` estricto y calendario real: rechaza vacio y fechas imposibles (30 de febrero). */
const parseDateInput = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return null
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)

  return Number.isNaN(parsed.getTime()) || toDateInput(parsed) !== value ? null : parsed
}

/** Rango predefinido: termina en el instante `now` y retrocede N dias. Nunca es invalido. */
export const presetPeriod = (
  preset: Exclude<RangePreset, 'custom'>,
  now: Date,
): ResolvedPeriod => ({
  from: new Date(now.getTime() - presetDays(preset) * DAY_MS).toISOString(),
  to: now.toISOString(),
})

/**
 * Periodo a consultar, o `null` si el borrador es invalido (mismas reglas que Auction:
 * `desde < hasta` y a lo sumo 366 dias).
 *
 * Un rango predefinido termina en el instante actual: asi "Actualizar" trae tambien lo
 * ocurrido desde la consulta anterior. Uno personalizado usa las fechas tal cual, con
 * `hasta` exclusivo (`[from, to)`), como el contrato.
 */
export const resolvePeriod = (draft: PeriodDraft, now: Date): ResolvedPeriod | null => {
  if (draft.preset !== 'custom') {
    return presetPeriod(draft.preset, now)
  }

  const from = parseDateInput(draft.from)
  const to = parseDateInput(draft.to)

  if (from === null || to === null || from.getTime() >= to.getTime()) {
    return null
  }

  if (to.getTime() - from.getTime() > MAX_SPAN_DAYS * DAY_MS) {
    return null
  }

  return { from: from.toISOString(), to: to.toISOString() }
}

export const spanInDays = (period: ResolvedPeriod): number =>
  (new Date(period.to).getTime() - new Date(period.from).getTime()) / DAY_MS

/** `DAY` solo se admite hasta 92 dias; semana y mes sirven para cualquier periodo valido. */
export const allowsDailyGranularity = (period: ResolvedPeriod): boolean =>
  spanInDays(period) <= MAX_DAILY_SPAN_DAYS
