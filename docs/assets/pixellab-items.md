# Arte pixel de productos, habilidades, épicas y animaciones de héroe (EN-031)

Es el respaldo de la entrada `pixellab-items` de [`inventario-activos.md`](./inventario-activos.md).

Todo se generó o se entregó como pixel art de PixelLab con la suscripción del equipo; nada se pide a PixelLab en tiempo de ejecución. Los derivados se reproducen byte a byte con:

```
node scripts/process-item-assets.mjs --source <carpeta>
node scripts/process-hero-animations.mjs --source <carpeta>
```

## Clave del arte

Cada producto se reconoce por `slug(nombre)`, que coincide con el prefijo del `sku` de Catalog (`<slug>-<8 hex>`). Un producto sin entrada en `src/shared/visual-library/items/item-sprites.json` sigue mostrando su `imageUrl`.

## Entregados en el ZIP `nexus-ecommerce-items-animados.zip` (40)

Las armas, armaduras e ítems oficiales, 5 por héroe. Cada hoja trae la pose base en la fila 0 y la animación en la fila 1 (9 o 17 celdas de 64×64); se publica solo la fila 1. «Mano del desterrado» llega en fotogramas sueltos.

| Slug                            | Héroe             | Formato               | SHA-256 del origen  |
| ------------------------------- | ----------------- | --------------------- | ------------------- |
| `casco-de-ecos-ancestrales`     | chaman            | hoja (fila 1)         | `e7a4a41815f5c9a4…` |
| `piel-de-caminante-del-bosque`  | chaman            | hoja (fila 1)         | `51e719c202f5aa71…` |
| `pluma-sanadora`                | chaman            | hoja (fila 1)         | `a73e301efe83168d…` |
| `raiz-china`                    | chaman            | hoja (fila 1)         | `23d81ba3de0d3d6f…` |
| `yerbabuena`                    | chaman            | hoja (fila 1)         | `d8868fedb0fd2ad6…` |
| `empunadura-de-furia`           | guerrera-de-armas | hoja (fila 1)         | `247686e757753bee…` |
| `espada-de-dos-manos`           | guerrera-de-armas | hoja (fila 1)         | `49c9a4132c7afe80…` |
| `piedra-de-afilar`              | guerrera-de-armas | hoja (fila 1)         | `d5c5081a50c4c5bd…` |
| `puno-lucido`                   | guerrera-de-armas | hoja (fila 1)         | `0cac4d9009ae1e4d…` |
| `punos-en-llamas`               | guerrera-de-armas | hoja (fila 1)         | `594f9414b0e1591f…` |
| `defensa-del-enfurecido`        | guerrero-tanque   | hoja (fila 1)         | `ff536c5cf325b734…` |
| `escudo-de-dragon`              | guerrero-tanque   | hoja (fila 1)         | `ad548578fc0def09…` |
| `espada-de-una-mano`            | guerrero-tanque   | hoja (fila 1)         | `0eba31107d64c48b…` |
| `magma-ardiente`                | guerrero-tanque   | hoja (fila 1)         | `908fde3a49fa2aaf…` |
| `pinchos-de-escudo`             | guerrero-tanque   | hoja (fila 1)         | `aefaca042d994833…` |
| `baculo-de-permafrost`          | maga-de-hielo     | hoja (fila 1)         | `08e352eb054ba9a6…` |
| `corona-de-hielo`               | maga-de-hielo     | hoja (fila 1)         | `832e521078f3244d…` |
| `libro-de-la-ventisca-helada`   | maga-de-hielo     | hoja (fila 1)         | `815da9448abd92ba…` |
| `venas-heladas`                 | maga-de-hielo     | hoja (fila 1)         | `8be1f0f616a7df39…` |
| `ventisca`                      | maga-de-hielo     | hoja (fila 1)         | `e0c309278e277997…` |
| `anillo-para-piro-explosion`    | mago-de-fuego     | hoja (fila 1)         | `34b1cad63ba6888a…` |
| `caida-de-fuego`                | mago-de-fuego     | hoja (fila 1)         | `3b324ecd49255d03…` |
| `fuego-fatuo`                   | mago-de-fuego     | hoja (fila 1)         | `43df92807758b0f5…` |
| `orbe-de-manos-ardientes`       | mago-de-fuego     | hoja (fila 1)         | `d0d4a99357de845b…` |
| `tunica-arcana`                 | mago-de-fuego     | hoja (fila 1)         | `0d99310e8feaf5e8…` |
| `bata-de-cirujano`              | medica-de-campo   | hoja (fila 1)         | `29a384e025a7fe8a…` |
| `benditas`                      | medica-de-campo   | hoja (fila 1)         | `3adc0e4fec9e7135…` |
| `kit-de-urgencias`              | medica-de-campo   | hoja (fila 1)         | `f425d5ed88a19304…` |
| `pantalon-de-expedicion-medica` | medica-de-campo   | hoja (fila 1)         | `75efd5a4789b6cf4…` |
| `reanimador`                    | medica-de-campo   | hoja (fila 1)         | `89c5b7515057e315…` |
| `atadura-carmesi`               | picara-de-veneno  | hoja (fila 1)         | `06f522fcb9cb0055…` |
| `daga-purulenta`                | picara-de-veneno  | hoja (fila 1)         | `f1d895fce15237f7…` |
| `mano-del-desterrado`           | picara-de-veneno  | 17 fotogramas sueltos | `870a32ca7cbed739…` |
| `veneno-lacerante`              | picara-de-veneno  | hoja (fila 1)         | `7b99ca9e468b7fce…` |
| `vision-borrosa`                | picara-de-veneno  | hoja (fila 1)         | `a965a3a72e7a2275…` |
| `cierra-sangrienta`             | picaro-de-machete | hoja (fila 1)         | `8a56bdd4a5ddcff6…` |
| `machete-vendito`               | picaro-de-machete | hoja (fila 1)         | `341f5f5f2188fa6d…` |
| `mancuerna-yugular`             | picaro-de-machete | hoja (fila 1)         | `7febab48826f22d8…` |
| `pie-de-atleta`                 | picaro-de-machete | hoja (fila 1)         | `2bad80caa356d9be…` |
| `sangre-cruel`                  | picaro-de-machete | hoja (fila 1)         | `b98022418816793a…` |

