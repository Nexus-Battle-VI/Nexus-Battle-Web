# Procedencia de los activos de PixelLab de Misiones (EN-031)

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#460`

Detalle de cada generacion de PixelLab usada en `public/assets/missions/`. Es el respaldo de la
entrada `pixellab-misiones` de [`inventario-activos.md`](./inventario-activos.md). Los ficheros publicados
se derivan de estos originales con `scripts/process-missions-assets.mjs` (recortes y tiras, sin reescalar).
Nada se pide a PixelLab en tiempo de ejecucion.

## Imagenes (fondos, escenas, kit de ornamentos, hojas de iconos)

| Original                      | Job de PixelLab                        | Fecha      | Generacion                                                                                   |
| ----------------------------- | -------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `bg-missions-board-dark`      | `a94b3475-4fcb-4267-9fc7-db4f642b16bc` | 2026-10-10 | mission hall night (create_image_pro, style ref bg-play-lobby-dark)                          |
| `bg-missions-board-light`     | `e5111c93-f0b3-4b01-ae75-48fc6af05b6a` | 2026-10-10 | mission hall day (create_image_pro, style ref bg-play-lobby-light)                           |
| `ornaments-dark`              | `f7e1ccae-8f95-4c8e-88de-8110c45ea491` | 2026-10-10 | UI ornament kit (create_image_pro, style ref frame-panel-dark)                               |
| `bg-missions-admin-dark`      | `1320bfcb-9ba7-4540-aac8-ac5d91388b0c` | 2026-10-10 | cartographer workshop night (create_image_pro, style ref bg-play-lobby-dark)                 |
| `bg-missions-detail-dark`     | `f16cb65e-d04a-4326-bcf8-fed5f9fb2e90` | 2026-10-10 | expedition gate night (create_image_pro, style ref bg-play-lobby-dark)                       |
| `bg-missions-history-dark`    | `788a3b11-36e4-4109-b902-1e1ecafe6f6d` | 2026-10-10 | hall of trophies night (create_image_pro, style ref bg-play-lobby-dark)                      |
| `bg-missions-report-dark`     | `b0ab0a00-c8dd-4978-a2d8-d3238e1b5e13` | 2026-10-10 | chronicler scriptorium night (create_image_pro, style ref bg-play-lobby-dark)                |
| `scene-camino-templo-dark`    | `453ae6c6-d993-43aa-9f9d-76d5b26f12ec` | 2026-10-10 | battle stage mountain road to temple (create_image_pro, style ref bg-play-lobby-dark)        |
| `scene-templo-olvidado-dark`  | `c6ea353f-5837-4cca-ba0e-5b262be236d7` | 2026-10-10 | battle stage forgotten temple (create_image_pro, style ref bg-play-lobby-dark)               |
| `scene-camara-sellada-dark`   | `ff1a1be7-ae98-4de8-8e6e-df1e5d003417` | 2026-10-10 | battle stage sealed arcane chamber (create_image_pro, style ref bg-play-lobby-dark)          |
| `scene-arena-caidos-dark`     | `3a4f1651-f84c-4693-a044-4a8f74e5c0ad` | 2026-10-10 | battle stage ruined colosseum (create_image_pro, style ref bg-play-lobby-dark)               |
| `scene-travesia-bosque-dark`  | `c3162964-67ff-41ac-bcac-d4c1065f7cd4` | 2026-10-10 | battle stage haunted forest swamp (create_image_pro, style ref bg-play-lobby-dark)           |
| `bg-missions-detail-light`    | `b8920aa8-2ccf-4ed8-bcd9-5de02c23dd93` | 2026-10-10 | expedition gate day (create_image_pro, style ref bg-play-lobby-light)                        |
| `bg-missions-report-light`    | `a56dee1f-d099-4700-b43b-5e8609c628c0` | 2026-10-10 | scriptorium day (create_image_pro, style ref bg-play-lobby-light)                            |
| `bg-missions-admin-light`     | `f497cb60-4794-4c74-a9cd-beb342c61548` | 2026-10-10 | cartographer workshop day (create_image_pro, style ref bg-play-lobby-light)                  |
| `scene-camino-templo-light`   | `0b71a4b5-fae2-4510-a024-fb04859ac599` | 2026-10-10 | battle stage sunny road to temple (create_image_pro, style ref bg-play-lobby-light)          |
| `scene-templo-olvidado-light` | `67474604-9f49-426a-bb83-d39a5b927233` | 2026-10-10 | battle stage temple day (create_image_pro, style ref bg-play-lobby-light)                    |
| `scene-camara-sellada-light`  | `6b441f99-12f9-4cc8-a203-89a23821c5a9` | 2026-10-10 | battle stage marble arcane chamber (create_image_pro, style ref bg-play-lobby-light)         |
| `scene-arena-caidos-light`    | `9e9a67b9-d924-43ee-815f-21b822ce1309` | 2026-10-10 | battle stage colosseum day (create_image_pro, style ref bg-play-lobby-light)                 |
| `bg-missions-history-light`   | `ea601f25-d3e2-49b0-89d0-9dd20a208440` | 2026-10-10 | hall of trophies day (create_image_pro, style ref bg-play-lobby-light)                       |
| `icons-a-dark`                | `095f0fcc-df52-4493-b4d1-9960370c8ed8` | 2026-10-10 | icon sheet A 4x4 (create_image_pro, style ref icon-chest-dark)                               |
| `ornaments-light`             | `b8890b5a-44eb-433e-b88f-bab1a0d2c733` | 2026-10-10 | UI ornament kit light (edit_image over ornaments-dark)                                       |
| `icons-a-light`               | `65fb1853-8157-4878-a5f9-698e55c05b94` | 2026-10-10 | icon sheet A light (edit_image over icons-a-dark)                                            |
| `scene-travesia-bosque-light` | `f47604df-9eda-4c2b-be31-96a67ee17c12` | 2026-10-10 | battle stage forest day (create_image_pro, style ref bg-play-lobby-light)                    |
| `icons-b-dark`                | `6877b68f-80a6-4257-a5f8-2571797e6e02` | 2026-10-10 | icon sheet B 4x4 (create_image_pro, style ref icon-chest-dark)                               |
| `icons-b-light`               | `fd3fd1bf-0242-4f79-9ce4-77b3bb33031a` | 2026-10-11 | icon sheet B light (edit_image over icons-b-dark)                                            |
| `aranas-de-niebla`            | `00d9da87-3043-4d6c-a3de-6a59b4a391d5` | 2026-10-10 | mist spider static sprite, candidate 2 of 4 (create_image_pro, style ref bg-play-lobby-dark) |

