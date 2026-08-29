# Inventario visual oficial de héroes y productos

Fuente de verdad versionada del inventario funcional aprobado de héroes, acciones especiales, armas,
armaduras, ítems y habilidades épicas de `Nexus Battles VI`, tal como será consumido por la futura
biblioteca visual de `EN-026`.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#268`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#263`

## Propósito

`EN-026 — Sistema visual y biblioteca de héroes, equipamiento e ítems`
(`Nexus-Battle-VI/Nexus-Battle-Management#263`) requiere una fuente técnica, trazable y extensible del
inventario aprobado de héroes y productos, previa a cualquier trabajo de representación visual.

`EN-026.1 — Auditar y versionar el inventario visual oficial de héroes y productos`
(`Nexus-Battle-VI/Nexus-Battle-Management#268`) es la Task que audita el estado real del repositorio y
deja versionado ese inventario. **Esta Task no produce recursos visuales, no define la arquitectura de
la biblioteca visual y no instala Three.js.** Esos alcances corresponden a `EN-026.2`, `EN-026.3`,
`EN-026.4` y `EN-026.5`, respectivamente.

## Alcance de esta Task

Este documento **inventaría y clasifica**. No produce modelos 3D, texturas, escenas ni componentes de
render. No decide qué framework de render se usará. No crea combinaciones visuales de equipamiento
sobre el modelo del héroe: la decisión funcional comunicada para `EN-026` es que el héroe no necesita
mostrar visualmente cada arma, armadura o ítem equipado.

## Relación con `EN-021` (propiedad intelectual y licenciamiento)

Este documento **no sustituye ni duplica** `docs/assets/README.md` ni `docs/assets/inventario-activos.md`.
Esos documentos gobiernan la procedencia y el licenciamiento de recursos externos (tipografías, iconos,
imágenes) ya incorporados al código. Los elementos aquí inventariados son entidades de contenido
funcional del producto (héroes, armas, armaduras, ítems, acciones y habilidades épicas), aprobadas por
la línea base docente del proyecto, no recursos externos con licencia de terceros.

Cuando un recurso visual futuro y externo (por ejemplo, un modelo 3D basado en un asset de un tercero)
se incorpore realmente al producto en `EN-026.3`/`EN-026.4`, ese incremento deberá registrar dicho
recurso siguiendo el procedimiento de `docs/assets/README.md`, en el mismo Pull Request que lo
incorpore. Ese registro está fuera del alcance de `EN-026.1`.

## Fuente documental y limitación de acceso

La jerarquía de fuentes de verdad para esta Task es:

1. Mediación Docente de Proyecto Integrador II (contenido funcional aprobado, secciones 6.1.1, 6.1.2,
   Tablas 5 a 20).
2. `EN-026` (`Nexus-Battle-VI/Nexus-Battle-Management#263`) para el alcance del Enabler.
3. `EN-026.1` (`Nexus-Battle-VI/Nexus-Battle-Management#268`) para el alcance concreto de esta Task.
4. Arquitectura y convenciones vigentes de `Nexus-Battle-Web`.

**Limitación registrada explícitamente**: el archivo fuente de la Mediación Docente no está disponible
físicamente para su lectura directa desde este entorno de ejecución. En su ausencia, este inventario
transcribe como línea base trazable el contenido funcional ya definido en el enunciado de `EN-026.1`
(`Management#268`), que se declara derivado de dicha Mediación. No se agrega, corrige ni infiere ningún
dato que no figure en esa línea base. Ninguna denominación de origen (incluyendo las que pudieran
parecer erratas, por ejemplo `Machete vendito`, `Cierra sangrienta`, `Frio concentrado` o
`Té changua`) fue normalizada ni corregida.

## Identificador estable

`docs/assets/README.md` ya establece, para el inventario de activos de `EN-021`, la convención de `id`
único, estable, determinista y en kebab-case. Este documento reutiliza esa misma convención para
mantener coherencia dentro del repositorio, con un formato específico para el dominio de héroes y
productos:

- Héroe: `{heroe-slug}`. Ejemplo: `guerrero-tanque`.
- Recurso asociado a un héroe: `{heroe-slug}--{categoria}--{nombre-slug}`. Ejemplo:
  `guerrero-tanque--accion--golpe-con-escudo`.

