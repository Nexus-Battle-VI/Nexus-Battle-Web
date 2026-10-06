/** Parse a configured decimal price without floating point rounding/conversion. */
export const amountInMinorUnits = (input: string, minorUnit: number): number | null => {
  if (!Number.isInteger(minorUnit) || minorUnit < 0 || minorUnit > 6) return null
  const clean = input.trim().replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/u.test(clean)) return null
  const [whole = '', fraction = ''] = clean.split('.')
  if (fraction.length > minorUnit) return null
  const value = Number(whole + fraction.padEnd(minorUnit, '0'))
  return Number.isSafeInteger(value) && value > 0 ? value : null
}
