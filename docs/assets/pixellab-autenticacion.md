# Procedencia de los activos de PixelLab de Autenticación, notificaciones y correos (EN-031)

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#460`

Detalle de cada generación de PixelLab usada en `public/assets/auth/`, `public/assets/notifications/` y
`public/assets/email/`. Es el respaldo de la entrada `pixellab-autenticacion` de
[`inventario-activos.md`](./inventario-activos.md). Los ficheros publicados se derivan de estos originales
con `scripts/process-auth-assets.mjs` (recortes, sin reescalar). Nada se pide a PixelLab en tiempo de
ejecución.

Las esquinas de los paneles (`auth/ui/corner-*`) no son generaciones nuevas: se copian del kit de
ornamentos de Misiones (ver [`pixellab-misiones.md`](./pixellab-misiones.md)).

`public/assets/email/` lo sirve Web en `https://nexus.simuladorupbbga.app/assets/email/` para los correos
de Notifications y de Cognito: las imágenes de un correo van **alojadas**, porque la política de IAM solo
concede `ses:SendEmail` (sin `SendRawEmail`, no hay adjuntos en línea). Renombrar o borrar uno de esos
ficheros rompe los correos ya enviados.

## Imágenes

| Original             | Job de PixelLab                        | Fecha      | Generación                                                                      |
| -------------------- | -------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `bg-auth-gate-dark`  | `35732fc8-542a-4ce2-a7d0-f799e6752f97` | 2026-10-11 | fortress gate night (create_image_pro, style ref bg-play-lobby-dark)            |
| `bg-auth-gate-light` | `7bb56047-dfc4-444c-a97a-6d0f2a1f323b` | 2026-10-11 | fortress gate sunrise (create_image_pro, style ref bg-play-lobby-light)         |
| `bg-auth-oath-dark`  | `c107d0a1-4c54-4760-884d-09e2b4fdaef9` | 2026-10-11 | hall of oaths night (create_image_pro, style ref bg-play-lobby-dark)            |
| `bg-auth-oath-light` | `5b10ba83-9c27-4f1c-bb56-5246cde4896f` | 2026-10-11 | hall of oaths day (create_image_pro, style ref bg-play-lobby-light)             |
| `seals-dark`         | `e572bd45-18ea-46fb-8a04-3c410d57eabf` | 2026-10-11 | wizard step seals + avatar frame (create_image_pro, style ref frame-panel-dark) |
| `seals-light`        | `1fe7ec53-0e23-4504-b738-18ba65944e23` | 2026-10-11 | wizard seals light (edit_image over seals-dark)                                 |
| `icons-a-dark`       | `0fd5d4c1-a7ea-4530-8a8a-9b0160953b90` | 2026-10-11 | auth icon sheet A 4x4 (create_image_pro, style ref icon-chest-dark)             |
| `icons-a-light`      | `7f679eeb-22d9-415a-9b22-e4a9fd77ed64` | 2026-10-11 | auth icon sheet A light (edit_image over icons-a-dark)                          |
| `icons-b-dark`       | `4aa913e0-3f91-435b-b9c7-c2b2d82fd581` | 2026-10-11 | notification icon sheet B 4x4 (create_image_pro, style ref icon-chest-dark)     |
| `icons-b-light`      | `3415fd31-5bd8-46d2-8359-df77f402fdb7` | 2026-10-11 | notification icon sheet B light (edit_image over icons-b-dark)                  |
| `email-header`       | `d0bd632b-9409-4ac7-805c-78dda22be325` | 2026-10-11 | email header banner (create_image_pro, style ref bg-play-lobby-dark)            |

`email/logo.png` **no** es una generación de PixelLab: es `public/assets/logo.png` (el logotipo del proyecto, ya registrado) reducido a 400×150 con interpolación bicúbica para que el correo no descargue 1,2 MB. Se superpone a `email/header.png` en la cabecera de los correos.
| `email-header-light` | `0302ffa5-72de-49b4-aeb3-0ba24af29c54` | 2026-10-11 | email header banner daylight (create_image_pro, style ref bg-play-lobby-light) |

## Derivados

| Original             | Derivados publicados                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg-auth-gate-*`     | `auth/backgrounds/bg-auth-gate-{dark,light}.png` (Login, Recuperación, sesión)                                                                          |
| `bg-auth-oath-*`     | `auth/backgrounds/bg-auth-oath-{dark,light}.png` (Registro)                                                                                             |
| `seals-*`            | `auth/ui/seal-{personal,avatar,security,terms}-*.png`, `auth/ui/avatar-frame-*.png`                                                                     |
| `icons-a-*`          | `auth/icons/icon-<nombre>-*.png` (16 iconos); la variante clara, además, en `email/icon-{user,mail,lock,key,shield,check,alert}.png`                    |
| `icons-b-*`          | `notifications/icons/icon-<nombre>-*.png` (12 iconos); la variante clara, además, en `email/icon-{catalog,auction,loot,credits,sanction,confirmed}.png` |
| `email-header-light` | `email/header.png` (los correos usan solo la variante clara: el modo oscuro de los clientes de correo no es fiable)                                     |
| `email-header`       | ninguno; se conserva como candidata descartada                                                                                                          |