`{categoria}` es uno de: `accion`, `arma`, `armadura`, `item`, `epica`. `{nombre-slug}` es el nombre
oficial normalizado a kebab-case únicamente para fines de construcción del identificador (minúsculas,
sin tildes, espacios sustituidos por `-`); el nombre oficial legible se conserva sin alterar en la
columna `nombre`.

Este identificador:

- es único y determinista (se deriva del héroe y del nombre oficial, no de un contador ni de un UUID);
- es legible por una persona que revise el inventario;
- no depende del nombre físico de un archivo de asset, por lo que un recurso visual futuro puede
  asociarse a él sin acoplarse a una convención de nombres de archivo;
- permite extender el catálogo con un noveno héroe o con productos futuros aprobados sin romper los
  identificadores existentes, siempre que el nuevo `heroe-slug` sea distinto de los ya registrados;
- es independiente de cualquier identificador funcional que pudieran definir los servicios backend
  (por ejemplo `sku` en `Catalog`); no existe evidencia en este repositorio de que deban ser iguales, por
  lo que no se mezclan.

## Estado respecto a recurso visual

Todas las filas de este inventario declaran `estado_recurso_visual = NOT_PRODUCED`: la Task `EN-026.1`
inventaría y clasifica contenido funcional ya aprobado, pero **no produce, no genera ni marca como
existente ningún recurso visual**. La producción de esos recursos corresponde a `EN-026.3` (héroes) y
`EN-026.4` (productos/equipamiento reutilizable en catálogo).

No se asume que cada acción especial requiera un modelo o animación independiente, ni que cada
habilidad épica requiera una animación propia, ni que cada arma deba aparecer equipada físicamente
sobre el modelo del héroe: esas decisiones exceden el alcance de `EN-026.1` y no se resuelven aquí.

## Conteos contractuales

| Categoría           | Conteo |
| ------------------- | -----: |
| Héroes              |      8 |
| Acciones especiales |     24 |
| Armas               |     16 |
| Armaduras           |     16 |
| Ítems               |      8 |
| Habilidades épicas  |      8 |

Elementos asociados a héroes/productos sin contar los héroes: **72**. Total de registros conceptuales
incluyendo los 8 héroes: **80**. Estos conteos individuales son la fuente de verdad; `80` no se usa como
requisito de estructura de archivo.

## Héroes

| id                | nombre          | origen_documental                      | estado_recurso_visual | observaciones |
| ----------------- | --------------- | -------------------------------------- | --------------------- | ------------- |
| `guerrero-tanque` | Guerrero Tanque | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-armas`  | Guerrero Armas  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-fuego`      | Mago Fuego      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-hielo`      | Mago Hielo      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-veneno`   | Pícaro Veneno   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-machete`  | Pícaro Machete  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `chaman`          | Chamán          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `medico`          | Médico          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |

Total: 8/8. No existe un noveno héroe en la línea base.

## Acciones especiales

| id                                            | nombre                    | heroe_id          | héroe           | origen_documental                      | estado_recurso_visual | observaciones |
| --------------------------------------------- | ------------------------- | ----------------- | --------------- | -------------------------------------- | --------------------- | ------------- |
| `guerrero-tanque--accion--golpe-con-escudo`   | Golpe con escudo          | `guerrero-tanque` | Guerrero Tanque | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-tanque--accion--mano-de-piedra`     | Mano de piedra            | `guerrero-tanque` | Guerrero Tanque | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-tanque--accion--defensa-feroz`      | Defensa feroz             | `guerrero-tanque` | Guerrero Tanque | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-armas--accion--embate-sangriento`   | Embate sangriento         | `guerrero-armas`  | Guerrero Armas  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-armas--accion--lanza-de-los-dioses` | Lanza de los dioses       | `guerrero-armas`  | Guerrero Armas  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-armas--accion--golpe-de-tormenta`   | Golpe de tormenta         | `guerrero-armas`  | Guerrero Armas  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-fuego--accion--misiles-de-magma`        | Misiles de magma          | `mago-fuego`      | Mago Fuego      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-fuego--accion--vulcano`                 | Vulcano                   | `mago-fuego`      | Mago Fuego      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-fuego--accion--pare-de-fuego`           | Pare de fuego             | `mago-fuego`      | Mago Fuego      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-hielo--accion--lluvia-de-hielo`         | Lluvia de hielo           | `mago-hielo`      | Mago Hielo      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-hielo--accion--cono-de-hielo`           | Cono de hielo             | `mago-hielo`      | Mago Hielo      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-hielo--accion--bola-de-hielo`           | Bola de hielo             | `mago-hielo`      | Mago Hielo      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-veneno--accion--flor-de-loto`         | Flor de loto              | `picaro-veneno`   | Pícaro Veneno   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-veneno--accion--agonia`               | Agonía                    | `picaro-veneno`   | Pícaro Veneno   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-veneno--accion--piquete`              | Piquete                   | `picaro-veneno`   | Pícaro Veneno   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-machete--accion--cortada`             | Cortada                   | `picaro-machete`  | Pícaro Machete  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-machete--accion--machetazo`           | Machetazo                 | `picaro-machete`  | Pícaro Machete  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-machete--accion--planazo`             | Planazo                   | `picaro-machete`  | Pícaro Machete  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `chaman--accion--toque-de-la-vida`            | Toque de la Vida          | `chaman`          | Chamán          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `chaman--accion--vinculo-natural`             | Vínculo Natural           | `chaman`          | Chamán          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `chaman--accion--canto-del-bosque`            | Canto del Bosque          | `chaman`          | Chamán          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `medico--accion--curacion-directa`            | Curación Directa          | `medico`          | Médico          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `medico--accion--neutralizacion-de-efectos`   | Neutralización de Efectos | `medico`          | Médico          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `medico--accion--reanimacion`                 | Reanimación               | `medico`          | Médico          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |

