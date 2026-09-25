# HU-09 - Experiencia por derrota de un rival (interfaz del informe de misión)

Trazabilidad: `HU-09` → Management [`#18`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/18) → Task de Web [`#443`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/443) → `api`, `missionReport`, `useMissionReport`, `experiencePresentation`, `MissionExperiencePanel` y `MissionReportPage`.

La HU acredita experiencia al héroe por **cada NPC derrotado** en una misión: una tirada `1d8` por derrota, `10 × 1,2^(1d8)` de experiencia, acreditada en Player/Inventory. Este documento describe **solo la interfaz**. La tirada es de **Combat** (`ADR-021`), el cálculo y la coordinación de **Missions**, la acreditación y el nivel de **Player/Inventory** (`ADR-019`, tabla de HU-08); el contrato está en
[`docs/contracts/hu-09-experience-reward-v1.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/hu-09-experience-reward-v1.md)
de Infrastructure y el detalle de Missions en
[`docs/hu-09-experiencia.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Missions/blob/develop/docs/hu-09-experiencia.md).

## Qué hace la interfaz (y qué no)

|                                       | Web                                                                                                     | Missions / Combat / Player-Inventory                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Experiencia acreditada en la misión   | **Muestra** `experience.totalXp` tal cual                                                               | Todo (tirada de Combat, importe de Missions)              |
| Derrotas registradas y acreditadas    | **Muestra** `defeats` y el cociente `credited / defeats`                                                | Todo (una recompensa por instancia de derrota)            |
| Nivel del héroe y niveles cruzados    | **Muestra** `level`, `maxLevel` y `levelsGained`; **nunca** los calcula ni los deduce de la experiencia | Todo (Player/Inventory, tabla de niveles de HU-08)        |
| Cuándo la experiencia está acreditada | Solo cuando el estado de la línea lo dice: `PENDING` nunca se cuenta como entregada y `FAILED` se avisa | Todo (estado por derrota, terminal en acreditada/fallida) |
| Detalle por derrota                   | **Lista** cada línea `EXPERIENCE` del informe, con su estado en texto                                   | Todo                                                      |
| Recuperación tras un refresh          | **Sondea** `GET /v1/missions/me/reports/{enrollmentId}` mientras quede alguna derrota por resolver      | El informe es una foto inmutable; sus líneas se mueven    |

Web **nunca** suma experiencia, no redondea, no compara con umbrales y no decide el nivel: todo llega ya resuelto, y la guarda estática de la feature lo comprueba.

## De dónde salen los datos

El informe de misión de HU-74 (`GET /api/v1/missions/me/reports/{enrollmentId}`) gana un bloque `experience` con la experiencia de la misión ya agregada:

```json
{
  "experience": {
    "defeats": 19,
    "totalXp": 54,
    "credited": 3,
    "pending": 16,
    "failed": 0,
    "level": 3,
    "currentXp": 657,
    "maxLevel": 8,
    "levelsGained": 2,
    "leveledUp": true
  }
}
```

`level`, `currentXp` y `maxLevel` son `null` mientras no haya ninguna acreditación: un `0` sería un nivel que el héroe no tiene. El bloque es **opcional** en el tipo: contra un Missions anterior a esta Task el informe no lo trae, y la pantalla lo dice en lugar de inventar ceros.

Cada recompensa sigue viajando además como una línea de `rewards[]` (`kind: 'EXPERIENCE'`, `source: 'HU-09'`, `reference` = `<enemyRef>#<n>`), y su `quantity` **es la experiencia acreditada** de esa derrota concreta: `0` mientras está pendiente.

## Qué hay

