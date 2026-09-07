# HU-41.10 — Integración visual final de moderación de comentarios

## Alcance implementado

Web#81 ya cubría la cola de moderación, `RequireModerator` y las cinco
acciones (aprobar, ocultar, eliminar, editar, marcar). HU-41.10
(Management#312) completa la integración visual una vez Community incorporó,
en HU-41.7/HU-41.8/HU-41.9, la detección automática de contenido, la
auditoría reforzada y el borrado físico:

1. **Acceso visible.** `admin/comments/moderation` entra en `NAVIGATION`
   (`src/routes/routes.tsx`) con `requiredPrimaryRole: 'MODERATOR'`. La
   jerarquía de `ADMINISTRATIVE_RANK` ubica `MODERATOR` por debajo de
   `ADMINISTRATOR`, así que Administrador y Super Administrador también lo
   ven; Jugador nunca. `RequireModerator` sigue siendo la única puerta de
   autorización real — el enlace de menú es solo descubrimiento.
2. **Origen de cada fila.** `ModerationQueueEntry` (`api.ts`) ahora refleja
   el DTO real de Community: `sources` (`'USER_REPORT' | 'AUTOMATIC_FILTER'`),
   `automaticFlagCount` y `lastAutomaticFlaggedAt`. `ModerationQueuePage`
   traduce ese arreglo a una o dos insignias ("Reportado por usuarios",
   "Detectado automáticamente") sin recalcular ni duplicar nada: si un
   comentario tiene ambos orígenes, Community ya entrega el arreglo con un
   único elemento por cada uno.
3. **Las cinco acciones se mantienen intactas.** Ninguna regla de
   moderación ni de detección se reimplementa en React.
4. **Eliminar refleja el borrado físico (HU-41.9).** A diferencia de
   aprobar/ocultar/editar/marcar -que solo actualizan la insignia de estado
   en el sitio, porque el comentario sigue existiendo-, un `deletion`
   exitoso retira la fila de la vista de inmediato y invalida la consulta de
   la cola (`queryClient.invalidateQueries`), porque Community ya no puede
   devolver ese comentario en una lectura posterior.

## Explícitamente fuera de alcance

Ni esta Task ni ninguna anterior calculan lenguaje ofensivo en el cliente,
inventan categorías de origen, sancionan cuentas, llaman a Account, aceptan o
envían una IP desde el frontend, ni duplican las reglas de detección o de
reporte de Community. Todo eso vive exclusivamente en Community.

## Pruebas

`ModerationQueuePage.test.tsx` cubre: fila con solo reporte, fila con solo
detección automática, fila con ambos orígenes sin duplicar insignias, y que
eliminar retira la fila y refresca la cola. `routes.test.tsx` cubre que
Moderador, Administrador y Super Administrador ven el acceso de navegación y
que Jugador no. Las pruebas existentes de las cinco acciones, y de los
códigos 401/403/404/400, no cambiaron: `ModerationActionForm` no se tocó.

No existe infraestructura E2E estable en este repositorio (no hay Playwright/
Cypress configurado); se documenta como evidencia el recorrido manual
verificado contra el stack local completo (Web + Community + Postgres vía
Docker Compose): login con rol Moderador → `/admin/comments/moderation` →
fila con origen visible → acción de moderación → resultado reflejado en la
insignia (o, para eliminar, la fila desaparece).
