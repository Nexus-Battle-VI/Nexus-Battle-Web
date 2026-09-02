/**
 * Datos fijos de HU-01 — Registro de cuenta de jugador.
 */

export interface SecurityQuestion {
  readonly id: string
  readonly label: string
}

/**
 * Las cuatro preguntas de seguridad definidas para HU-01.
 *
 * Son fijas: no hay nada que elegir, por lo que tampoco hay desplegable. Las
 * cuatro se muestran y las cuatro se responden.
 */
export const SECURITY_QUESTIONS: readonly SecurityQuestion[] = [
  { id: 'first-pet', label: '¿Cuál era el nombre de tu primera mascota?' },
  { id: 'birth-city', label: '¿Cuál es el nombre de la ciudad donde naciste?' },
  { id: 'childhood-nickname', label: '¿Cuál era tu apodo de la infancia?' },
  { id: 'parents-city', label: '¿Cuál es el nombre de la ciudad donde se conocieron tus padres?' },
]

export interface LegalDocument {
  readonly id: string
  readonly label: string
  /** `null` significa que el documento **no existe todavia**, no que no haga falta. */
  readonly href: string | null
}

/**
 * Documentos legales enlazados desde la aceptacion.
 *
 * `terms` sigue en `null` a proposito: en este repositorio no hay ningun
 * documento de Terminos y Condiciones. Redactar aqui un texto legal inventado
 * seria peor que no tenerlo, porque pareceria vinculante.
 *
 * `privacy` SI tiene destino (EN-011, CA-01): abre el PDF real de la
 * Política, servido como asset estatico del build
 * (`public/assets/privacy-policy-v0.3.pdf`, generado desde el documento
 * fuente de Nexus-Battle-Infrastructure). No es una URL externa ni un enlace
 * a GitHub: el archivo viaja con el propio despliegue de Web.
 */
export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  { id: 'terms', label: 'Términos y Condiciones', href: null },
  { id: 'privacy', label: 'Política de Privacidad', href: '/assets/privacy-policy-v0.3.pdf' },
]
