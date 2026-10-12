# Procedencia de los activos de PixelLab del armazón (EN-031)

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#460`

Detalle de cada generación de PixelLab usada en `public/assets/shell/`: el mundo vivo de fondo y los iconos de la navegación.
Es el respaldo de la entrada `pixellab-shell` de [`inventario-activos.md`](./inventario-activos.md).

Los ficheros publicados se derivan de estos originales con `scripts/process-shell-assets.mjs`, que solo recorta, copia y recolorea; nunca reescala. Nada se pide a PixelLab en tiempo de ejecución.

## Imágenes

| Original            | Job de PixelLab                        | Fecha      | Generación                                                                                                                                              |
| ------------------- | -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world-sky-dark`    | `62162762-d935-4036-8ba6-280a3fb6fb73` | 2026-10-11 | Panorama del reino de noche (`create_image_pro`, referencia de estilo `bg-auth-gate-dark`)                                                              |
| `world-sky-light`   | `0994d941-f70b-41ff-91c4-7e3b5419fcd0` | 2026-10-11 | Panorama del reino al amanecer (`create_image_pro`, referencia de composición `world-sky-dark` y de estilo `bg-play-lobby-light`)                       |
| `world-mid-dark`    | `b16da677-9364-4da2-b4d5-b82e926b8bf1` | 2026-10-11 | Colinas del primer plano, nocturnas (`create_image_pro`, referencia de estilo `bg-play-lobby-dark`)                                                     |
| `world-clouds-dark` | `0a50bc56-912f-4a3a-9ca6-f3e0641e82da` | 2026-10-11 | Tira de nubes nocturnas (`create_image_pro`, referencia de estilo `bg-auth-gate-dark`)                                                                  |
| `nav-icons-dark`    | `d4d45d51-9591-4190-a51a-fb3baa4b2d8b` | 2026-10-11 | Hoja de 16 iconos en placas enmarcadas (`create_image_pro`, referencia de estilo `icon-chest-dark`)                                                     |
| `nav-icons-light`   | `d06a64a4-8c44-4100-b0e1-f5b9689f65ba` | 2026-10-11 | Hoja de iconos con luz de día (`edit_image` sobre `nav-icons-dark`)                                                                                     |
| `theme-sun`         | `e6f86d62-b93f-474b-9703-5c1aa6f11e8f` | 2026-10-11 | Sol del interruptor de tema, 32×32 (`create_image_pixen`)                                                                                               |
| `theme-moon`        | `ec6bbf52-795b-4c1e-b639-648974352feb` | 2026-10-11 | Luna creciente del interruptor de tema, 32×32 (`create_image_pixen`)                                                                                    |
| `hud-bell`          | `c1d1e14e-2f1f-41ea-9159-35835d7501ac` | 2026-10-11 | Campana de notificaciones recta y sin placa, 32×32 (`create_image_pixen`); sustituye en la cabecera a `icon-bell` de Autenticación, que salía inclinada |

**Descartadas:**

- `36a7338e-6c04-42d0-8b0c-238d67c7280e`: colinas con una muralla flotante, copiada de la referencia de estilo.
- `665d557b-c116-46ae-b2a5-e4b0fb8dce1f`: iconos con las placas cortadas en tres de los cuatro bordes.

## Derivados

| Original            | Derivados publicados                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world-sky-*`       | `shell/world/world-sky-{dark,light}.png` (copia)                                                                                                                  |
| `world-mid-dark`    | `shell/world/world-mid-dark.png` (copia)                                                                                                                          |
| `world-mid-dark`    | `shell/world/world-mid-light.png`: **no es otra generación**; es la capa nocturna recoloreada por luminancia hacia una rampa de verdes, conservando las antorchas |
| `world-clouds-dark` | `shell/world/world-clouds-dark.png`, sin las nubes que corta el borde, para que la tira se repita limpia                                                          |
| `world-clouds-dark` | `shell/world/world-clouds-light.png`: la misma tira, recoloreada por luminancia hacia blancos y azules de día                                                     |
| `nav-icons-*`       | `shell/nav/icon-<nombre>-{dark,light}.png`: 16 iconos de 72×72, el interior de cada placa sin su marco                                                            |
| `theme-*`           | `shell/theme/{sun,moon}.png` (copia; los mismos en ambos temas)                                                                                                   |
| `hud-bell`          | `shell/hud/bell.png` (copia; la misma en ambos temas)                                                                                                             |

PixelLab no encaja las placas en la cuadrícula: miden unos 100×98 y las del borde salen cortadas. Por eso se recorta el interior de cada placa, centrado en la placa completa.

Las brasas (Dark) y el polen (Light) del fondo no son imágenes: son gradientes CSS en `src/app/shell.css`.