Total: 24/24 (3 por héroe × 8 héroes).

## Armas

| id                                          | nombre                  | heroe_id          | héroe           | origen_documental                      | estado_recurso_visual | observaciones                                                                                    |
| ------------------------------------------- | ----------------------- | ----------------- | --------------- | -------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `guerrero-tanque--arma--espada-de-una-mano` | Espada de una mano      | `guerrero-tanque` | Guerrero Tanque | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `guerrero-tanque--arma--escudo-de-dragon`   | Escudo de dragón        | `guerrero-tanque` | Guerrero Tanque | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `guerrero-armas--arma--espada-de-dos-manos` | Espada de dos manos     | `guerrero-armas`  | Guerrero Armas  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `guerrero-armas--arma--piedra-de-afilar`    | Piedra de afilar        | `guerrero-armas`  | Guerrero Armas  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `mago-fuego--arma--orbe-de-manos-ardientes` | Orbe de manos ardientes | `mago-fuego`      | Mago Fuego      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `mago-fuego--arma--fuego-fatuo`             | Fuego fatuo             | `mago-fuego`      | Mago Fuego      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `mago-hielo--arma--baculo-de-permafrost`    | Báculo de Permafrost    | `mago-hielo`      | Mago Hielo      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `mago-hielo--arma--venas-heladas`           | Venas heladas           | `mago-hielo`      | Mago Hielo      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `picaro-veneno--arma--daga-purulenta`       | Daga purulenta          | `picaro-veneno`   | Pícaro Veneno   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `picaro-veneno--arma--vision-borrosa`       | Visión borrosa          | `picaro-veneno`   | Pícaro Veneno   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `picaro-machete--arma--machete-vendito`     | Machete vendito         | `picaro-machete`  | Pícaro Machete  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          | Denominación conservada exactamente como figura en la fuente; no se corrigió por posible errata. |
| `picaro-machete--arma--cierra-sangrienta`   | Cierra sangrienta       | `picaro-machete`  | Pícaro Machete  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          | Denominación conservada exactamente como figura en la fuente; no se corrigió por posible errata. |
| `chaman--arma--raiz-china`                  | Raíz china              | `chaman`          | Chamán          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `chaman--arma--yerbabuena`                  | Yerbabuena              | `chaman`          | Chamán          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `medico--arma--kit-de-urgencias`            | Kit de urgencias        | `medico`          | Médico          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |
| `medico--arma--reanimador`                  | Reanimador              | `medico`          | Médico          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                                  |

Total: 16/16 (2 por héroe × 8 héroes).

