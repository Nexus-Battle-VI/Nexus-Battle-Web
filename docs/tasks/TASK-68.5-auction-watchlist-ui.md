# TASK 68.5 — Interfaz de seguimiento y aceptación

Historia: HU-68 — Lista de seguimiento de subastas.  
Referencia: `Refs Nexus-Battle-VI/Nexus-Battle-Management#53`.

## Resultado funcional

La ruta `/auction` dejó de ser un marcador y ahora permite al jugador:

- Seguir una subasta mediante su identificador.
- Consultar las subastas seguidas y sus datos vigentes.
- Dejar de seguir una subasta.
- Reconocer avisos de cambio de puja y cierre próximo en el historial de Notifications.

La vista incluye estados de carga, lista vacía, error de consulta y errores controlados para duplicados o subastas inexistentes, cerradas o vencidas.

## Arquitectura

- `api.ts` concentra el contrato HTTP real de Auction.
- `useWatchlist.ts` administra consultas, mutaciones e invalidación mediante React Query.
- `AuctionPage.tsx` contiene únicamente estado de formulario y presentación.
- `contract.ts` tipa las respuestas sin duplicar reglas de dominio del backend.
- La clave de caché se registra en `shared/query-keys.ts`.

La identidad no se envía como parámetro: el cliente HTTP adjunta el JWT y Auction obtiene el jugador desde el testimonio.

## TDD: Red → Green → Refactor

1. **Red:** `AuctionPage.test.tsx` se creó antes de la pantalla y falló por ausencia del módulo.
2. **Green:** se añadieron contrato, cliente, hook, pantalla y ruta.
3. **Refactor:** se centralizó la invalidación de caché y la traducción de errores HTTP.

Los casos de aceptación verifican lista vacía, renderizado, baja con refresco y mensaje controlado cuando una subasta no puede seguirse.

## Validación final

| Verificación                  |                  Resultado |
| ----------------------------- | -------------------------: |
| Suite completa                | 2125 aprobadas, 0 fallidas |
| Sentencias                    |                    88,19 % |
| Ramas                         |                    84,99 % |
| Funciones                     |                    86,01 % |
| Líneas                        |                    88,52 % |
| TypeScript, ESLint y Prettier |                  Aprobados |

Todas las métricas superan RNF-16 (80 %).

## Changelog / Registro de cambios

### Archivos creados

- `src/features/auction/contract.ts`
- `src/features/auction/api.ts`
- `src/features/auction/useWatchlist.ts`
- `src/features/auction/AuctionPage.tsx`
- `src/features/auction/AuctionPage.test.tsx`

### Archivos modificados

- Rutas para activar `/auction`.
- Claves compartidas de React Query.
- Contrato y badge de Notifications para `AUCTION_CHANGED` y `AUCTION_CLOSING_SOON`.

Commit: `feat(web): add auction watchlist experience #TASK-68.5`.  
PR: https://github.com/Nexus-Battle-VI/Nexus-Battle-Web/pull/125
