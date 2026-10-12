# Inventario de activos

Fuente de verdad versionada de los activos visuales y multimedia externos utilizados por
`Nexus-Battle-Web`.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#245`
Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#246`
Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#248`
Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#264`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#203`

El modelo de datos, los valores controlados y el procedimiento de registro están definidos en
[`docs/assets/README.md`](./README.md). Toda entrada añadida a este documento debe seguir ese
procedimiento.

## Estado actual

La auditoría técnica realizada para `EN-021.1` no encontró activos externos reales incorporados
actualmente en `Nexus-Battle-Web` que requieran registro. Por ese motivo, el inventario se deja
publicado y versionado, listo para recibir entradas, sin filas de datos.

`EN-021.2` (`Refs Nexus-Battle-VI/Nexus-Battle-Management#246`) amplió la auditoría a la página
`02 — Foundations` del Design System en Figma e identificó dos fundamentos externos propuestos allí:
la familia tipográfica `Inter` y la librería de iconos `Lucide`. Ninguno de los dos está incorporado
actualmente al código de `Nexus-Battle-Web`: la tipografía en uso sigue siendo la del sistema
operativo (`system-ui, -apple-system, 'Segoe UI', sans-serif`) y el proyecto no tiene instalada
ninguna librería de iconos. Por ese motivo, `Inter` y `Lucide` no generan una entrada en este
inventario en este momento. Si cualquiera de los dos se incorpora al producto en el futuro, debe
registrarse siguiendo el procedimiento de `docs/assets/README.md`, con evidencia verificable del
mecanismo de distribución elegido y de su licencia aplicable en ese momento. Los tokens propios del
Design System (color, spacing, radios, tipografía como escala, elevaciones) son decisiones de diseño
expresadas como configuración y no se tratan como activos externos únicamente por estar definidos en
Figma.

`EN-021.4` (`Refs Nexus-Battle-VI/Nexus-Battle-Management#248`) consolidó la página `05 — Assets`
del Design System como biblioteca controlada, incluyendo un catálogo de 71 Icon Masters de `Lucide`
organizados en 7 familias semánticas y la corrección de su estado documental para distinguir
`Design System: IMPLEMENTED / IN REVIEW` de `Nexus-Battle-Web: NOT IMPLEMENTED`. Esa consolidación
no incorpora ningún recurso nuevo al código de `Nexus-Battle-Web`: `Inter` y `Lucide` continúan sin
uso real en el producto, por lo que ninguno de los dos genera todavía una entrada en este
inventario. El equipo confirmó que todo el frontend de `Nexus Battles VI` se implementa
exclusivamente en este repositorio; cuando `Inter`, `Lucide` u otro recurso de `05 — Assets` se
incorpore realmente al código, deberá registrarse en el mismo incremento o Pull Request que realice
dicha incorporación, mediante una Task separada dentro del Enabler `EN-021`.

`EN-021.7` (`Refs Nexus-Battle-VI/Nexus-Battle-Management#264`) incorporó realmente `Inter` y
`Lucide` al código de `Nexus-Battle-Web` mediante paquetes npm autohospedados, sin dependencia de
red en tiempo de ejecución. Por tratarse de la primera incorporación técnica real de un recurso
externo, este inventario deja de estar vacío a partir de las dos entradas siguientes.

## Inventario

| id             | nombre                                          | tipo       | fuente_origen                            | autor_proveedor                              | licencia_o_autorizacion             | url_referencia                                          | requiere_atribucion | texto_atribucion | estado_verificacion | evidencia                                                                                                  | bounded_context_o_feature | fecha_registro | observaciones                                                                                                                                                                                                                                                                              |
| -------------- | ----------------------------------------------- | ---------- | ---------------------------------------- | -------------------------------------------- | ----------------------------------- | ------------------------------------------------------- | ------------------- | ---------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| inter-variable | Inter (tipografía variable, self-hosted)        | tipografia | paquete npm `@fontsource-variable/inter` | The Inter Project Authors (Rasmus Andersson) | SIL Open Font License 1.1 (OFL-1.1) | `https://github.com/rsms/inter/blob/master/LICENSE.txt` | no                  | no aplica        | verificado          | LICENSE del paquete `@fontsource-variable/inter@5.3.0` (OFL-1.1); URL de referencia de la columna anterior | transversal               | 2026-08-23     | Reemplaza `system-ui` como `font-family` principal (`src/index.css`); se importa únicamente el eje de peso (`wght.css`) desde `src/main.tsx`. Mecanismo autohospedado, sin CDN ni descarga manual de binarios.                                                                             |
| lucide-react   | Lucide (librería de iconos, consumo controlado) | icono      | paquete npm `lucide-react`               | Lucide (comunidad; fork de Feather Icons)    | ISC License                         | `https://lucide.dev/license`                            | no                  | no aplica        | verificado          | LICENSE del paquete `lucide-react@1.33.0` (ISC); URL de referencia de la columna anterior                  | transversal               | 2026-08-23     | Entrada de biblioteca general, no por icono. El consumo actual se limita a `ChevronDown`, reexportado desde el punto controlado `src/components/ui/icons.ts`. Lucide documenta iconos derivados de Feather bajo MIT; no existe evidencia específica de que `ChevronDown` sea uno de ellos. |

### Arte generado con PixelLab para Misiones (EN-031)

