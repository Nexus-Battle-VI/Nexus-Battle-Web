/**
 * Prefijo unico bajo el que viven todos los servicios.
 *
 * Vive en su propio modulo, y no dentro de `http.ts`, para romper un ciclo de
 * importacion real: `http.ts` importa `currentAccessToken` de `shared/session`,
 * asi que `session.ts` no puede importar nada de `http.ts` sin cerrar el
 * circulo. Este modulo no importa a nadie, de modo que ambos lados pueden
 * depender de el sin crear el ciclo.
 *
 * Existe para que el prefijo se declare UNA vez. El cierre de sesion (HU-03) lo
 * construia a mano (`'/api/sessions'`): si este valor cambiara, esa peticion
 * seguiria apuntando al sitio viejo y fallaria en silencio, justo en la
 * operacion que menos debe fallar sin avisar.
 */
export const API_BASE_URL = '/api'