## Generados con PixelLab (62)

Imagen base con `create_image_pixen` (64×64, 1 generación) y animación con `animate_image` (8 fotogramas más la imagen de partida, 1 generación). Son las 24 habilidades, las 8 épicas y los 30 productos creados desde la Consola que no tenían arte.

| Slug                        | Imagen base                            | Animación                              |
| --------------------------- | -------------------------------------- | -------------------------------------- |
| `agonia`                    | `9ee4f165-4577-4265-91c6-cdbdee11f313` | `6df4650e-8b46-48fe-b654-09e1ff585d47` |
| `arco-del-destino`          | `8eb0fdb8-ae6d-4258-99dc-e174447b536f` | `c7dd36c9-db0e-4049-91cb-85c8025cff72` |
| `baston-de-dragon`          | `ce66c6ad-de7a-45d1-94e2-1207a0376d2e` | `3b184eed-f206-43b2-8510-168ee642b5f0` |
| `bola-de-hielo`             | `5d65fd94-b8ae-489b-a348-984606d41bfe` | `36353109-9d8d-436b-8eed-b2ea987d7013` |
| `botas-de-anclaje`          | `6464406b-c553-4dad-a098-cf39ccf6eccc` | `fc3270a6-93d2-4a74-97d4-3a0e02d9150c` |
| `botas-de-plata`            | `b54b582d-a1c7-4a0a-b712-99c410460f5c` | `36c057f8-c75e-4b8b-8b6b-b5263ba3a88d` |
| `brazalete-de-hierro`       | `f4f79367-6872-40dc-a0e4-523c8756a44c` | `ecae78a2-cddd-4111-849f-e367f5c243d5` |
| `brazalete-de-plata`        | `f2f55a70-fbc7-4028-84f6-0a5eb6f088c4` | `05194e78-606b-4646-96cc-944e7c265f13` |
| `brazalete-de-slime`        | `b9a3e2fc-2d51-4353-829c-e5d82bb2e4b3` | `3a3fe528-69e4-4a32-95fa-98f894725e75` |
| `brazaletes-muralla`        | `03218fe9-a3f8-4920-afbb-4e01a5424ec2` | `2052a056-6ea8-4bef-8f30-f6d11eb56f85` |
| `canto-del-bosque`          | `242825d7-068e-4b68-a960-b5144375e113` | `0bc3336d-db8d-4730-ac87-4ba34236abb0` |
| `casco-de-hierro`           | `f0296318-739d-4966-adaa-fc41094cc08c` | `bf770125-2f63-4165-9cf0-f44f10dc1a1e` |
| `casco-de-plata`            | `efae5f98-d955-41bb-9622-eb229553891b` | `b5dcf40f-8683-4c7d-ae69-684a06b0edd6` |
| `changua-curativa`          | `d95bbc2c-4106-40d9-a3c8-7ce8edec40fb` | `674451f8-cb49-471a-98df-e8670881cf94` |
| `changua-curativa-pro`      | `5dc3629d-56ec-4959-aa75-c36561f2b412` | `36554626-407a-4545-9f2e-9ac6bd00aecb` |
| `cono-de-hielo`             | `13c5fc42-e6cf-4675-aee3-5aa1e8678806` | `bcb16359-a7cf-4a4e-8526-223fb31f561e` |
| `cortada`                   | `d0faf357-c4f5-4642-855c-c92964322b34` | `d5cdcdf8-c3ad-42f8-b6c6-49ad2901d0da` |
| `curacion-directa`          | `507bd4bc-2aeb-4066-bc0e-21964cdfefde` | `d5ef69e4-e6a8-4245-a07c-4ffef54f5643` |
| `daga-de-fuego`             | `126a936e-45e8-47ef-adc9-dd3a376c91a0` | `732b2436-0f9e-4906-b32a-11998d0cf91d` |
| `defensa-feroz`             | `573fc115-4c06-4b85-9bda-5371e5aa4476` | `4b554d35-9b7c-4361-9649-54035277fd2e` |
| `embate-sangriento`         | `e3312a0b-07e2-447a-aab8-0d2c605db31c` | `454eb256-6ce8-4b27-b07f-0bd7bd62f7e7` |
| `epica-de-muertacular`      | `e2fd1a2d-0bbd-4e3a-bdd8-64ea8b30b9d1` | `7825b921-ea9f-459c-8b10-13775ec6280c` |
| `epica-de-veneno`           | `8fecca62-cb65-4d30-b394-a3837510bb63` | `60d27bd0-980e-4980-87b8-0129ec7dc47f` |
| `espada-de-fuego`           | `0d9c5598-b828-47db-8f99-7446c806d4a5` | `060e8556-fe67-4c8d-b4b4-e0e37d7f49de` |
| `espada-de-hielo`           | `5f8e6de1-7231-44a2-97e4-197c1a20e864` | `4c3492b8-c4d3-4daf-8e1d-a4c32b402f79` |
| `espada-de-plata`           | `2b049fa0-7d9b-426e-9718-9b08cf0609c3` | `a89a04b2-5a99-4297-a029-2346a825b7aa` |
| `espada-relampago`          | `7043d927-b5b4-490c-a52f-69e0dfaf2869` | `7e53622b-dfda-472c-9bc7-0da5efd72fad` |
| `flor-de-loto`              | `e43ddb30-38d1-4546-be64-5c6dbd6dd721` | `30c4f998-9c4c-43a7-8b7d-bf3b70aab494` |
| `frio-concentrado`          | `68e86fad-8615-4d79-8b8d-809cd66c419e` | `983d2888-f7dc-42b5-a1d9-4ff09d137ee2` |
| `golpe-con-escudo`          | `69e710d2-aac2-4a3c-9b76-1f8d1b8124a8` | `c380bcc1-b6c8-4c04-ab7d-7469a3fd3c80` |
| `golpe-de-defensa`          | `ebd33f21-568d-4aeb-8483-31f99153b627` | `7c7cc0ac-01be-4f81-b764-ed571cecc1ec` |
| `golpe-de-tormenta`         | `d5d861bc-f03d-4d3d-b66b-63a44f7da8c1` | `339994b8-c173-4628-899a-a3228f802ade` |
| `grebas-del-centinela`      | `0f708f35-8dba-4092-8d38-5638d2ddfaca` | `75431d24-ea49-4acd-a5c9-d5166cb13fea` |
| `guanteletes-bastion`       | `1532ba1f-902c-43aa-9e02-85eb2b28404d` | `e97b847e-e5a8-4407-908b-0e96a6905b25` |
| `guantes-de-cuero`          | `f9fc6ddb-ed38-474d-940c-8be88b2e1694` | `b571d28d-aede-46b6-9a7d-4ed2aea6180a` |
| `guantes-de-hierro`         | `bc26e205-3746-4e54-809b-773abeb0b87b` | `ae7f8b4d-f75d-433e-b614-1cd2ccb03663` |
| `guantes-de-plata`          | `3fb0e587-e674-4bc6-810a-0be4584bfb8a` | `b320e7b7-8e12-427d-a4e5-23d273013bfe` |
| `intimidacion-sangrienta`   | `d39e979b-13ae-4e32-89e7-3f3ba4de21ee` | `f15cdcfe-baef-455f-a564-6a35f64a2a82` |
| `lanza-de-los-dioses`       | `497f3a73-bde1-455c-82d1-ea1e067c6871` | `73aafa4a-40e3-46e2-aed0-5bcb3fe6e6b5` |
| `lluvia-de-hielo`           | `30b87b0b-b46e-4803-b3da-56a547ecd05a` | `dbaffc4c-1b9f-41eb-9c2e-2471bc4bd604` |
| `luz-cegadora`              | `cc635133-e0f9-4b4b-ac5e-76f9a7c77b9b` | `ec6e2112-39c6-433a-a05d-7da081dab0c0` |
| `machetazo`                 | `78e69be4-e500-4f06-82ae-59bb570a2324` | `b419e3a8-48b0-4644-a6db-7a8cbb782862` |
| `mano-de-piedra`            | `6d7d80c2-f7df-45bd-b859-72f8b181f768` | `ed46df51-63e2-4a93-9f04-cfb4a0f9fe9f` |
| `misiles-de-magma`          | `0e14be55-33fb-4482-963c-60c04365afac` | `70a76436-0689-46b2-9d3c-c68f5bb03f01` |
| `neutralizacion-de-efectos` | `9a15a0f8-5691-4f65-ad4c-74fe91a32964` | `a2ccc57b-76c0-4956-aca0-3e7e788768f5` |
| `pantalon-de-plata`         | `88af4442-563a-4b6e-8e05-c075b62fdb5b` | `5eebe47a-5e5b-4822-9c22-844475f2e3eb` |
| `pantalones-de-cuero`       | `b1fe89fd-7425-4301-9b2d-2af1fa5666b9` | `66a5b423-b34e-40a3-90f5-0bb46e45bfe0` |
| `pantalones-de-hierro`      | `50201053-7809-486e-90cd-126c3b2c95f9` | `4b1ded6d-54a7-4cde-bd2d-07c074c90939` |
| `pare-de-fuego`             | `e9a35a75-726e-4eff-b7aa-53b2ca78b755` | `2700bf2c-c368-43f7-8c12-4a01f3c44772` |
| `pechera-de-plata`          | `749ff6d6-c6e5-4701-9b5b-fb912b0ab97d` | `4bef08a3-dc3a-4dfb-bdc8-c38d2a6377b4` |
| `pecho-de-hierro`           | `e6a01fd5-f6f5-46c1-ab1d-a9b268b3686d` | `4758e6ee-c5bc-4ff1-a411-701ad4708ed3` |
| `piquete`                   | `c1a16692-b9c7-45b2-8875-c5808aca1262` | `00e6322c-c77b-4080-957b-9dcfacf1ccb9` |
| `planazo`                   | `1a1a952c-4fcc-4189-ba91-c8a646f8c7af` | `ab682923-7bae-4e08-980c-924113272220` |
| `reanimacion`               | `3d33d289-3f98-4f2f-b468-573a1c2845df` | `d1fa8386-699b-4558-beff-28835dd4b510` |
| `reanimador-3000`           | `60f15635-02d8-4a8d-9bd2-888375713519` | `51c7bdc2-99b9-4df7-974e-6c1ff6f57149` |
| `segundo-impulso`           | `c7ce7ba8-cdf5-40d9-82d5-15af1f57aad4` | `01144c03-ee98-44e0-ae64-f69dd4bc905f` |
| `te-changua`                | `06d9cb96-3a2f-42b5-a94f-49cb69cd9abc` | `f2308f45-dd0e-40c2-9333-3cec9663ffaf` |
| `toma-y-lleva`              | `cb7a43ed-d8ef-4120-b123-3d8542ed66a0` | `d7269b7a-5220-4d7c-a2ca-30d8ec57e2cf` |
| `toque-de-la-vida`          | `fd2ae16e-215f-4a7d-8fd8-e887edb88625` | `3e59a863-5a66-4382-843b-0af4d192a1c3` |
| `vinculo-natural`           | `3134690f-38f1-4229-aa70-619d6ac5c234` | `88c8f381-f7ae-4977-a302-fa63b3c530c5` |
| `vulcano`                   | `38e13d53-04e6-4749-b14c-6b77d9c49f3c` | `76ec348b-d519-49b0-b571-b46b37b2758a` |
| `zapatos-de-hierro`         | `a8f961bd-3ea5-42bc-ba49-746241b626d6` | `63fbca63-f7ad-448a-8a65-cd5192e3c1b4` |

