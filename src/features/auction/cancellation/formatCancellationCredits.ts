import { formatDecimal } from '@/shared/i18n/format'

/** Preserva medios creditos: nunca usa los formateadores enteros de pujas/compras. */
export const formatCancellationCredits = (
  t: (key: string, options: { count: number; value: string }) => string,
  credits: number,
): string => t('common:count.credits', { count: credits, value: formatDecimal(credits, 1) })
