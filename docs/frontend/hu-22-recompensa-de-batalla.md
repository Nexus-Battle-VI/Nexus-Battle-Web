# HU-22 - Entrega de cofre de recompensa por acumulación de créditos (interfaz)

Trazabilidad: `RF-22` → Management [`#69`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/69) → Task de Web [`#431`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/431) → `api`, `useBattleReward`, `useWallet`, `rewardPresentation` y `RewardPanel`.

La HU otorga créditos al terminar una batalla y, al acumular 20 puntos de victoria (máximo 2 cofres por semana, `America/Bogota`), entrega un cofre con un producto real del catálogo. Este documento describe **solo la interfaz**. El cálculo de créditos, el progreso, el sorteo del producto y la entrega al inventario son de **Wallet** y **Combat**; el contrato está en
[`docs/contracts/hu-22-reward-contract-v1.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/hu-22-reward-contract-v1.md)
de Infrastructure y el detalle de la orquestación en
[`docs/hu-22-reward-workflow.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Combat/blob/develop/docs/hu-22-reward-workflow.md)
de Combat.

## Qué hace la interfaz (y qué no)

|                                  | Web                                                                                             | Wallet / Combat                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Créditos ganados en la batalla   | **Muestra** `creditsEarned` tal cual                                                            | Todo (`BattleCreditsPolicy`, ya de HU-21)                 |
| Saldo total                      | **Muestra** `balance`/`wallet.balance`; `null` = «Confirmando…», nunca un número inventado      | Todo (Wallet es la única fuente del saldo)                |
| Progreso hacia el cofre (0-20)   | **Muestra** la fracción `progreso / umbral`, acotada a `[0, 1]` solo para no desbordar la barra | Todo (umbral, reinicio, congelado tras 2/2)               |
| Límite semanal (máx. 2 cofres)   | **Muestra** `count / limit` y un aviso en texto si ya se alcanzó                                | Todo (Wallet decide cuándo se alcanza)                    |
| Qué producto toca                | **Muestra** el nombre que llega en `reward`; nunca lo elige ni lo adivina                       | Todo (`RewardTable`, motor de HU-24, un único draw)       |
| Cuándo el cofre está "entregado" | Solo cuando `rewardDelivery === 'CONFIRMED'`; `PENDING` nunca dice "añadido"                    | Todo (workflow de 6 estados, Combat → Wallet → Inventory) |
| Recuperación tras un refresh     | **Sondea** `GET .../reward` mientras la entrega no llegue a un estado final                     | El workflow es resumible e idempotente                    |

Web **nunca** calcula créditos, progreso, ni decide si corresponde cofre: todo llega ya resuelto.

## Qué hay

| Pieza                | Dónde                          | Qué hace                                                                                                                                                                           |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`                | `battle/api.ts`                | `fetchBattleReward` (`GET /v1/combat/rooms/:roomId/reward`) y `fetchWallet` (`GET /v1/wallet/me`); ambos deducen el jugador del testimonio, sin parámetros de identidad            |
| `useBattleReward`    | `battle/useBattleReward.ts`    | `useQuery` habilitado solo con la batalla terminada; sondea cada 1500 ms mientras `rewardDelivery` no sea `CONFIRMED` ni (`NONE` con `balance` ya conocido)                        |
| `useWallet`          | `battle/useWallet.ts`          | `useQuery` del saldo propio; deshabilitado sin sesión                                                                                                                              |
| `rewardPresentation` | `battle/rewardPresentation.ts` | Módulo puro: fracción de la barra (acotada, sin `Math.min`/`Math.max` para no chocar con la guarda de HU-18), textos de progreso/límite y el titular/detalle de entrega por estado |
| `RewardPanel`        | `battle/RewardPanel.tsx`       | Créditos, saldo, barra de progreso (`role="meter"`), límite semanal y tarjeta de entrega; `null` sin sesión o sin `RewardWorkflow` propio (espectador, IA)                         |
| Pantalla             | `BattleScreen.tsx`             | `RewardPanel` se monta **aditivo**, justo después de `BattleResultView` (HU-21), que sigue sin mostrar créditos (D4)                                                               |
| Claves de consulta   | `shared/query-keys.ts`         | `battleRooms.reward(roomId)` (recurso aparte de `battleRooms.detail`) y `wallet.me`                                                                                                |

## Por qué sondeo y no un mensaje de tiempo real nuevo

El flujo Combat → Wallet → Inventory puede tardar más que el primer render de la pantalla de resultado, y no hay precedente en este repo de invalidar/refrescar caché de TanStack Query desde un evento de WebSocket (las mutaciones existentes usan `setQueryData` con la respuesta del propio servidor). Añadir un tipo de mensaje nuevo a `useBattleRealtime` solo para esto habría acoplado el socket de combate a un dominio que no le pertenece; un `useQuery` con `refetchInterval` corto, activado solo tras el final, resuelve la recuperación sin depender de que el evento llegue mientras la pestaña está abierta.

## Progreso, límite y entrega

- La barra de progreso es un `role="meter"` (no `progressbar`, porque no representa una tarea en curso) con `aria-valuemin/max/now/valuetext`; el texto `12 / 20` acompaña, nunca lo sustituye.
- El límite semanal muestra `count / limit` y, si ya se alcanzó, un aviso en texto aparte (nunca solo color).
- La entrega usa `rewardDelivery` como única fuente de verdad: `NONE` no muestra tarjeta, `PENDING` dice «Cofre obtenido» sin afirmar que ya está en el inventario, `CONFIRMED` nombra el producto real y añade «✓».

## Accesibilidad

- El saldo vive en una región `aria-live="polite"`; los créditos ganados y la tarjeta de entrega usan `role="status"`.
- La transición de aparición usa `motion-safe:` (nunca `motion-reduce:`).
- Responsive desde el ancho mínimo del resto de la pantalla de batalla; el panel se apila en el mismo flujo del DOM, sin `order` ni posicionamiento absoluto.

## Pruebas y lo que NO se verificó

`api.test.ts` (nuevas pruebas de `fetchBattleReward`/`fetchWallet`), `rewardPresentation.test.ts`, `useWallet.test.tsx`, `useBattleReward.test.tsx` (activación, clave de consulta y las cuatro combinaciones de sondeo: `PENDING` y `NONE` sin saldo siguen sondeando, `CONFIRMED` y `NONE` con saldo lo detienen) y `RewardPanel.test.tsx` (visibilidad, singular/plural de créditos, `Confirmando…`, meter, límite semanal, los tres estados de entrega y `motion-safe`). La guarda estática `noClientAuthority.test.ts` (HU-18) sigue pasando sin excepciones nuevas. Todo corre en **jsdom**.

**No verificado**: un recorrido visual en navegador contra el stack local completo (Wallet + Combat + Inventory reales). El proxy de Vite en desarrollo (`vite.config.ts`, `target: 'http://localhost:3000'`) no alcanza los servicios del `docker-compose` de este entorno, que solo publica el puerto `18080` del proxy inverso; ese descuadre es anterior a esta Task y queda fuera de su alcance. La aceptación manual con datos reales de principio a fin (batalla completa → crédito → progreso → cofre) queda para la Task #432 (validación cruzada E2E).

## Despliegue

Orden: Infrastructure (contrato, `#123`) → **Wallet** (`#10`) + **Player-Inventory** (`#40`) → **Combat** (`#32`) → **Web**. Un Web anterior a esta Task simplemente no monta `RewardPanel`: la pantalla de resultado (HU-21) sigue funcionando igual.
