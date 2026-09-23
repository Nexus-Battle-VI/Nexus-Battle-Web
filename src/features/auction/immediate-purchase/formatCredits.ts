const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g

/** `2500` -> `2.500 créditos`. Agrupacion fija: no depende del locale del navegador. */
export const formatCredits = (amount: number): string =>
  `${Math.trunc(amount).toString().replace(THOUSANDS, '.')} créditos`
