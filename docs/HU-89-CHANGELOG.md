# HU-89 — Panel personal de actividad de subastas

## Alcance de Web

TASK 89.4 incorpora `/auction/activity` como punto unificado para consultar publicaciones propias, participaciones en pujas, historial y disponibilidad de estadísticas. La pantalla consume los contratos privados de Auction y no envía identificadores de jugador.

El panel enlaza las rutas existentes `/auction/watchlist` (HU-68) y `/auction/pending-claims` (HU-69). No crea consultas, caches ni componentes alternativos para esas capacidades.

## Arquitectura

- `activity/api.ts` declara los modelos de lectura y utiliza exclusivamente `httpClient`.
- `AuctionActivityPage.tsx` mantiene una consulta React Query independiente por sección, con claves centralizadas en `queryKeys.auction.activity`.
- Cada sección distingue carga, error, vacío y contenido mediante `QueryState`.
- El backend conserva la autoridad sobre identidad, transacciones, estados de participación y disponibilidad de acciones.
- Las traducciones se incorporaron en español, inglés, francés y portugués.

## Contratos consumidos

| Método y ruta                                      | Uso                                                        |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `GET /v1/auctions/me/owned?page=&pageSize=`        | Mis subastas y acciones autorizadas.                       |
| `GET /v1/auctions/me/bids?page=&pageSize=`         | Mis participaciones sin identidad de terceros.             |
| `GET /v1/auctions/me/transactions?page=&pageSize=` | Historial autoritativo; Web no calcula movimientos.        |
| `GET /v1/auctions/me/view-statistics`              | Disponibilidad y métricas reales cuando exista una fuente. |

## Limitaciones explícitas

- Auction comunica `AUTHORITATIVE_SOURCE_NOT_CONFIGURED`; la interfaz muestra indisponibilidad y no interpreta `metrics: []` como cero visualizaciones.
- La cancelación pertenece a HU-90. El panel solo presenta el enlace al detalle con `?cancel=1` cuando Auction devuelve `actions.cancel: true`; no valida reglas ni ejecuta la cancelación.
- La documentación histórica de `CONTRIBUTING.md` describe `main` como única rama, mientras la estrategia autorizada para HU-89 usa `develop`. Esta rama se creó desde `origin/develop` y la PR se dirige a `develop` conforme a la instrucción vigente de la HU.

## Registro de cambios

- Creado el cliente de actividad y el panel personal.
- Añadida la ruta protegida `/auction/activity` y un acceso contextual desde el marketplace.
- Reutilizadas las rutas de Watchlist y Pending Claims.
- Añadidas pruebas de contrato, componentes, aislamiento, paginación y routing.
- No se añadieron dependencias ni persistencia en Web.

## Evidencia de validación

| Control                 | Resultado                                                               |
| ----------------------- | ----------------------------------------------------------------------- |
| `npm test`              | 243 archivos y 3026 pruebas aprobadas                                   |
| `npm run test:coverage` | 90.42 % statements, 84.05 % branches, 86.46 % functions y 90.62 % lines |
| `npm run lint`          | Aprobado, sin hallazgos                                                 |
| `npm run typecheck`     | Aprobado, sin errores                                                   |
| `npm run format:check`  | Aprobado, sin diferencias                                               |
| `npm run build`         | Aprobado; 194 archivos del bundle sin marcadores DEV                    |
| `git diff --check`      | Aprobado, sin errores de espacios                                       |

Vitest emite avisos conocidos de JSDOM porque no implementa `HTMLCanvasElement.getContext`
sin el paquete opcional `canvas`; estos avisos no causan fallos y las 3026 pruebas terminan en verde.

## TASK 89.5 — QA / Security frontend

La validación transversal demuestra que el panel y las capacidades reutilizadas permanecen asociadas a la sesión vigente:

- `App` remonta `SessionQueryProvider` con el `subject` autenticado como clave;
- al cambiar de identidad se cancelan las consultas, se elimina la caché y no se muestra información anterior durante la nueva carga;
- una respuesta tardía de la sesión anterior no puede repoblar el panel;
- los clientes de actividad, Watchlist y Pending Claims toman el token actual y no aceptan identificadores externos;
- los estados `401` y `403` se presentan como errores sin conservar contenido privado;
- el panel solo enlaza al flujo de cancelación de HU-90 y no llama su endpoint;
- la ausencia de estadísticas continúa mostrándose como indisponibilidad, nunca como cero.

La matriz y la evidencia están documentadas en
[`docs/tasks/TASK-89.5-qa-security-frontend.md`](tasks/TASK-89.5-qa-security-frontend.md).
