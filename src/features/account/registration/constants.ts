import { i18n } from '@/shared/i18n/i18n'
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
 * cuatro se muestran y las cuatro se responden. La etiqueta se traduce al
 * leerse (idioma activo); al backend solo viaja el `id` (ver `api.ts`).
 */
const securityQuestion = (id: string): SecurityQuestion => ({
  id,
  get label() {
    return i18n.t(`account:registration.questions.${id}`)
  },
})

export const SECURITY_QUESTIONS: readonly SecurityQuestion[] = [
  securityQuestion('first-pet'),
  securityQuestion('birth-city'),
  securityQuestion('childhood-nickname'),
  securityQuestion('parents-city'),
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
const legalDocument = (id: string, href: string | null): LegalDocument => ({
  id,
  href,
  get label() {
    return i18n.t(`account:registration.documents.${id}`)
  },
})

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  legalDocument('terms', null),
  legalDocument('privacy', '/assets/privacy-policy-v0.3.pdf'),
]