| Pieza                    | Dónde                                 | Qué hace                                                                                                                                                                  |
| ------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`                    | `missions/api.ts`                     | `fetchMissionReport` (`GET /v1/missions/me/reports/{enrollmentId}`), tipos del informe y del bloque de experiencia; el jugador sale del testimonio, nunca de un parámetro |
| `missionReport`          | `missions/missionReport.ts`           | Lectura tolerante del bloque (`readExperience`), selección de las líneas `HU-09` (`experienceLinesOf`) y etiquetas de dificultad y desenlace                              |
| `useMissionReport`       | `missions/useMissionReport.ts`        | `useQuery` habilitado solo con matrícula; sondea cada 1500 ms mientras `pending` no sea cero                                                                              |
| `experiencePresentation` | `missions/experiencePresentation.ts`  | Módulo puro: los tres estados en una frase, XP acreditada, nivel, subida de nivel y estado de una derrota en texto                                                        |
| `MissionExperiencePanel` | `missions/MissionExperiencePanel.tsx` | Panel presentacional: XP, derrotas, nivel, aviso de estado y desplegable con el detalle por derrota, con el estado de cada una en texto                                   |
| `MissionReportPage`      | `missions/MissionReportPage.tsx`      | Pantalla del informe: cabecera con misión, dificultad y desenlace, y el panel; los estados de la consulta los resuelve `QueryState`                                       |
| Claves de consulta       | `shared/query-keys.ts`                | `missions.report(enrollmentId)`, un recurso nuevo                                                                                                                         |

## Por qué sondeo corto

El informe nace con el cierre de la misión, pero la experiencia de cada derrota se acredita **después**: Missions pide el lote de tiradas a Combat y luego acredita derrota por derrota en Player/Inventory. Las primeras lecturas ven líneas `PENDING`, así que la pantalla sondea mientras queden derrotas por resolver y **se detiene** cuando `pending` llega a cero (acreditadas y fallidas son terminales) o cuando el informe no trae el bloque. Igual que el panel de recompensa de batalla (HU-22), sin depender de ningún evento en tiempo real.

## Los tres estados, y lo que no se dice

- **En curso** (`PENDING`): las derrotas están registradas y la experiencia está en camino. No se enseña `+0 XP`, porque se leería como una misión que no dio nada.
- **Acreditada** (`CREDITED`), entera o en parte: si queda algo en curso, se dice cuántas derrotas faltan.
- **Sin acreditar** (`FAILED`): manda sobre el resto. Se dice cuántas derrotas no se acreditaron, y no se insinúa un "en curso" que ya no va a resolverse.
- Una misión **sin derrotas** lo dice por separado: no es un fallo ni una experiencia perdida.
- Un informe **sin bloque de experiencia** también lo dice: es un servicio anterior a esta Task, no un cero.

## Accesibilidad

- La cifra de XP y el aviso de estado usan `role="status"`; las cifras llevan `tabular-nums`.
- El color solo refuerza: el titular y el detalle dicen lo mismo con palabras, y el estado de cada derrota se escribe («Acreditada», «En curso», «Sin acreditar»).
- El detalle por derrota es un `<details>` nativo (teclado y lectores de pantalla sin JS propio); los iconos son decorativos (`aria-hidden`).
- La transición usa `motion-safe:` y el panel se apila en el flujo del DOM, sin `order` ni posicionamiento absoluto.

## Pruebas y lo que NO se verificó

`missionReport.test.ts` (lectura del bloque, ausencia del bloque y de `defeats`, contadores y niveles inválidos, líneas de otros orígenes, etiquetas), `experiencePresentation.test.ts` (los tres estados, acreditación parcial, singular/plural, nivel, nivel máximo y subida de nivel), `useMissionReport.test.tsx` (activación con matrícula, contrato de la petición y las cuatro combinaciones de sondeo), `MissionExperiencePanel.test.tsx` (las tres situaciones, misión sin derrotas, informe sin bloque, nivel máximo y detalle por derrota) y `MissionReportPage.test.tsx` (cabecera, matrícula de la dirección y mensaje del servicio tal cual en un `404 REPORT_NOT_AVAILABLE`). `routes.test.tsx` comprueba que la ruta nueva renderiza el informe real y que `/missions` **sigue** mostrando su marcador. La guarda `noClientAuthority.test.ts` de la feature falla si aparece aritmética sobre experiencia, nivel o derrotas, agregación propia, umbrales, `Math.*`, aleatoriedad o el reloj.

Todo corre en **jsdom**. **No verificado**: un recorrido visual en navegador contra el stack local completo (Missions + Combat + Player-Inventory reales) y la verificación extremo a extremo de la HU, que es la Task **HU-09.6 (#444)** y depende de que Combat produzca la bitácora real de la simulación.

## Despliegue

Orden: Infrastructure (contrato) → **Missions** (`#443`, PR de la experiencia en el informe) → **Web** (esta Task). Un Web anterior a esta Task simplemente no monta `MissionReportPage`: la ruta no existía y el marcador de `/missions` seguía igual. Un Missions anterior a esta Task no rompe la pantalla: el bloque `experience` es opcional y el panel lo dice.