## Personajes del diorama

Personajes de PixelLab (`create_character`, vista `low top-down`), animados mirando al suroeste: reposo con la
plantilla `fight-stance-idle-8-frames` y ataque con una animacion `v3` propia. La arana es una imagen fija.

| Nombre en Missions          | Rol    | Personaje de PixelLab                           | Ficheros publicados                                                  |
| --------------------------- | ------ | ----------------------------------------------- | -------------------------------------------------------------------- |
| Sombras Corrompidas         | ENEMY  | `b3649bc2-d6c7-4b34-bada-3235cf32724a`          | `sombras-corrompidas-attack.png`, `sombras-corrompidas-idle.png`     |
| Guardianes de Piedra        | ENEMY  | `c37a3b7b-362e-4609-ae67-3ff067162eea`          | `guardianes-de-piedra-attack.png`, `guardianes-de-piedra-idle.png`   |
| Espectros Ancestrales       | ENEMY  | `239fdd6e-e3e4-483f-b4ca-4feb65bfd158`          | `espectros-ancestrales-attack.png`, `espectros-ancestrales-idle.png` |
| Bandidos del Camino         | ENEMY  | `25eb3882-e8b3-46ec-9027-ca9e6efc8d96`          | `bandidos-del-camino-attack.png`, `bandidos-del-camino-idle.png`     |
| Gladiadores Caídos          | ENEMY  | `d19dcdba-bd38-4b2a-9922-947902332829`          | `gladiadores-caidos-attack.png`, `gladiadores-caidos-idle.png`       |
| Centinela Arcano            | ENEMY  | `9b83f2b1-e7ff-40b4-b9b7-f8a74c5a54bc`          | `centinela-arcano-attack.png`, `centinela-arcano-idle.png`           |
| Eco del Sello               | ENEMY  | `f7c44268-3d2e-41e6-bd74-74da495efa63`          | `eco-del-sello-attack.png`, `eco-del-sello-idle.png`                 |
| Espíritus del Pantano       | ENEMY  | `a2438421-88fd-4ced-8a78-23490d99c7c9`          | `espiritus-del-pantano-attack.png`, `espiritus-del-pantano-idle.png` |
| El Guardián Eterno          | BOSS   | `e07c52f0-83c8-40de-8991-09dac533c6aa`          | `el-guardian-eterno-attack.png`, `el-guardian-eterno-idle.png`       |
| Custodio del Sello          | BOSS   | `789df466-f1be-47f8-9e9c-609edf03510b`          | `custodio-del-sello-attack.png`, `custodio-del-sello-idle.png`       |
| Garra, jefe de los bandidos | BOSS   | `a4fea5d8-a92b-4271-bf5d-238761a5489c`          | `garra-attack.png`, `garra-idle.png`                                 |
| Varkas, el Invicto          | BOSS   | `35dbe44a-9c26-4b9a-9944-08a202d94381`          | `varkas-el-invicto-attack.png`, `varkas-el-invicto-idle.png`         |
| La Bruja del Pantano        | BOSS   | `7eced95d-c04c-41c4-bf85-3c8b42cf97b5`          | `la-bruja-del-pantano-attack.png`, `la-bruja-del-pantano-idle.png`   |
| Sombra del Olvido           | MASTER | `c1d1e3a4-3da2-4e09-9b7e-ebc38cda8a3c`          | `sombra-del-olvido-attack.png`, `sombra-del-olvido-idle.png`         |
| Hechicera del Sello         | MASTER | `0a0fea07-46e9-4b31-bcf5-fd7f57f8c4e7`          | `hechicera-del-sello-attack.png`, `hechicera-del-sello-idle.png`     |
| Coloso de Obsidiana         | MASTER | `ac4dcc30-6bd8-443f-8d56-098413f1f446`          | `coloso-de-obsidiana-attack.png`, `coloso-de-obsidiana-idle.png`     |
| Campeón Carmesí             | MASTER | `7fb1b4b5-430f-4d8d-a5e5-d5461d336c7b`          | `campeon-carmesi-attack.png`, `campeon-carmesi-idle.png`             |
| Lobos Sombríos              | ENEMY  | `a72eaf5a-2876-40bf-9f6e-e2639c6db96a`          | `lobos-sombrios-attack.png`, `lobos-sombrios-idle.png`               |
| Bestias de la Arena         | ENEMY  | `d989e2ad-3c8d-45aa-8c95-652f1bb7395f`          | `bestias-de-la-arena-attack.png`, `bestias-de-la-arena-idle.png`     |
| Arañas de Niebla            | ENEMY  | `00d9da87-3043-4d6c-a3de-6a59b4a391d5 (imagen)` | `aranas-de-niebla-idle.png`                                          |
| Filo Errante                | MASTER | `94b62a76-53f6-4313-8019-4753b951ec1c`          | `filo-errante-attack.png`, `filo-errante-idle.png`                   |
| Llama Salvaje               | MASTER | `aa4fbc29-a78c-49c6-a55a-64fb3e6e440d`          | `llama-salvaje-attack.png`, `llama-salvaje-idle.png`                 |
| Chamán de la Niebla         | MASTER | `3765d47d-354d-4f4e-acb6-6b40c9f54b57`          | `chaman-de-la-niebla-attack.png`, `chaman-de-la-niebla-idle.png`     |
| Cirujano Silente            | MASTER | `64d94c67-2a11-4ff4-8e40-afe7a5b90b5f`          | `cirujano-silente-attack.png`, `cirujano-silente-idle.png`           |
