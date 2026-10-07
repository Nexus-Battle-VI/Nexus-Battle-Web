/** Configuration preview only; persisted encounter times always come from Tournament. */
export const calendarPreview = (firstOpening: string) => {
  const initial = new Date(firstOpening).getTime()
  if (!Number.isFinite(initial)) return []
  return Array.from({ length: 6 }, (_, index) => ({
    round: index + 1,
    opensAt: new Date(initial + index * 600000).toISOString(),
    closesAt: new Date(initial + index * 600000 + 120000).toISOString(),
    plannedStartAt: new Date(initial + index * 600000 + 120000).toISOString(),
  }))
}
