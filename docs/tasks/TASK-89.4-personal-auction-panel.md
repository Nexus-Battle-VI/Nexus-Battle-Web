# TASK 89.4 — Panel personal de actividad de subastas

## Resultado

El jugador autenticado dispone de un panel responsive con cuatro secciones independientes:

1. **Mis subastas:** estado, producto, precios, puja vigente, cantidad de pujas, cierre y acciones proporcionadas por Auction.
2. **Mis pujas:** oferta propia, oferta vigente y estado `LEADING`, `OUTBID`, `WON` o `LOST`.
3. **Historial:** tipo, referencia, fecha, estado y valor original de cada operación.
4. **Estadísticas disponibles:** presenta métricas reales o la indisponibilidad declarada por Auction.

Los listados respetan la paginación del backend. Ninguna petición acepta `userId` o `playerId`; el titular se resuelve desde el token en Auction.

## Reutilización

- Watchlist continúa en `/auction/watchlist` y usa la implementación de HU-68.
- Pending Claims continúa en `/auction/pending-claims` y usa la implementación de HU-69.
- Cancelación se delega al flujo de HU-90 mediante un enlace condicionado por `actions.cancel`.

## Pruebas

- Contratos HTTP y ausencia de identificadores de usuario.
- Estados de carga, error, vacío y contenido.
- Fallo aislado por sección.
- Acción de cancelación presente y ausente según el contrato.
- Paginación remota y ruta protegida del panel.
- Completitud de i18n para cuatro idiomas.

### Resultados

- Suite completa: 243 archivos y 3026 pruebas aprobadas.
- Cobertura global: 90.42 % statements, 84.05 % branches, 86.46 % functions y 90.62 % lines.
- `lint`, `typecheck`, `format:check`, `build` y `git diff --check`: aprobados.
- Build verificado con 194 archivos de producción libres de marcadores DEV.

## Changelog / Registro de cambios

- Creados `activity/api.ts`, `AuctionActivityPage.tsx` y sus pruebas.
- Extendidas las claves de React Query, routing y navegación contextual de Auction.
- Actualizados los cuatro archivos `auction.json` de i18n.
- Creada la documentación y trazabilidad de HU-89.

Commit propuesto: `feat(web): add personal auction activity panel HU-89`

Trazabilidad: `Refs Nexus-Battle-VI/Nexus-Battle-Management#520` y `Closes Nexus-Battle-VI/Nexus-Battle-Management#547`.
