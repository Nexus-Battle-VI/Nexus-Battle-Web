# Evidencia HU-45.5 — Portal de privacidad y portabilidad

Validación final de Web realizada el 2026-09-09 sobre la rama
`test/hu-45-5-validacion-final-privacidad`. Alcance: HU-45
(`Nexus-Battle-Management#39`) y validación Web de la Task #140. Esta evidencia no incorpora
capturas, no declara inspección manual en navegador y no presenta fixtures o previews DEV como
pruebas E2E desplegadas.

## Auditoría y contratos vigentes

Se revisaron `AGENTS.md`, `CONTRIBUTING.md` y `README.md`. El repositorio Web no contiene un
`AGENTS.md` propio; se aplicaron las reglas entregadas para la tarea y las convenciones del
repositorio. También se revisaron:

- `src/features/account/PrivacySection.tsx` y sus pruebas;
- `src/features/account/api.ts` y sus pruebas;
- `src/features/account/useOwnAccount.ts` y `useOwnPersonalData.test.tsx`;
- las rutas de cuenta, la protección global `RequireSession` y sus pruebas de ruta;
- `src/lib/http.ts` y sus pruebas de descarga y Bearer;
- el preview DEV de cuenta, que está separado de las rutas productivas;
- los controladores, casos de uso y pruebas automatizadas vigentes de Account, solo en lectura.

Web consume exactamente estos contratos de Account:

| Operación               | Solicitud Web                                     | Contrato de Account                        |
| ----------------------- | ------------------------------------------------- | ------------------------------------------ |
| Consultar datos propios | `GET /api/accounts/me/privacy`                    | `AccountsController.findOwnPersonalData`   |
| Exportar JSON           | `GET /api/accounts/me/privacy/export?format=json` | `AccountsController.exportOwnPersonalData` |
| Exportar XML            | `GET /api/accounts/me/privacy/export?format=xml`  | `AccountsController.exportOwnPersonalData` |
| Descargar PDF           | `GET /api/accounts/me/privacy/export?format=pdf`  | `AccountsController.exportOwnPersonalData` |

El prefijo `/api` lo agrega `HttpClient`; las funciones de privacidad reciben únicamente el formato.
Ninguna solicitud del portal recibe, serializa o envía `accountId`, `customerId`, `subject`,
`ownerId` o `userId`. `HttpClient` obtiene el testimonio vigente de `useSession` en cada solicitud y
lo envía como `Authorization: Bearer …`. Las consultas y exportaciones son `GET` sin body.

La ruta productiva `/account/privacy` está dentro de `RequireSession`. Una prueba específica confirma
que, sin sujeto de sesión, el portal y sus acciones no se montan y no se realiza ninguna petición.
Esta puerta mejora la experiencia, pero no se presenta como autorización definitiva: Account valida
el testimonio y resuelve al titular desde su `subject` verificado. Sus pruebas HTTP rechazan ausencia o
invalidez del testimonio, rechazan selectores de otro titular y comprueban aislamiento A/B.

El preview de desarrollo existente usa componentes reales con datos sintéticos bajo rutas que solo se
incluyen con `import.meta.env.DEV`. No forma parte de esta evidencia de aceptación ni del bundle
productivo.

## Evidencia automatizada de Web

`PrivacySection.test.tsx` comprueba:

- loading accesible mediante `role="status"`;
- render de la proyección propia y ausencia de identificadores o datos inventados;
- ausencia de selector de otro titular;
- errores de consulta 401 y genérico con mensajes seguros;
- acciones JSON, XML y PDF visibles, habilitadas y con nombres accesibles;
- entrega del `Blob` real a la descarga y confirmación solo después del guardado;
- estado pendiente con `aria-busy`, botones deshabilitados y prevención de doble solicitud;
- errores independientes de JSON, XML y PDF sin falsa confirmación;
- tratamiento seguro y reintento del PDF ante 503.

`api.test.ts`, `useOwnPersonalData.test.tsx` y `http.test.ts` comprueban:

- rutas relativas del contrato y URL finales bajo `/api`;
- método `GET`, `AbortSignal`, ausencia de body y ausencia de selectores de titular;
- Bearer obtenido de la sesión en las solicitudes reales de JSON, XML y PDF;
- conservación del Blob, media type y nombre de `Content-Disposition`;
- fallbacks de nombre por formato, creación de la descarga y liberación de la Object URL;
- propagación de errores HTTP sin convertir una respuesta fallida en una descarga.

`routes.test.tsx` comprueba específicamente que una persona sin sesión no puede montar ni usar
`/account/privacy`, no ve botones de exportación y no origina llamadas HTTP.

El frontend no ofrece operaciones de edición dentro de la consulta/exportación ni altera la respuesta.
Las cuatro operaciones son lecturas HTTP. La no mutación de cuentas y fuentes queda además comprobada
en las pruebas de integración de Account.

## Responsabilidad del PDF

Web solicita y descarga el PDF producido por Account. No consulta ni reconstruye inventario,
estadísticas, comentarios o historial de transacciones. La única llamada de Web es al endpoint de
exportación con `format=pdf`.

Account conserva la responsabilidad de generar el documento y de componer, para el titular resuelto
desde el testimonio:

- inventario;
- estadísticas;
- comentarios;
- historial de transacciones.

Esto está cubierto en Account por `account-self-service-http.spec.ts`,
`generate-privacy-pdf-report.spec.ts`, `pdf-kit-privacy-report-renderer.spec.ts` y los adaptadores de
reporte. Las pruebas verifican las cuatro fuentes, aislamiento A/B, ausencia de selectores, no mutación
y degradación independiente.

