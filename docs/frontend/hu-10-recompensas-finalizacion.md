# HU-10 - Recompensas de finalización de misión (interfaz del informe de misión)

Trazabilidad: `HU-10` → Management [`#19`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/19) → Task de Web [`#456`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/456) → `api`, `missionReport`, `missionPresentation`, `completionRewardPresentation`, `useMissionReport` y `MissionReportPage`.

La HU liquida recompensas por **terminar la misión** (completada o fallida): experiencia de finalización, créditos y productos. Este documento describe **solo la interfaz**. La decisión de qué se debe la toma `CompletionRewardPolicy` de Missions sobre el contenido congelado de la ejecución; la entrega la coordina Missions llamando a Player/Inventory (XP y producto) y a Wallet (créditos); el contrato está en
[`docs/contracts/hu-10-mission-completion-reward-v1.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/hu-10-mission-completion-reward-v1.md)
de Infrastructure y el detalle de la liquidación en Missions
[`PR #30`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Missions/pull/30).

## HU-09 y HU-10 son historias distintas

|                      | HU-09 (experiencia por derrota)                           | HU-10 (recompensa de finalización)                                    |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Qué paga             | Cada NPC derrotado                                        | Terminar la misión (`COMPLETED` o `FAILED`)                           |
| Línea del informe    | `source: 'HU-09'`, `kind: 'EXPERIENCE'`                   | `source: 'HU-10'`, `kind: 'EXPERIENCE' \| 'CREDITS' \| 'PRODUCT'`     |
| Dónde se ve          | `MissionExperiencePanel`, agregado en `report.experience` | Lista de recompensas de `MissionReportPage`, cada línea por su cuenta |
| Progresión del héroe | `report.experience.level/currentXp/maxLevel/levelsGained` | `reward.progression`, solo en la línea `EXPERIENCE` **CREDITED**      |

Las dos conviven en el **mismo** `rewards[]` del informe, igual que el botín de HU-72 (`source: 'HU-72'`) y la épica de HU-73 (`source: 'HU-73'`). Ninguna oculta a las otras, y Web **nunca sopesa `kind` por sí solo**: una línea `kind: 'EXPERIENCE'` puede ser de HU-09 o de HU-10, y solo `source` las distingue (`isHu09ExperienceLine`, en `missionPresentation.ts`).

## Qué hace la interfaz (y qué no)

|                                                     | Web                                                                                              | Missions / Player-Inventory / Wallet                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Importe de cada recompensa                          | **Muestra** `reward.quantity` tal cual                                                           | Todo (`CompletionRewardPolicy`, sobre el contenido congelado)                        |
| Estado de cada entrega                              | **Muestra** `PENDING` / `CREDITED` / `FAILED` en texto, nunca solo por color                     | Todo (XP vía Player/Inventory, créditos vía Wallet, producto vía `inventory/grants`) |
| Progresión del héroe tras la XP                     | **Muestra** `level`, `currentXp`, `maxLevel`, `levelsGained` tal cual, solo si la línea los trae | Todo (Player/Inventory)                                                              |
| Elegibilidad (`grantOn`, `FIRST_TIME`, `ABANDONED`) | No decide nada de esto; no aparece en el código de la pantalla                                   | Todo (Missions)                                                                      |
| Recuperación tras un refresh                        | **Sondea** mientras HU-09 o HU-10 tengan algo `PENDING`                                          | El informe es una foto inmutable; sus líneas se mueven                               |

Web nunca calcula un importe, un nivel o un `rewardTier`, no suma HU-09 con HU-10, no construye un `operationId` y no llama a `/api/internal/`, a `wallet/credits/mission-reward` ni a `inventory/grants`: todo eso es de Missions. La guarda estática de la feature (`noClientAuthority.test.ts`) lo comprueba.

## De dónde salen los datos

Una línea de `rewards[]` del informe (`GET /api/v1/missions/me/reports/{enrollmentId}`) con origen HU-10:

```json
{
  "kind": "EXPERIENCE",
  "reference": "completion:xp",
  "name": "Experiencia de finalización",
  "rarity": null,
  "quantity": 120,
  "status": "CREDITED",
  "source": "HU-10",
  "progression": {
    "level": 3,
    "currentXp": 315,
    "maxLevel": 8,
    "levelsGained": 1
  }
}
```

`progression` es **aditivo y opcional**, y solo aparece en una línea `source: 'HU-10'`, `kind: 'EXPERIENCE'`, `status: 'CREDITED'`: es exactamente lo que Player/Inventory le devolvió a Missions al acreditar. Una línea `CREDITS` o `PRODUCT`, o una `EXPERIENCE` que todavía no está `CREDITED`, no la trae, y la pantalla no la inventa si faltara o llegara en otro tipo de línea.

## Qué hay

| Pieza                          | Dónde                                      | Qué hace                                                                                                                        |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `api`                          | `missions/api.ts`                          | `MissionRewardProgression` y el campo opcional `progression` en `MissionReportRewardLine`                                       |
| `missionReportApi`             | `missions/missionReportApi.ts`             | Referencia el mismo `MissionRewardProgression` en su propia forma de `rewards[]` (no la redeclara)                              |
| `missionReport`                | `missions/missionReport.ts`                | `hasPendingCompletionReward` y `missionReportNeedsPolling`: la única fuente de la decisión de sondeo                            |
| `missionPresentation`          | `missions/missionPresentation.ts`          | `isHu09ExperienceLine`: distingue la XP de HU-09 (con panel propio) de cualquier otra recompensa, incluida la de HU-10          |
| `completionRewardPresentation` | `missions/completionRewardPresentation.ts` | Módulo puro: importe con o sin signo según el estado, y los tres textos de progresión (nivel, XP acumulada, niveles ganados)    |
| `useMissionReport`             | `missions/useMissionReport.ts`             | Sondea cada 1500 ms mientras `missionReportNeedsPolling` sea verdadero; se detiene en caso contrario                            |
| `MissionReportPage`            | `missions/MissionReportPage.tsx`           | Lista las recompensas que no son la XP de HU-09; la línea `EXPERIENCE` restante (HU-10) muestra su importe, estado y progresión |

## Regla de sondeo

```
HU-09 pendiente  OR  alguna línea HU-10 en PENDING  →  sigue sondeando
ninguna de las dos                                   →  se detiene
```

`CREDITED` y `FAILED` son terminales en las **dos** historias: una línea HU-10 `FAILED` no se vuelve a sondear, igual que una derrota de HU-09 sin acreditar. Un botín de HU-72 o una épica de HU-73 pendientes **no** activan el sondeo por sí solos: esa regla sigue siendo exclusiva de HU-09 y HU-10 mientras el contrato no diga lo contrario.

## Los tres estados, y lo que no se dice

- **`PENDING`**: el importe ya se conoce (Missions lo congeló al cerrar la misión), pero todavía no se entregó. Nunca se presenta como recibida.
- **`CREDITED`**: se muestra como entregada, con su signo (`+120 XP`) en la línea de experiencia.
- **`FAILED`**: estado terminal. No se oculta ni se insinúa que sigue en curso.

## Compatibilidad hacia atrás

Un informe sin ninguna línea `source: 'HU-10'` se ve exactamente igual que antes de esta Task. Una línea HU-10 sin `progression` funciona sin inventar valores. Un informe sin bloque `experience` de HU-09 sigue mostrando el mensaje vigente. Nada de esto sube `schemaVersion` desde Web.

## Editor administrativo

HU-10.4 añadió `rewards.completion` a la definición de una misión, pero los montos reales (`P-HU10-2`), el `grantOn` por recompensa (`P-HU10-3`) y la regla de `FIRST_TIME` (`P-HU10-4`) siguen sin definirse. Esta Task **no** construye una UI de configuración para ese bloque: el editor ya lo conserva byte a byte porque opera sobre la misma forma que guarda Missions (`[extra: string]: unknown` en `ContentRewards`, y `prepareForSave`/`duplicateMission`/la pestaña JSON solo tocan los campos que conocen). Lo que esta Task añade son pruebas de regresión que lo comprueban.

## Accesibilidad

- El estado de cada entrega se escribe («Entregada», «Pendiente de entrega», «Entrega fallida»), nunca solo por color.
- La progresión se presenta como una lista con viñetas dentro de la misma recompensa, sin anuncios ARIA nuevos: no hay un `role="status"` que relea toda la sección en cada sondeo.
- Mismo patrón de `tabular-nums` y estructura semántica que el resto del informe.

## Pruebas y lo que NO se verificó

`completionRewardPresentation.test.ts` (importe con/sin signo, nivel, nivel máximo, XP acumulada, niveles ganados), `missionReport.test.ts` (`hasPendingCompletionReward`, `missionReportNeedsPolling` con las combinaciones de HU-09/HU-10), `useMissionReport.test.tsx` (las nueve combinaciones de sondeo del contrato §13), `MissionReportPage.test.tsx` (XP/créditos/producto en sus tres estados, convivencia con HU-09/HU-72/HU-73, progresión presente/ausente/en una línea que no le corresponde, compatibilidad con un informe sin HU-10), `missionContent.test.ts` y `MissionContentEditorPage.test.tsx` (round-trip de `rewards.completion` al guardar, duplicar y usar la pestaña JSON). La guarda `noClientAuthority.test.ts` falla si aparece una ruta `/api/internal/`, `wallet/credits/mission-reward`, `inventory/grants`, un `operationId`, una suma de `totalXp` de HU-09 con una línea de HU-10, o un objeto que reconstruya la forma de `progression` fuera de su declaración de tipo.

Todo corre en **jsdom**. **No verificado**: un recorrido visual contra el stack local completo con Missions, Player/Inventory y Wallet reales liquidando una misión de principio a fin (depende de que `rewards.completion` tenga contenido real, pendiente de `P-HU10-2`).

## Despliegue

Orden: Infrastructure (contrato `hu-10-mission-completion-reward-v1`) → Player-Inventory (`#67`) → Wallet (`#20`) → Missions (`#26`, `#30`) → **Web** (esta Task). Un Web anterior a esta Task simplemente no distingue la XP de HU-10 de la de HU-09 y la ocultaba por error (el filtro `kind !== 'EXPERIENCE'`); esta Task lo corrige sin tocar la presentación de HU-09. Un Missions anterior a HU-10.5 no rompe la pantalla: ninguna línea trae `source: 'HU-10'` y el informe se ve igual que antes.