## Armaduras

Slots permitidos en esta línea base: `Casco`, `Pecho`, `Guantes`, `Brazaletes`, `Pantalón`, `Zapatos`.
No se registran slots adicionales a los que figuran en la fuente.

| id                                                  | nombre                        | heroe_id          | héroe           | slot       | origen_documental                      | estado_recurso_visual | observaciones |
| --------------------------------------------------- | ----------------------------- | ----------------- | --------------- | ---------- | -------------------------------------- | --------------------- | ------------- |
| `guerrero-tanque--armadura--defensa-del-enfurecido` | Defensa del enfurecido        | `guerrero-tanque` | Guerrero Tanque | Pecho      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-tanque--armadura--magma-ardiente`         | Magma Ardiente                | `guerrero-tanque` | Guerrero Tanque | Casco      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-armas--armadura--puno-lucido`             | Puño lúcido                   | `guerrero-armas`  | Guerrero Armas  | Guantes    | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-armas--armadura--punos-en-llamas`         | Puños en llamas               | `guerrero-armas`  | Guerrero Armas  | Brazaletes | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-fuego--armadura--tunica-arcana`               | Túnica arcana                 | `mago-fuego`      | Mago Fuego      | Pecho      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-fuego--armadura--caida-de-fuego`              | Caída de fuego                | `mago-fuego`      | Mago Fuego      | Pantalón   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-hielo--armadura--corona-de-hielo`             | Corona de hielo               | `mago-hielo`      | Mago Hielo      | Casco      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-hielo--armadura--ventisca`                    | Ventisca                      | `mago-hielo`      | Mago Hielo      | Pecho      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-veneno--armadura--mano-del-desterrado`      | Mano del desterrado           | `picaro-veneno`   | Pícaro Veneno   | Guantes    | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-veneno--armadura--atadura-carmesi`          | Atadura carmesí               | `picaro-veneno`   | Pícaro Veneno   | Pecho      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-machete--armadura--pie-de-atleta`           | Pie de atleta                 | `picaro-machete`  | Pícaro Machete  | Zapatos    | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-machete--armadura--sangre-cruel`            | Sangre cruel                  | `picaro-machete`  | Pícaro Machete  | Brazaletes | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `chaman--armadura--piel-de-caminante-del-bosque`    | Piel de Caminante del Bosque  | `chaman`          | Chamán          | Pecho      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `chaman--armadura--casco-de-ecos-ancestrales`       | Casco de Ecos Ancestrales     | `chaman`          | Chamán          | Casco      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `medico--armadura--bata-de-cirujano`                | Bata de Cirujano              | `medico`          | Médico          | Pecho      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `medico--armadura--pantalon-de-expedicion-medica`   | Pantalón de Expedición Médica | `medico`          | Médico          | Pantalón   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |

Total: 16/16 (2 por héroe × 8 héroes).

## Ítems

| id                                              | nombre                      | heroe_id          | héroe           | origen_documental                      | estado_recurso_visual | observaciones |
| ----------------------------------------------- | --------------------------- | ----------------- | --------------- | -------------------------------------- | --------------------- | ------------- |
| `guerrero-tanque--item--pinchos-de-escudo`      | Pinchos de escudo           | `guerrero-tanque` | Guerrero Tanque | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `guerrero-armas--item--empunadura-de-furia`     | Empuñadura de Furia         | `guerrero-armas`  | Guerrero Armas  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-fuego--item--anillo-para-piro-explosion`  | Anillo para Piro-explosión  | `mago-fuego`      | Mago Fuego      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `mago-hielo--item--libro-de-la-ventisca-helada` | Libro de la ventisca helada | `mago-hielo`      | Mago Hielo      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-veneno--item--veneno-lacerante`         | Veneno lacerante            | `picaro-veneno`   | Pícaro Veneno   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `picaro-machete--item--mancuerna-yugular`       | Mancuerna yugular           | `picaro-machete`  | Pícaro Machete  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `chaman--item--pluma-sanadora`                  | Pluma sanadora              | `chaman`          | Chamán          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |
| `medico--item--benditas`                        | Benditas                    | `medico`          | Médico          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |               |

Total: 8/8 (1 por héroe × 8 héroes).

## Habilidades épicas

| id                                               | nombre                  | heroe_id          | héroe           | origen_documental                      | estado_recurso_visual | observaciones                                                                       |
| ------------------------------------------------ | ----------------------- | ----------------- | --------------- | -------------------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `guerrero-tanque--epica--golpe-de-defensa`       | Golpe de defensa        | `guerrero-tanque` | Guerrero Tanque | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                     |
| `guerrero-armas--epica--segundo-impulso`         | Segundo impulso         | `guerrero-armas`  | Guerrero Armas  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                     |
| `mago-fuego--epica--luz-cegadora`                | Luz cegadora            | `mago-fuego`      | Mago Fuego      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                     |
| `mago-hielo--epica--frio-concentrado`            | Frio concentrado        | `mago-hielo`      | Mago Hielo      | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          | Denominación conservada exactamente como figura en la fuente (sin tilde en "Frio"). |
| `picaro-veneno--epica--toma-y-lleva`             | Toma y lleva            | `picaro-veneno`   | Pícaro Veneno   | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                     |
| `picaro-machete--epica--intimidacion-sangrienta` | Intimidación sangrienta | `picaro-machete`  | Pícaro Machete  | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                     |
| `chaman--epica--te-changua`                      | Té changua              | `chaman`          | Chamán          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          | Denominación conservada exactamente como figura en la fuente.                       |
| `medico--epica--reanimador-3000`                 | Reanimador 3000         | `medico`          | Médico          | Línea base `EN-026.1` (Management#268) | NOT_PRODUCED          |                                                                                     |

Total: 8/8 (1 por héroe × 8 héroes).

## Pendientes reales

- La Mediación Docente de Proyecto Integrador II no está disponible físicamente en este entorno para
  verificación directa; ver [Fuente documental y limitación de acceso](#fuente-documental-y-limitación-de-acceso).
  Si el archivo se pone a disposición en el futuro, corresponde una reauditoría de este inventario
  contra la fuente primaria.
- No existen, a la fecha de este corte, recursos visuales producidos para ningún héroe ni producto: los
  80 registros de este documento están en `NOT_PRODUCED`.

## Handoff / consideraciones para `EN-026.2`

Estas observaciones se registran únicamente como insumo para que `EN-026.2` las evalúe al definir la
arquitectura de la biblioteca visual; `EN-026.1` no las implementa:

- `EN-026.2` deberá decidir si el `id` estable definido aquí (`{heroe-slug}--{categoria}--{nombre-slug}`)
  se usa directamente como clave de asociación de un futuro modelo Three.js, o si define una capa de
  mapeo adicional.
- `EN-026.2` deberá decidir la estructura de carpetas/nomenclatura de archivos de assets 3D, sin que ese
  nombre de archivo sea la única fuente de verdad del elemento que representa (requisito ya impuesto por
  `EN-026` sobre este inventario).
- Los 8 héroes tendrán representación visual propia; los productos aprobados que deban mostrarse en
  catálogo/inventario/equipamiento/E-commerce tendrán recursos reutilizables. El héroe no necesita
  mostrar visualmente cada arma/armadura/ítem equipado: `EN-026.2` no debe ampliar el alcance generando
  combinaciones visuales de equipamiento no solicitadas.
- Cuando `EN-026.3`/`EN-026.4` incorporen un recurso visual externo (no producido internamente), ese
  incremento deberá generar su entrada correspondiente en `docs/assets/inventario-activos.md` siguiendo
  `docs/assets/README.md`, en el mismo Pull Request.

## Extensibilidad

Este inventario admite, sin romper su estructura ni sus identificadores existentes:

- un noveno héroe futuro aprobado, agregando una fila a la tabla de héroes con un `heroe_id` nuevo y
  distinto de los ocho ya registrados;
- productos futuros aprobados para un héroe existente, agregando filas con el mismo `heroe_id` y un
  `{nombre-slug}` distinto dentro de su categoría;
- nuevas categorías de producto, si `EN-026` las aprobara en el futuro, sin alterar las categorías ya
  registradas (`accion`, `arma`, `armadura`, `item`, `epica`).

Ningún elemento de este documento fue inventado: cada fila corresponde uno a uno con la línea base
funcional descrita en `EN-026.1` (`Management#268`).
