/**
 * Etiqueta de rol que acompaña a cada héroe en el catálogo (diseño de HU-07).
 *
 * NO ES UNA REGLA DE NEGOCIO: es una ayuda de lectura para distinguir héroes de
 * un vistazo. El backend no publica "rol" y esta pantalla no inventa uno que
 * afecte a nada.
 *
 * EL MAPA NO ES UNA LISTA CERRADA DE OCHO. Los prototipos iniciales tienen la
 * etiqueta que el diseño aprobó —`GUERRERO_TANQUE` se lee «Tanque», no
 * «Guerrero»—, y cualquier subtipo que no esté aquí se resuelve derivándolo del
 * código. Así, un noveno héroe aprobado por administración se presenta con una
 * etiqueta razonable en lugar de con un hueco, y sin añadir una rama de código
 * por héroe (CA-11).
 */
const ROLE_BY_SUBTYPE: Readonly<Record<string, string>> = {
  GUERRERO_TANQUE: 'Tanque',
  GUERRERO_ARMAS: 'Guerrero',
  MAGO_FUEGO: 'Mago',
  MAGO_HIELO: 'Mago',
  PICARO_VENENO: 'Pícaro',
  PICARO_MACHETE: 'Pícaro',
  CHAMAN: 'Soporte',
  MEDICO: 'Soporte',
}

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

export const heroRoleLabel = (subtype: string): string => {
  const known = ROLE_BY_SUBTYPE[subtype.trim().toUpperCase()]

  if (known !== undefined) {
    return known
  }

  // Derivación: la primera palabra del código (`DRUIDA_BOSQUE` -> «Druida»).
  const [first] = subtype.trim().split('_')

  return first === undefined || first.length === 0 ? '—' : capitalize(first)
}