**Descartadas:**

- `golpe-con-escudo`: `e42d6946-83ac-4c7a-9272-3b9e3b03be3c` — chest mixed with shield
- `lluvia-de-hielo`: `aa67d813-8613-4368-a915-380bf3eef094` — reads as a tree
- `machetazo`: `2be5190b-8fe0-4bb7-907a-8ca03e8dad20` — tiny unclear blade
- `casco-de-hierro`: `bb018e3f-c322-467e-8fb7-a42b2496e63a` — framed portrait background
- `guantes-de-hierro`: `82840889-5add-4079-8ff3-5b59e388aca9` — reads as a breastplate
- `curacion-directa`: `77c73465-d804-4faf-a1d8-d2a87984bd6a` — animacion que se desvanece (cobertura 10%)

## Animaciones de héroe añadidas (28)

`animate_image` a partir de la pose de cada dirección del export original. Se añaden como filas nuevas debajo de la hoja original en `public/assets/heroes/sprites/<carpeta>/en031-<héroe>.png`; el PNG y el JSON del export no se tocan y conservan el SHA-256 de `provenance.json`.

| Héroe           | Tipo   | Dirección  | Trabajo                                |
| --------------- | ------ | ---------- | -------------------------------------- |
| guerrero-tanque | attack | south-east | `8355ce8d-ee11-4abc-ad3d-5508623c76af` |
| guerrero-tanque | attack | north-west | `6dc885d4-fda5-40ae-96a7-dd293be5c828` |
| guerrero-armas  | attack | south-east | `33fb5c39-ebb0-4d41-b34e-5c8a421e4a09` |
| guerrero-armas  | attack | north-west | `051a83df-ca2e-4423-b575-323afeb9ceb8` |
| mago-fuego      | attack | south-east | `b42cb1b2-886a-4b80-8040-fc6ad6dc340d` |
| mago-fuego      | attack | north-west | `b147a10d-08bb-4935-9515-803e66b90510` |
| mago-hielo      | attack | south-east | `d2c47aa8-95a5-4e25-ba92-51ed37e248e2` |
| mago-hielo      | attack | north-west | `ce92be00-4a19-46f5-aeed-6d43aa29ce4e` |
| picaro-veneno   | attack | south-east | `a39a5401-979e-4cbf-b7fb-851e5f288abe` |
| picaro-veneno   | attack | north-west | `44c7c5d8-52c7-40af-8d20-f43d2eaedb7c` |
| picaro-machete  | attack | south-east | `5ee5b2a4-aeca-4b52-978a-8769e4ebdf37` |
| picaro-machete  | attack | north-west | `2c67ba49-e7d2-4f60-b06a-d5e2966e1349` |
| chaman          | attack | south-east | `f222f17f-6918-454e-ac32-a5e7fb8db87f` |
| chaman          | attack | north-west | `75bd64c0-7cd3-46a2-ae2e-54f040de36a6` |
| medico          | attack | south-east | `b72b9e18-0711-47eb-a512-3d894fd3527b` |
| medico          | attack | north-west | `028d5144-16bd-4a11-a6ad-dd4c78ab9913` |
| medico          | idle   | south-east | `479b5ff1-dfb6-4639-a3f4-270fa3289868` |
| medico          | idle   | north-west | `dbb23f03-df88-429e-9c22-1e34ae7c2d06` |
| medico          | hit    | south-east | `caf82339-b125-41b6-917d-8007bd168b02` |
| medico          | hit    | north-west | `1d69e3d7-745b-4292-b198-ac19a1371d65` |
| chaman          | idle   | north-west | `af310857-abb9-4975-bf92-78687e3cf477` |
| chaman          | hit    | south-east | `b9157cd3-824e-4eb0-9317-a6d90b3e4dd0` |
| chaman          | hit    | north-west | `70de983d-d495-41f8-9bd2-84c9894271d1` |
| picaro-veneno   | hit    | south-east | `b22c71e4-dfbf-4816-8556-4800cf5b8bfe` |
| picaro-veneno   | hit    | north-west | `ff11ca43-0de4-4346-a044-f352188a4682` |
| guerrero-tanque | hit    | north-west | `8ab15559-6d61-499b-bb21-783c484ecebc` |
| guerrero-armas  | hit    | south-east | `06cc127a-3b60-484c-a1d9-985a15b8f151` |
| guerrero-armas  | hit    | north-west | `20418bf3-2be6-4130-8887-aaec658e526e` |

## Interruptor de tema

El sol y la luna del interruptor Light/Dark están en [`pixellab-shell.md`](./pixellab-shell.md).
