# Procedencia de los activos de PixelLab de la Consola del Consejo (EN-031)

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#460`

Este documento detalla cada generación de PixelLab usada en `public/assets/admin/`: la escena del salón y los iconos de las secciones de administración.
Es el respaldo de la entrada `pixellab-consejo` de [`inventario-activos.md`](./inventario-activos.md).

Los ficheros publicados se derivan de estos originales con `scripts/process-admin-assets.mjs`, que solo copia y recorta, sin reescalar. Nada se pide a PixelLab en tiempo de ejecución.

## Imágenes

| Original             | Job de PixelLab                        | Fecha      | Generación                                                                                                                     |
| -------------------- | -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `council-hall-dark`  | `9fb80645-dd7d-4971-bf4a-6d5ae5a9950f` | 2026-10-11 | Salón del Consejo de noche (`create_image_pro`, referencia de estilo `bg-auth-gate-dark`)                                      |
| `council-hall-light` | `8d5c0e73-a28a-4ba0-962d-8620d02162a0` | 2026-10-11 | Salón del Consejo de día (`create_image_pro`, referencia de composición `council-hall-dark` y de estilo `bg-play-lobby-light`) |
| `admin-icons-dark`   | `04f37602-8b82-4880-bc0b-2172b2f29a88` | 2026-10-11 | Hoja de 16 iconos de sección en placas enmarcadas (`create_image_pro`, referencia de estilo `icon-chest-dark`)                 |
| `admin-icons-light`  | `2e7d0199-f0f8-44c8-ae7e-d063364f4371` | 2026-10-11 | Hoja de iconos con luz de día (`edit_image` sobre `admin-icons-dark`)                                                          |

## Derivados

| Original         | Derivados publicados                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `council-hall-*` | `admin/scene/council-hall-{dark,light}.png`, copiados tal cual                                            |
| `admin-icons-*`  | `admin/icons/icon-<sección>-{dark,light}.png`: 16 iconos de 60×60, el interior de cada placa sin su marco |

Las placas de esta hoja miden unos 89 px, frente a los ~100 de la de navegación. Por eso el recorte es de 60 px y no de 72.

La hoja clara trae una chispa suelta fuera de las placas. El script se queda con las 16 piezas mayores y comprueba que tengan un tamaño parecido.
