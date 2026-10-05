# Torneo: registro, confirmación, llaves y consulta v2

Contrato consumido: `torneos-hu77-84-78-hu83-v2.0.0`, congelado por Coordinación el 5 de octubre de 2026. Este incremento local de Web implementa HU-77/HU-84/HU-78 y conserva las lecturas publicadas de HU-83. No acredita aceptación funcional.

## Recorrido

`/tournament` monta la pantalla autenticada en desarrollo y producción. `/tournament/registration` redirige a ella. Se conservan navegación, inventario, subastas y aislamiento de sesión de develop d83b35d.

A comparte con B el código de sujeto visible en Torneo, registra nombre, compañero y referencia al avatar de una de las dos cuentas. Account valida nombre/avatar; Web descarga la imagen con httpClient autenticado y muestra ausencia/error con reintento. El JWT identifica al creador; ningún campo del formulario lo sustituye. No se seleccionan héroes en el registro.

B abre el mismo torneo desde su cuenta y acepta exactamente el registro mostrado, o lo rechaza. El creador puede confirmar una inscripción gratuita o elegir los métodos pagados que devuelve entryPolicy. Los precios en créditos y moneda simulada se muestran con sus unidades y precisión configuradas, sin conversión. No se fija una tarifa de producción.

El servidor devuelve capacidad confirmada, reservada y disponible. Web no cuenta equipos para calcular plazas ni deriva saldos. Un registro o una reserva pendiente no se presenta como inscripción confirmada. Los identificadores de comprobante de registro, pago e inscripción son los recibidos del servidor y se muestran por separado. La confirmación gratuita no afirma un pago financiero.

Las llaves requieren ocho confirmaciones humanas. El botón de publicación solo aparece para administrador/superadministrador, con el servidor como autoridad. El cliente muestra los dos árboles, una final, orígenes y destinos del snapshot recibido; no genera un grafo de producto, héroes, salas o ganadores. TEAMS_RESOLVED se describe como preparación pendiente.

HU-83 conserva lista array y detalle con teams/result/events y cursor. Se utiliza matchId completo recibido, codificado en URL, y bracketLabel como etiqueta. Se preservan estados WAITING_PARTICIPANTS, READY, IN_PROGRESS y FINISHED. Los metadatos aditivos pueden faltar en registros históricos. El historial pagina más de 100 eventos y no depende de vídeo o emisión. La consulta no prepara, inicia ni sincroniza combates mediante comandos nuevos.

## Reintentos y feedback

Antes de enviar se guarda en sessionStorage una intención limitada a operationId, huella de negocio y fase. El namespace incorpora sujeto, torneo, acción y equipo. No se guardan JWT, tarjeta, CVV, saldo ni datos del proveedor. Los conflictos 409, timeouts (incluido 408), 503, límites de peticiones y fallos de sesión conservan la operación y bloquean un cambio de intención. Solo una corrección explícita tras un rechazo definitivo documentado (400/404/422) abre un ID nuevo. El simulador ya resuelto se puede recuperar sin tarjeta; si una petición no alcanzó a persistirse y el servidor rechaza la falta de datos, el usuario corrige y abre otro intento según el contrato.

La reserva/compensación iniciada en otra pestaña o dispositivo se consulta mientras el servidor reconcilia; esta pantalla no inventa otra intención de cobro. Cancelar y sustituir solo se ofrecen antes del pago. Después de un cancelado, hay histórico y un registro nuevo, con consentimiento nuevo.

Los estados de éxito se derivan del DTO vigente. Los errores de mutación quedan ligados al estado sobre el que ocurrieron, y desaparecen al cambiar ese estado, torneo o sesión. Un error de lectura conserva la información disponible pero bloquea nuevas mutaciones hasta actualizarla. Las consultas se aíslan por sujeto/torneo; el desmontaje impide mostrar respuestas de avatares o detalles anteriores.

## Desarrollo y verificación

- `/__dev/tournament`: demo histórica trasladada selectivamente a dev/legacy, con fixtures explícitos. No consume v2 ni acredita integración; el original de P2 permanece intacto.
- `/__dev/tournament/local`: alias de esa demo.
- `/__dev/tournament/registration`: componentes actuales con APIs de prueba e identidad de preview; no cambia la sesión real ni lee servicios reales. Los importes y resultados de ese adaptador son datos de prueba.

El guard de build busca rutas, componentes, gateway y marcadores de fixture en dist, incluidos sourcemaps. Los archivos de evidencia están en .tmp/verification; solo .tmp queda excluido de ESLint/Prettier. src conserva sus controles. Las pruebas de componentes no son sesiones Cognito.

Comandos de verificación: npm test (componentes/rutas/adaptadores), npm run test:coverage, npm run lint, npm run format:check y npm run build. El resultado exacto y la revisión del checkout se registran en estado-web.json; no se copian resultados históricos.

## Dependencias y validación pendiente

QA debe combinar las entregas de Account, Wallet y Tournament y recorrer dos sesiones Cognito reales y administrador: avatar real, validación del nombre, consentimiento, cobro/compensación, octavo cupo concurrente, publicación y justas/eventos de Combat. Los mocks no prueban persistencia, migraciones, concurrencia entre servicios ni autorización real del servidor. Las tarifas/moneda operativas y revisión funcional de la tabla E1–E13/Final siguen pendientes; no se implementa el avance HU-80.

El documento de sprint del 30 de septiembre contradice HU-78 al rellenar con IA y depender de JcE; también presupone que Account no cambia y que Tournament aún no tiene rutas de negocio. Se utiliza el alcance vigente y el contrato común, manteniendo estas contradicciones registradas. Emisión y premios permanecen fuera de este incremento.

No se ha autorizado push, PR, merge remoto, cierre de historias ni despliegue.
