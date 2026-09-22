# HU-21 - Resultado de batalla (interfaz)

Trazabilidad: `RF-21` → Management [`#65`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/65) → Task de Web [`#419`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/419) → `types`, `battleReducer`, `useBattleRealtime`, `battleClock`, `BattleTimers`, `resultPresentation` y `BattleResultView`.

La HU pide que la batalla termine (eliminación, desconexión o 6 minutos), que el sistema declare **un único resultado** y que el jugador lo vea con una **vista de alto impacto** (§7.6 del documento oficial). Este documento describe **solo la interfaz**. Las reglas, los temporizadores, la desconexión, el desempate y la persistencia son de **Combat**; el contrato está en
[`docs/contracts/hu-21-battle-finish-v1.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/hu-21-battle-finish-v1.md)
de Infrastructure y el detalle del servidor en
[`docs/hu-21-battle-finish.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Combat/blob/develop/docs/hu-21-battle-finish.md)
de Combat.

## Qué hace la interfaz (y qué no)

|                                              | Web                                                                                                  | Combat                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Quién gana y por qué                         | Nada: **pinta** `result` (`participants[].result`, `winnerTeamLabel`, `reason`, `tiebreak`, `teams`) | Todo (única autoridad)                           |
| Porcentajes de vida, desempates              | Nada: **muestra** `lifePercent` tal cual                                                             | Todo (producto cruzado entero)                   |
| Temporizadores (turno, batalla)              | **Muestra** la cuenta atrás; llegar a 0 **no hace nada**                                             | Todo (publica `turnTimedOut` / `battleFinished`) |
| Desconexión                                  | Nada: la conexión es del navegador; la gracia la decide Combat                                       | Todo (30 s de gracia)                            |
| Recompensas (créditos, cofre, drop, apuesta) | **No se muestran** como concedidas (D4)                                                              | Nada: solo publica el derecho en la notificación |
| Refresh tras el final                        | **Recupera** el resultado del `snapshot`                                                             | Persiste el resultado con la sala                |

Web **nunca** envía ganador, causa, tiempos ni porcentajes, y no compara vidas.

## Qué hay

| Pieza                | Dónde                                | Qué hace                                                                                                                                                                                                         |
| -------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipos y guardas      | `battle/types.ts`                    | `BattleResult` y sus partes, `turnTimedOut`, `battleFinished`, `deadlines`, `snapshot.result` y `resume.ok.serverTime`, validados campo por campo; un mensaje mal formado se ignora                              |
| `battleReducer`      | `battle/battleReducer.ts`            | Guarda `result` y `lastTurnTimeout`; `battleFinished` deja `roomStatus: FINISHED`; **ningún evento posterior se aplica**; la instantánea fija el resultado y limpia acciones                                     |
| `useBattleRealtime`  | `battle/useBattleRealtime.ts`        | Expone `result`, `lastTurnTimeout` y `serverClock`; tras el final `sendAttack`/`sendSkill`/`retry*` son no-op y las intenciones pendientes se cierran (también con `BATTLE_NOT_ACTIVE`)                          |
| `battleClock`        | `battle/battleClock.ts`              | Reloj de **visualización**: `serverTime` + reloj monótono; `remainingMs`, `formatRemaining` y `timeWarning`. Sin `Date.now()` ni `new Date(`; no conoce Vida, daño ni ganador                                    |
| `BattleTimers`       | `battle/BattleTimers.tsx`            | Cuentas atrás de turno y batalla, `role="timer"` con `aria-live="off"`, umbrales anunciados una vez en una región `polite` aparte; a `0:00` deja «Esperando a Combat…» y **no deshabilita nada**                 |
| `resultPresentation` | `battle/resultPresentation.ts`       | Textos por causa y rol (participante o espectador); el rol sale **solo** de `participants`; ninguna aritmética de vida                                                                                           |
| `BattleResultView`   | `battle/BattleResultView.tsx`        | Vista de alto impacto: titular con texto y color, causa, marcador por equipo, participantes y enlace real «Volver a Jugar Online» (`/play`); foco al titular y un solo anuncio                                   |
| Pantalla y página    | `BattleScreen.tsx`, `BattlePage.tsx` | La arena se conserva; tras el final **desaparecen** las acciones, no se pintan temporizadores y la vista de resultado va entre la arena y el resto; `FINISHED` sin `result` (Combat anterior) avisa sin inventar |

## Temporizadores de solo visualización

`resume.ok.serverTime` fija el instante del servidor; `performance.now()` aporta el avance monótono. `deadlines` (ausente en la vista final y en un Combat anterior a HU-21) da los dos vencimientos. Llegar a `0:00` **no** cierra el turno ni la batalla: el servidor publica `turnTimedOut` o `battleFinished` y la pantalla reacciona a esos eventos. El hook **no** usa temporizadores (una guarda estática lo comprueba); el único `setInterval` nuevo vive en `BattleTimers`.

## Textos por causa y rol

| Causa           | Rol                      | Texto                                                                                          |
| --------------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| `ELIMINATION`   | Ganador / perdedor       | «Derrotaste a todos los héroes rivales.» / «Todos tus héroes fueron eliminados.»               |
| `DISCONNECTION` | Ganador                  | «Tu rival se desconectó y no volvió a tiempo.»                                                 |
| `DISCONNECTION` | Desconectado / compañero | «Te desconectaste y no volviste a tiempo.» / «Un integrante de tu equipo se desconectó.»       |
| `TIME_LIMIT`    | Todos                    | «Se acabó el tiempo (6 minutos).» + desempate (`LIFE_PERCENT`, `ABSOLUTE_LIFE` o empate total) |
| —               | Espectador               | Texto neutro («Ganó el equipo X» / «Sin ganador (empate)»)                                     |

## Accesibilidad

- `BattleResultView` es una `region` con nombre en el titular; el foco pasa al titular al aparecer; un `role="status"` anuncia el titular **una vez**.
- Los temporizadores no se leen cada segundo (`aria-live="off"` y dígito `aria-hidden`); los umbrales se anuncian en una región `polite` aparte.
- El color solo refuerza: siempre hay texto. La animación de entrada y los avisos usan `motion-safe:` (nada con `prefers-reduced-motion`).
- Responsive desde 320 px sin desbordamiento; el orden del DOM es el orden de lectura (sin `order`, `absolute` ni `fixed`).

## Qué NO se muestra (D4) y por qué

Web **no** muestra créditos, cofres, ítems, apuesta ni experiencia, ni los declara concedidos: Combat publica el derecho en la notificación a consumidores (HU-22/23/30/09), y esas historias no están implementadas. Una guarda estática comprueba que ningún archivo de producción de `battle/` menciona créditos.

## Pruebas y lo que NO se verificó

`finishTypes.test.ts`, `finishReducer.test.ts`, `useBattleFinish.test.tsx`, `battleClock.test.ts`, `BattleTimers.test.tsx`, `resultPresentation.test.ts`, `BattleResultView.test.tsx`, `BattleScreen.finish.test.tsx`, `BattlePage.finish.test.tsx` y las guardas de `noClientAuthority.test.ts` (HU-21). Todo corre en **jsdom**: no hay navegador real ni lector de pantalla, y la aceptación manual con dos navegadores es el runbook de la Task #420.

## Despliegue

Orden: Infrastructure (contrato) → **Combat** (`npm run migrate`, migración `009`) → **Web**. Un Web anterior ignora los campos nuevos salvo que una sala `FINISHED` le llegue: verá un estado que no conoce.
