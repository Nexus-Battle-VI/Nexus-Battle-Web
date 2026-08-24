# Auditoría de recursos externos en HUs

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#249`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#203`

Dependencias documentales relevantes:

- Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#245`
- Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#246`
- Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#248`

## Propósito

Este documento registra el estado de auditoría de los recursos externos observados en los
prediseños/pantallas de Historias de Usuario (HUs) de `Nexus Battles VI`, en el marco de
`EN-021.5 — Auditar los recursos externos utilizados en prototipos y pantallas de las HUs`
(`Nexus-Battle-VI/Nexus-Battle-Management#249`).

Este documento **no sustituye el inventario de activos**. `docs/assets/inventario-activos.md`
continúa siendo la fuente versionada del inventario real de Assets incorporados al producto. Este
documento registra únicamente el estado de la auditoría de pantallas: qué HUs existen, cuáles tienen
contenido visual auditable y qué recursos se observaron en ellas.

## Corte de auditoría

Fecha: `2026-08-23`

Este documento representa un **snapshot reauditable**, no una declaración permanente. El estado
registrado corresponde exclusivamente a lo que existía en las fuentes de Figma en la fecha indicada.
Cuando el prediseño avance, este mismo documento debe actualizarse siguiendo la
[regla de reauditoría](#regla-de-reauditoría).

**Nota de seguimiento (`EN-021.7`)**: los hallazgos de este corte describen el estado de Inter y
Lucide/`Icons/Chevron Down` tal como existían en Figma y en Web el `2026-08-23`, incluyendo
`Estado en Web: NOT IMPLEMENTED` para ambos. Esos hallazgos no se modifican aquí. Posteriormente,
`EN-021.7` (`Refs Nexus-Battle-VI/Nexus-Battle-Management#264`) incorporó ambos recursos realmente al
código de `Nexus-Battle-Web`; el estado vigente se documenta en `docs/assets/README.md`, sección
"Incorporación técnica real (EN-021.7)", y en las dos entradas correspondientes de
`docs/assets/inventario-activos.md`.

## Fuentes revisadas

- Design System: `00 — Nexus Battles VI — Design System`, página `05 — Assets`.
- Prediseños: `01 — Nexus Battles VI — Product Design.`, página `01 — Sprint 1 — Pre-Design`.

## Estado general del corte

```text
TOTAL HU SECTIONS = 15
CONTENT PRESENT   = 1
METADATA ONLY     = 14
EMPTY             = 0
UNKNOWN           = 0
```

- `HU-56` tiene contenido visual disponible y es auditable respecto a `EN-021.5`.
- Las 14 HUs restantes solo contienen el encabezado `Metadata` (Module/Team/Assignee/Sprint/RF/Source):
  están pendientes de auditoría de recursos hasta que exista contenido visual real.

## Matriz completa de HUs

| HU    | título                                                              | módulo                      | node_id  | contenido       | madurez_prediseno | auditabilidad_en_021_5 | observaciones                                                                                  |
| ----- | ------------------------------------------------------------------- | --------------------------- | -------- | --------------- | ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| HU-01 | Registro de cuenta de jugador                                       | Jugador e Inventario        | `20:27`  | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-04 | Recuperación de contraseña                                          | Jugador e Inventario        | `20:47`  | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-05 | Gestión de perfil y preferencias (Mi Cuenta)                        | Jugador e Inventario        | `20:67`  | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-06 | Visualización de estadísticas y logros del jugador                  | Jugador e Inventario        | `20:87`  | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-07 | Selección y equipamiento inicial del héroe                          | Jugador e Inventario        | `20:107` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-27 | Consultar inventario de personajes e ítems                          | Jugador e Inventario        | `20:127` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-28 | Equipar arma, armadura o ítem                                       | Jugador e Inventario        | `20:147` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-37 | Diseñador visual de productos                                       | Administración de Productos | `20:168` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-38 | Notificaciones de catálogo al iniciar sesión y banner informativo   | Administración de Productos | `20:188` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-40 | Publicación de comentario y calificación                            | Usuarios y Comentarios      | `20:209` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-44 | Panel administrativo de búsqueda, filtros y exportación de usuarios | Usuarios y Comentarios      | `20:229` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-46 | Categorías de reporte de comentarios                                | Usuarios y Comentarios      | `20:249` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-56 | Lista de deseos y marcadores de productos adquiridos                | E-commerce                  | `20:270` | CONTENT_PRESENT | PARCIAL           | AUDITABLE_FOR_RNF_21   | Ver [HU-56 — Auditoría del subconjunto existente](#hu-56--auditoría-del-subconjunto-existente) |
| HU-57 | Búsqueda y filtros en la vitrina de E-commerce                      | E-commerce                  | `20:290` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |
| HU-58 | Agregar producto al carrito de compras                              | E-commerce                  | `20:310` | METADATA_ONLY   | PLACEHOLDER       | NOT_AUDITABLE_YET      | Sin pantalla; solo encabezado                                                                  |

`HU-56` tiene un prediseño con madurez `PARCIAL` (no está funcionalmente terminada; ver
[hallazgo de copy](#hallazgo-de-copy-en-hu-56)), pero es `AUDITABLE_FOR_RNF_21`: su contenido visual
es suficiente para auditar los recursos externos que consume, que es el alcance de `EN-021.5`. Madurez
de prediseño y auditabilidad de recursos externos son dos ejes distintos y no deben combinarse en un
único valor.

## HU-56 — Auditoría del subconjunto existente

- Node: `20:270`.
- Título: `Lista de deseos y marcadores de productos adquiridos`.
- Módulo: `E-commerce`.

### Components del Design System observados

Se observaron los siguientes Components reales, instanciados desde la librería publicada del Design
System:

- `Actions/Button`
- `Data & Surfaces/Card`
- `Data & Surfaces/Data Table`
- `Form Fields/Select`
- `Selection Controls/Switch`

Se clasifican exclusivamente como `DESIGN_SYSTEM_COMPONENT`, no como Assets. Un Component reutilizable
no se convierte en Asset externo por el hecho de ser reutilizable: `05 — Assets` gobierna recursos
externos (tipografía, iconografía, imágenes), mientras que estos Components son gobernados por
`03 — Components`. Ninguno de ellos genera por sí mismo una entrada en
`docs/assets/inventario-activos.md`.

### Assets controlados observados

Los Assets externos/controlados realmente observados en `HU-56`, consumidos a través de los
Components anteriores, son:

**Inter**

- Tipo: tipografía.
- Estado en Design System: `IN REVIEW`.
- Uso en HU-56: 33 nodos de texto.
- Licencia upstream: `SIL Open Font License 1.1` (ya documentada y verificada desde fuente primaria
  en `docs/assets/README.md`).
- Estado en Web: `NOT IMPLEMENTED`.
- Inventario ahora: `NO ENTRY YET` — todavía no está incorporada técnicamente a `Nexus-Battle-Web`.

**Lucide / Icons/Chevron Down**

- Tipo: iconografía.
- Referencia controlada: `05 — Assets`, Icon Master `238:197`.
- Uso: consumido dentro de la instancia de `Form Fields/Select` en `HU-56`.
- Procedencia: Lucide.
- Licencia upstream: `ISC License` (ya documentada y verificada desde fuente primaria en
  `docs/assets/README.md`). La gobernanza existente registra que algunos iconos de Lucide derivan de
  Feather bajo licencia MIT; esta auditoría no afirma que `Icons/Chevron Down` en particular tenga esa
  doble licencia, solo que la biblioteca Lucide en su conjunto ya tiene esa distinción documentada.
- Estado en Web: `NOT IMPLEMENTED`.
- Inventario ahora: `NO ENTRY YET` — todavía no está incorporada técnicamente a `Nexus-Battle-Web`.

El detalle legal completo (fuente primaria, texto de licencia, reglas de atribución) no se repite
aquí: ver `docs/assets/README.md`, sección "Relación con fuentes externas" y "Consolidación de
05 — Assets (EN-021.4)".

### Ausencia de otros recursos

No se observaron logos, imágenes, ilustraciones, fotografías, multimedia ni recursos gráficos
adicionales en `HU-56`. Los únicos elementos visuales de la sección son el encabezado `Metadata` y los
cinco Components listados arriba.

### Hallazgo de copy en HU-56

`OPEN DESIGN QUESTION`: el contenido textual visible en `HU-56` ("Torneo competitivo", "Torneos
recientes", y las filas de ejemplo de torneos) no parece corresponder temáticamente con el título de
la HU, `Lista de deseos y marcadores de productos adquiridos`. Esto:

- no es un hallazgo de licencia;
- no es un hallazgo de procedencia;
- no corresponde corregirlo dentro de `EN-021.5`;
- no impide auditar los recursos visuales observados (Components, Inter, Lucide);
- requiere revisión futura por el equipo de diseño antes de considerar la HU madura.

Este documento no modifica el copy ni el diseño de `HU-56`.

## Resultado de auditoría del universo actualmente auditable

```text
HU-56: PASS respecto a trazabilidad de los Assets observados.
Inter: controlado / procedencia identificada.
Lucide/Chevron Down: controlado / procedencia identificada.
Recursos externos nuevos: 0
Recursos externos no verificables: 0
Reemplazos requeridos: 0
```

Este resultado corresponde únicamente al subconjunto auditable hoy (`HU-56`). No constituye ni implica
el cierre global de `EN-021.5`.

## Inventario

`INVENTORY ROWS ADDED: 0`.

La presencia de `Inter` y `Lucide` en Figma, o su consumo dentro de una HU de Figma, no equivale a su
incorporación técnica en `Nexus-Battle-Web`. La entrada correspondiente en
`docs/assets/inventario-activos.md` deberá producirse únicamente cuando `EN-021.7` u otro incremento
real incorpore esos recursos al código del producto, en el mismo Pull Request que realice dicha
incorporación. `docs/assets/inventario-activos.md` no se modifica por este documento.

## Criterios de aceptación (CA-02 / CA-03 / CA-04 / CA-05)

| CA                                                    | Estado sobre universo auditable | Estado global de la Task                                                                         |
| ----------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| CA-02 — trazabilidad de procedencia                   | PASS                            | PARTIAL — 14 de 15 HUs no tienen contenido visual que trazar todavía                             |
| CA-03 — atribuciones documentadas                     | PASS                            | PASS — ninguna licencia identificada exige atribución visible; no depende del universo pendiente |
| CA-04 — sin recursos no verificables como definitivos | PASS                            | NOT EVALUABLE — no puede afirmarse sobre HUs que no existen visualmente todavía                  |
| CA-05 — evidencia de reemplazos, si ocurrieron        | NOT EVALUABLE                   | NOT EVALUABLE — no ha ocurrido ningún reemplazo                                                  |

## Condiciones de finalización

| #   | Condición                                                      | Estado auditable                                                     | Estado global                                                            |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | HUs del incremento revisadas respecto a recursos externos      | PASS (la única HU con contenido, `HU-56`, fue revisada íntegramente) | PARTIAL (1 de 15 HUs tiene contenido)                                    |
| 2   | Cada activo externo definitivo es trazable al inventario       | PASS                                                                 | PASS según el universo existente — sin declarar cierre global de la Task |
| 3   | Atribuciones requeridas registradas                            | PASS                                                                 | PASS                                                                     |
| 4   | Sin recursos externos sin procedencia en pantallas definitivas | PASS                                                                 | NOT EVALUABLE                                                            |
| 5   | Evidencia de reemplazos, si ocurrieron                         | NOT EVALUABLE                                                        | NOT EVALUABLE                                                            |

Las 14 HUs sin contenido visual **no se declaran auditadas** bajo ninguna de estas condiciones.

## Regla de reauditoría

`EN-021.5` permanece abierta. Cuando una HU actualmente `METADATA_ONLY` incorpore una pantalla o
prediseño visual real, debe reauditarse respecto a recursos externos. La actualización correspondiente
debe:

1. identificar la nueva pantalla;
2. identificar sus Components;
3. identificar sus Assets externos;
4. comparar esos Assets contra `05 — Assets`;
5. verificar procedencia y licencia;
6. determinar si corresponde una entrada de inventario;
7. registrar el resultado;
8. conservar evidencia;
9. actualizar este mismo documento.

No es necesario crear un documento nuevo por cada reauditoría: este archivo evoluciona como evidencia
versionada y acumulativa de `EN-021.5`.

## Evidencia manual asociada

| código | Figma                        | sección                     | node      | qué demuestra                                                                          | prioridad |
| ------ | ---------------------------- | --------------------------- | --------- | -------------------------------------------------------------------------------------- | --------- |
| EV-01  | `01 — Sprint 1 — Pre-Design` | vista completa de la página | `13:2`    | Universo real de 15 HUs y su distribución en módulos                                   | REQUIRED  |
| EV-02  | `01 — Sprint 1 — Pre-Design` | HU-56                       | `20:270`  | Única HU con contenido visual; consumo real de Components, Inter y Lucide/Chevron Down | REQUIRED  |
| EV-03  | Design System, `05 — Assets` | Icons/Chevron Down          | `238:197` | Procedencia controlada del icono consumido en HU-56                                    | OPTIONAL  |

No se solicita evidencia de las 14 HUs `METADATA_ONLY` ni de los demás Icon Masters: no aportarían
información adicional a la ya registrada aquí.
