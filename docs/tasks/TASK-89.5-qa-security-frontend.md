# TASK 89.5 — QA / Security frontend de HU-89

## Objetivo

Validar el aislamiento de la interfaz personal creada en TASK 89.4 y su integración con los contratos reales de Auction. Esta tarea añade pruebas y documentación; no crea endpoints, reglas de autorización ni una segunda implementación de HU-68, HU-69 o HU-90.

## Matriz de seguridad

| Escenario                         | Evidencia                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| Actividad del usuario autenticado | Todas las consultas usan `httpClient`; el token se obtiene de la sesión al iniciar cada petición. |
| Cambio de Usuario A a Usuario B   | El contenido de A desaparece antes de resolver la petición de B.                                  |
| Caché privada entre sesiones      | `SessionQueryProvider` se remonta por `subject`, cancela consultas y limpia React Query.          |
| Respuesta tardía de A             | El `AbortSignal` queda cancelado y la respuesta no aparece después de montar la sesión B.         |
| Respuestas `401` y `403`          | Las cuatro secciones muestran alertas y no conservan datos privados.                              |
| Identificadores externos          | Los clientes no envían `userId`, `playerId`, `sellerId` ni `bidderId`.                            |
| Watchlist y Pending Claims        | Se reutilizan sus clientes y rutas actuales; ambos reciben el token vigente de A y luego de B.    |
| Cancelación HU-90                 | El panel solo navega al detalle cuando `actions.cancel` lo permite; no invoca `/cancel`.          |
| Estadísticas no disponibles       | Se muestra `AUTHORITATIVE_SOURCE_NOT_CONFIGURED` como indisponibilidad, sin presentar `0`.        |
| Regresión                         | Se ejecutan pruebas completas, cobertura, lint, formato, typecheck, build y `git diff --check`.   |

## Arquitectura validada

- `App.tsx` usa `<SessionQueryProvider key={subject ?? 'signed-out'}>` para crear una frontera de caché por identidad.
- El cleanup de `SessionQueryProvider` cancela consultas activas y ejecuta `queryClient.clear()`.
- `httpClient` consulta `currentAccessToken()` para cada petición; no captura un token antiguo al construir el singleton.
- Las claves de actividad no contienen datos de identidad porque el cliente completo se reemplaza al cambiar de sesión.
- Watchlist permanece en `/auction/watchlist` y Pending Claims en `/auction/pending-claims`.
- La autoridad de identidad y permisos continúa en Auction; la interfaz solo representa las respuestas `401` y `403`.

## Archivos de prueba

- `src/features/auction/activity/AuctionActivitySecurity.test.tsx`: cambio de sesión, caché, respuestas tardías, tokens vigentes, reutilización y errores de autorización.
- `src/features/auction/activity/api.test.ts`: contratos de actividad sin identificadores externos.
- `src/features/auction/activity/AuctionActivityPage.test.tsx`: navegación a HU-68/HU-69, indisponibilidad de métricas y delegación de cancelación.
- `src/app/SessionQueryProvider.test.tsx`: control transversal de purga y cancelación de caché privada.

## Resultados

| Control                                        | Resultado                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Pruebas específicas de seguridad e integración | 5 archivos y 18 pruebas aprobadas                                       |
| `npm test`                                     | 246 archivos y 3050 pruebas aprobadas                                   |
| `npm run test:coverage`                        | 90.39 % statements, 84.09 % branches, 86.43 % functions y 90.60 % lines |
| `npm run typecheck`                            | Aprobado, sin errores                                                   |
| `npm run lint`                                 | Aprobado, sin hallazgos                                                 |
| `npm run format:check`                         | Aprobado, sin diferencias                                               |
| `npm run build`                                | Aprobado; 194 archivos de producción sin marcadores DEV                 |
| `git diff --check`                             | Aprobado, sin errores de espacios                                       |

Vitest emite avisos conocidos de JSDOM porque no implementa `HTMLCanvasElement.getContext` sin el paquete opcional `canvas`. Estos avisos no afectan el resultado y las 3050 pruebas terminan en verde.

## Changelog / Registro de cambios

- Añadida una suite de seguridad específica del panel personal.
- Ampliada la prueba de contratos para cubrir los cuatro nombres de identidad prohibidos.
- Demostrado que el enlace de cancelación no ejecuta una operación desde el panel.
- Documentada la relación con TASK 89.4 y los límites de HU-68, HU-69 y HU-90.

Commit propuesto: `test(web): validate HU-89 session isolation and security`

Trazabilidad: `Refs Nexus-Battle-VI/Nexus-Battle-Management#520` y `Closes Nexus-Battle-VI/Nexus-Battle-Management#548`.