`EN-031` (`Refs Nexus-Battle-VI/Nexus-Battle-Management#460`) incorpora arte pixel generado con
PixelLab para el remaster visual de Misiones: fondos de pantalla, escenas de misión, ornamentos de
interfaz, iconos y sprites de enemigos, jefes y Másteres en `public/assets/missions/`. La entrada
`pixellab-autenticacion` cubre del mismo modo el arte de Autenticación, notificaciones y correos
(detalle en [`pixellab-autenticacion.md`](./pixellab-autenticacion.md)). Se registra como
una entrada por biblioteca, igual que `lucide-react`; el detalle de cada generación (identificador
del trabajo de PixelLab, fecha y descripción) está en [`pixellab-misiones.md`](./pixellab-misiones.md).
Las condiciones de uso del arte generado dependen de los términos de servicio de PixelLab y de la
suscripción con la que se generó; mientras el gobierno del proyecto no las revise, la entrada queda
`pendiente_de_verificacion`, sin afirmar una licencia concreta.

| id                     | nombre                                                                                                   | tipo   | fuente_origen                                                                             | autor_proveedor                                                     | licencia_o_autorizacion                                  | url_referencia                       | requiere_atribucion | texto_atribucion | estado_verificacion       | evidencia                                                                                                           | bounded_context_o_feature | fecha_registro | observaciones                                                                                                                                                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ | ------------------- | ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pixellab-misiones      | Arte pixel de Misiones (remaster EN-031)                                                                 | imagen | PixelLab (generación por MCP con la suscripción del equipo)                               | PixelLab (modelo generativo); dirección del equipo Nexus Battles VI | Términos de servicio de PixelLab (pendiente de revisión) | `https://pixellab.ai/termsofservice` | pendiente           |                  | pendiente_de_verificacion | Registro de generaciones en [`pixellab-misiones.md`](./pixellab-misiones.md); términos de la columna URL            | Missions                  | 2026-10-10     | 121 ficheros autohospedados en `public/assets/missions/`, derivados con `scripts/process-missions-assets.mjs`. Nada se pide a PixelLab en tiempo de ejecución. Referencias de estilo: los assets ya publicados de Jugar Online.                                                                                   |
| pixellab-autenticacion | Arte pixel de Autenticación, notificaciones y correos (remaster EN-031)                                  | imagen | PixelLab (generación por MCP con la suscripción del equipo)                               | PixelLab (modelo generativo); dirección del equipo Nexus Battles VI | Términos de servicio de PixelLab (pendiente de revisión) | `https://pixellab.ai/termsofservice` | pendiente           |                  | pendiente_de_verificacion | Registro de generaciones en [`pixellab-autenticacion.md`](./pixellab-autenticacion.md); términos de la columna URL  | Account, Notifications    | 2026-10-11     | 89 ficheros autohospedados en `public/assets/{auth,notifications,email}/` (uno de ellos, `email/logo.png`, derivado del logotipo del proyecto), derivados con `scripts/process-auth-assets.mjs`. Los de `email/` los cargan los correos desde el dominio público. Nada se pide a PixelLab en tiempo de ejecución. |
| pixellab-shell         | Arte pixel del armazón: mundo vivo de fondo e iconos de navegación (remaster EN-031)                     | imagen | PixelLab (generación por MCP con la suscripción del equipo)                               | PixelLab (modelo generativo); dirección del equipo Nexus Battles VI | Términos de servicio de PixelLab (pendiente de revisión) | `https://pixellab.ai/termsofservice` | pendiente           |                  | pendiente_de_verificacion | Registro de generaciones en [`pixellab-shell.md`](./pixellab-shell.md); términos de la columna URL                  | transversal               | 2026-10-11     | 38 ficheros autohospedados en `public/assets/shell/`, derivados con `scripts/process-shell-assets.mjs` (dos de ellos recoloreados, no generados). Nada se pide a PixelLab en tiempo de ejecución.                                                                                                                 |
| pixellab-consejo       | Arte pixel de la Consola del Consejo: salón y iconos de sección (remaster EN-031)                        | imagen | PixelLab (generación por MCP con la suscripción del equipo)                               | PixelLab (modelo generativo); dirección del equipo Nexus Battles VI | Términos de servicio de PixelLab (pendiente de revisión) | `https://pixellab.ai/termsofservice` | pendiente           |                  | pendiente_de_verificacion | Registro de generaciones en [`pixellab-consejo.md`](./pixellab-consejo.md); términos de la columna URL              | administración            | 2026-10-11     | 34 ficheros autohospedados en `public/assets/admin/`, derivados con `scripts/process-admin-assets.mjs`. Solo se descargan en las rutas `/admin*`. Nada se pide a PixelLab en tiempo de ejecución.                                                                                                                 |
| pixellab-items         | Arte pixel animado de productos, habilidades y épicas, y animaciones de héroe añadidas (remaster EN-031) | imagen | PixelLab (ZIP entregado por el equipo y generación por MCP con la suscripción del equipo) | PixelLab (modelo generativo); dirección del equipo Nexus Battles VI | Términos de servicio de PixelLab (pendiente de revisión) | `https://pixellab.ai/termsofservice` | pendiente           |                  | pendiente_de_verificacion | Registro de generaciones y hashes del ZIP en [`pixellab-items.md`](./pixellab-items.md); términos de la columna URL | transversal               | 2026-10-11     | 102 tiras autohospedadas en `public/assets/items/` y 8 hojas ampliadas `en031-*.png` en `public/assets/heroes/sprites/`, derivadas con `scripts/process-item-assets.mjs` y `scripts/process-hero-animations.mjs`. Nada se pide a PixelLab en tiempo de ejecución.                                                 |

Cada nuevo recurso externo incorporado al producto debe añadirse a esta tabla siguiendo el modelo de
datos y el procedimiento descritos en `docs/assets/README.md`, en el mismo Pull Request que incorpora
o modifica el recurso.
