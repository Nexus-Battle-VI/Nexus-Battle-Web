# HU-38 — Notificaciones de catálogo al iniciar sesión y banner informativo

## Alcance implementado

Adaptación de los dos mockups de Figma entregados (pantalla de jugador
"Novedades del catálogo" y pantalla de administración "Banner informativo")
al `AppLayout` real, con el backend ya implementado en
[Notifications#20-24](https://github.com/Nexus-Battle-VI/Nexus-Battle-Notifications),
[Catalog#51](https://github.com/Nexus-Battle-VI/Nexus-Battle-Catalog/pull/51)
e [Infrastructure#93-97](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure).

1. **Dos adaptaciones deliberadas del mockup, no invenciones.**
   - El Light/Dark que el mockup dibuja *dentro* de cada pantalla NO se
     replicó: `AppHeader` ya tiene un único `ThemeToggle` global, y las
     pantallas nuevas responden a ese tema con los tokens existentes
     (`bg-surface-raised`, `text-ink`, `text-muted`, `border-border`,
     `bg-brand`), sin estado de tema propio.
   - El formulario administrativo del mockup solo dibuja "Mensaje del
     banner" + fechas, pero `POST /v1/admin/banners` exige también `title`.
     Se añadió "Título del banner" como adaptación del diseño al contrato ya
     implementado, no como un requisito nuevo.
2. **`CommercePage` es la vista principal real**, no `/notifications`: el
   resumen de pendientes (`CatalogNotificationsSummary`) y el banner
   (`CatalogBanner`) se montan ahí, cada uno con su propia carga/error
   independiente de carrito y vitrina (un fallo en uno no rompe Commerce).
   `/notifications` pasa a ser el historial completo (`GET .../me/history`);
   ya no es el marcador de posición de "correos transaccionales".
3. **Secuencia de lectura obligatoria**: `GET .../me/pending` → React
   presenta el contenido → recién entonces `POST .../me/read`, con el
   aplanado de **todos** los `notificationIds` de las filas presentadas (una
   fila consolidada representa varias notificaciones originales). Un ref
   evita un segundo POST para el mismo lote en un re-render. Si el POST
   falla, la notificación no se oculta: se reintenta en la siguiente carga,
   porque el backend deja de devolverla una vez marcada.
4. **Backend como única fuente de verdad**: Web no consolida notificaciones,
   no recalcula vigencia de banners (`GET /v1/banners` ya devuelve solo los
   vigentes) y no reconstruye la descripción — se presenta tal como llega.
   En el panel administrativo, "Vigente"/"Fuera de vigencia" viene de
   `isActive`, nunca de comparar fechas en el cliente.
5. **`/admin/banners`** reutiliza `RequireAdministrator` (Administrador y
   Super Administrador; Jugador y Moderador quedan fuera) y solo permite
   crear y consultar: el backend no ofrece editar/eliminar/despublicar
   todavía, así que la pantalla no inventa esos botones.

## Explícitamente fuera de alcance

Esta Task no calcula vigencia de banners en el cliente, no consolida
notificaciones, no envía `playerId`/`subject` en ninguna petición (el
backend deriva al jugador del testimonio), no implementa autoplay del
banner (navegación manual únicamente, sin intervalo inventado), no
implementa correo (Task #186 queda fuera mientras no exista ese requisito),
y no modifica ningún servicio backend.

## Vistas previas de desarrollo

`__dev/hu38/notifications` y `__dev/hu38/admin-banners`
(`src/features/notifications/dev/`) permiten revisar ambas pantallas sin
Notifications respondiendo de verdad, siguiendo el mismo patrón que
`ModerationQueueDevPreview`: interceptan `fetch` mientras están montadas, no
tocan la red real y Vite las elimina de la compilación de producción.

## Pruebas

Unit/integration con Vitest + Testing Library: consolidación (CA-03), orden
GET→render→POST, ids aplanados, ausencia de doble POST, 0/1/N banners con
navegación circular, validación del formulario (campos requeridos, inicio ≤
fin), conversión `datetime-local` → ISO-8601, listado por `isActive`, y RBAC
de `/admin/banners`.

## Estado de HU-38

- Notificaciones/banner en Web: **Implemented**.
- Terraform Applied: **No**.
- E2E (Catalog → SQS → Notifications → Web) contra AWS real: **Pending**.