## Matriz final CA-01 a CA-05

| CA                               | Evidencia Web                                                                                                                                                                                                          | Evidencia Account                                                                                                                                                                                                                                                 | Resultado |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| CA-01 — Consulta propia          | Render de la proyección privacy, loading, 401, error seguro y ausencia de selector o ID técnico (`PrivacySection.test.tsx`, `useOwnPersonalData.test.tsx`, `routes.test.tsx`)                                          | `GET /api/accounts/me/privacy`, resolución por `subject`, aislamiento y 401/404 (`account-self-service-http.spec.ts`, `get-own-personal-data.spec.ts`)                                                                                                            | PASS      |
| CA-02 — JSON                     | Acción visible; llamada GET exacta con Bearer, sin body/selectores; Blob, filename, descarga, éxito y error (`PrivacySection.test.tsx`, `api.test.ts`, `http.test.ts`)                                                 | Exportación JSON desde la proyección propia, serialización y no mutación (`account-self-service-http.spec.ts`, `portable-personal-data-export.spec.ts`)                                                                                                           | PASS      |
| CA-03 — XML                      | Acción visible; llamada GET exacta con Bearer, sin body/selectores; Blob, filename, descarga, éxito y error (`PrivacySection.test.tsx`, `api.test.ts`, `http.test.ts`)                                                 | Exportación XML equivalente a JSON, aislamiento y no mutación (`account-self-service-http.spec.ts`, `portable-personal-data-export.spec.ts`)                                                                                                                      | PASS      |
| CA-04 — PDF                      | Web llama únicamente `/accounts/me/privacy/export?format=pdf`, descarga el Blob y cubre pending, 503, error, reintento y doble clic; no reconstruye categorías                                                         | Account genera el PDF con inventario, estadísticas, comentarios e historial de transacciones, con aislamiento y degradación independiente (`account-self-service-http.spec.ts`, `generate-privacy-pdf-report.spec.ts`, `pdf-kit-privacy-report-renderer.spec.ts`) | PASS      |
| CA-05 — Titularidad y protección | Sin `accountId`, `customerId` o `subject`; Bearer de sesión; `RequireSession` evita uso anónimo y las respuestas 401 no filtran detalles (`api.test.ts`, `routes.test.tsx`, `PrivacySection.test.tsx`, `http.test.ts`) | Account valida el testimonio, rechaza selectores y rutas por ID, y resuelve exclusivamente el sujeto verificado (`account-self-service-http.spec.ts`)                                                                                                             | PASS      |

CA-01 a CA-05 quedan cubiertos por pruebas automatizadas de interfaz/componentes, cliente API y
contratos reales. No se usa una captura como sustituto de comportamiento reproducible.

## Gates de Web

Se ejecutaron los gates definidos por el repositorio sobre esta rama:

| Gate                    | Resultado                                                              |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm run format`        | PASS                                                                   |
| `npm run format:check`  | PASS — todos los archivos cumplen Prettier                             |
| `npm run lint`          | PASS                                                                   |
| `npm run typecheck`     | PASS — TypeScript 7, sin emisión                                       |
| `npm run test`          | PASS — 105 archivos, 850 pruebas                                       |
| `npm run test:coverage` | PASS — 105 archivos, 850 pruebas; supera todos los umbrales            |
| `npm run build`         | PASS — 2129 módulos; bundle verificado, 16 archivos sin marcadores DEV |
| `git diff --check`      | PASS — sin errores de whitespace                                       |

La ejecución focal previa fue `3` archivos y `74` pruebas aprobadas.

Cobertura global V8:

| Métrica    | Cobertura          |
| ---------- | ------------------ |
| Statements | 87.17% (3221/3695) |
| Branches   | 81.58% (2229/2732) |
| Functions  | 85.68% (898/1048)  |
| Lines      | 87.38% (3082/3527) |

Vitest/jsdom informó que `HTMLCanvasElement.getContext()` no está implementado sin el paquete
opcional de canvas. Es un aviso conocido de las pruebas de recursos visuales; no falló ninguna prueba
ni gate y no se instaló ninguna dependencia.

## Evidencia visual y requisito documental externo

La evidencia visual se sustituye por pruebas reproducibles de interfaz/componentes que consultan por
roles y nombres accesibles, verifican contenido, estados y acciones observables. No se tomaron ni se
solicitan capturas y no se afirma que se haya inspeccionado un navegador real.

La copia local disponible de Management no contiene el cuerpo literal de las Issues #39 y #140; sus
documentos versionados no muestran un requisito de captura para HU-45. No fue posible consultar el
cuerpo remoto porque `gh` no está instalado y las Issues no son públicas. Por tanto, esta validación
no inventa ese requisito. Si Management exige literalmente una captura como artefacto obligatorio,
se clasifica como **PENDIENTE DOCUMENTAL EXTERNO, no defecto funcional**.

La Task #244 de diagramas UML se conserva en la trazabilidad de HU-45, pero no se reimplementa ni se
declara validada por pruebas de Web: su estado administrativo debe confirmarse en Management al cerrar
la HU. No afecta la validación funcional del portal realizada aquí.

## Veredicto

Con todos los gates funcionales y técnicos en verde, el veredicto de Web es **A. HU-45 COMPLETA Y
LISTA PARA PR FINAL DE EVIDENCIA/VALIDACIÓN WEB**. Después del PR y merge de esta evidencia, HU-45
puede pasar a Done en su alcance funcional, sujeto únicamente a que Management confirme el estado
administrativo de sus Tasks. No existe un defecto funcional conocido. No se realizaron commit, push,
PR, merge ni cierres de Issues.
