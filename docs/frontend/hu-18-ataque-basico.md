# HU-18 — Ataque básico (interfaz)

Trazabilidad: `RF-18` → Management [`#62`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/62) → Task de Web [`#411`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/411) → `AttackPanel`, `HealthBar` y `useBattleRealtime`.

La HU pide que quien tiene el turno ataque a **un** objetivo, que el resultado (Ataque contra Defensa, efecto, daño y Vida) lo resuelva el servidor y que ambos clientes vean el resultado y el turno siguiente. Este documento describe **solo la interfaz**. Las reglas, el orden de sorteos, la idempotencia y la persistencia son de **Combat**; el contrato está en
[`docs/contracts/hu-18-basic-attack-v1.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/hu-18-basic-attack-v1.md)
de Infrastructure y el detalle del servidor en
[`docs/hu-18-basic-attack.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Combat/blob/develop/docs/hu-18-basic-attack.md)
de Combat.

## Qué hace la interfaz (y qué no)

|                                      | Web                                                      | Combat                                      |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------------- |
| A quién atacar                       | **Elige** un objetivo y envía la intención               | Valida turno, equipo, Vida y perfil         |
| Ataque contra Defensa, efecto y dado | Nada                                                     | Todo (HU-20, HU-24, HU-25)                  |
| Daño, redondeo (`floor`) y Vida      | Nada: **pinta** la Vida que llega                        | Todo                                        |
| Turno siguiente                      | Nada: pinta `currentTurn`                                | Todo                                        |
| Poder                                | **No interviene**: el botón no lo lee ni lo menciona     | Tampoco lo consume (aún no modela el Poder) |
| Idempotencia                         | Un `commandId` por intención; reintento con el **mismo** | Devuelve el resultado guardado              |

Web **nunca** envía Ataque, Defensa, daño, Vida, efecto, porcentaje, semilla ni turno, y **no usa aleatoriedad de juego** (el `commandId` es un identificador, no un sorteo).

## Qué hay

| Pieza                 | Dónde                            | Qué hace                                                                                                                                |
| --------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Tipos y guardas       | `battle/types.ts`                | `combatants` (Vida) y `basicAttackResolved`, validados campo por campo; un mensaje mal formado se ignora, nunca se pinta                |
| `battleReducer`       | `battle/battleReducer.ts`        | Aplica solo `seq === lastSeq + 1`; duplicados y viejos se ignoran; un salto pide `resume`. Guarda el último ataque tal como llegó       |
| `attackIntentReducer` | `battle/attackIntent.ts`         | Máquina de estados de **una** intención: pendiente, sin confirmar, rechazada                                                            |
| `useBattleRealtime`   | `battle/useBattleRealtime.ts`    | Envía `attack`, bloquea el doble clic, distingue los rechazos del ataque de los de `resume`, no reenvía solo                            |
| `commandId`           | `commandId.ts`                   | Único punto donde se genera un UUID, aislado e inyectable (la guarda estática prohíbe cualquier aleatoriedad en el resto de la batalla) |
| `HealthBar`           | `battle/HealthBar.tsx`           | Texto `32 / 44` + `meter` accesible; color según §7.6 del documento oficial                                                             |
| `AttackPanel`         | `battle/AttackPanel.tsx`         | Elección de **un** objetivo (grupo de opciones nativo) y botón «Ataque básico»                                                          |
| `BattleScreen`        | `battle/BattleScreen.tsx`        | Vida en cada tarjeta, región viva con el resultado y el panel de acciones                                                               |
| `presentation`        | `battle/presentation.ts`         | Disponibilidad del botón, objetivos, umbrales de la barra y textos por código                                                           |
| Vista previa          | `dev/BattleScreenDevPreview.tsx` | Solo desarrollo, en `/__dev/hu17/battle`: los **mismos** componentes y reductores contra un «servidor simulado» guionizado              |

## Cuándo aparece el botón «Ataque básico»

Solo en **tu turno** y si la batalla trae Vida. Se habilita cuando hay un objetivo con Vida elegido, la conexión está lista (`open` y sincronizada) y no hay otro ataque en curso. Nunca depende del Poder. Si no se puede atacar, la razón es **texto visible** enlazado con `aria-describedby` (no solo un tooltip):

| Situación                                 | Qué se ve                                                    |
| ----------------------------------------- | ------------------------------------------------------------ |
| No es tu turno                            | Sin botón; «Podrás atacar cuando sea tu turno.»              |
| Sin objetivo elegido (varios rivales)     | Botón deshabilitado; «Elige un objetivo.»                    |
| Un único rival con Vida                   | Ya es el objetivo (no hay nada que elegir)                   |
| Sin conexión lista                        | Botón deshabilitado; «Esperando la conexión con la batalla…» |
| Ataque en curso                           | «Atacando…», `aria-busy`; un segundo clic no envía nada      |
| Ningún rival con Vida / mi héroe sin Vida | Botón deshabilitado con la razón                             |
| Batalla anterior a HU-18 (sin Vida)       | Sin botón; se explica que no admite ataques                  |

«Deshabilitado» usa `aria-disabled` (no `disabled`): el botón conserva el foco mientras espera y el clic se ignora. El objetivo se elige con un grupo de `radio` nativo (flechas del teclado), con nombre y Vida de cada rival; los rivales sin Vida no se ofrecen. Es una **ayuda** de interfaz: Combat valida siempre turno, equipo y Vida.

## Un comando por intención

```json
{
  "type": "attack",
  "commandId": "6f0b6f0e-…",
  "roomId": "aaaaaaaa-…",
  "target": { "teamLabel": "B", "seat": 0 }
}
```

- Exactamente esas cuatro claves; el objetivo es **uno**, identificado por `(teamLabel, seat)`, nunca por `heroId`.
- El `commandId` se genera **una vez por intención**. **No hay reenvío automático**, ni con el mismo id ni con uno nuevo, tras una reconexión: el resultado llega por `resume` o el jugador decide.
- Si se corta la conexión con un ataque pendiente (o Combat responde `COMMAND_CONFLICT`), la intención queda **sin confirmar** y se ofrece «Reintentar ataque», que reenvía el **mismo** `commandId`: si Combat ya lo procesó devuelve el resultado guardado sin repetir el daño.
- Un rechazo definitivo (`NOT_YOUR_TURN`, `INVALID_TARGET`, `TARGET_UNAVAILABLE`…) cierra la intención y se anuncia con `role="alert"`; un ataque nuevo lleva un `commandId` nuevo.
- Un rechazo del ataque (`command: "attack"`) **no** vuelve inaccesible la batalla; solo los de `resume` (sin `command`) lo hacen, como en HU-17.

## Qué pinta y cómo

- **Vida**: en cada tarjeta, `32 / 44` y una barra (`role="meter"` con `aria-valuemin/max/now` y `aria-valuetext`). Colores del documento oficial (§7.6): **verde** por encima del 60 %, **amarillo** entre el 40 % y el 60 % (ambos inclusive), **rojo** por debajo del 40 %; con Vida 0 el texto «Sin Vida». El color solo refuerza: el texto siempre está.
- **Resultado del último ataque**: región viva (`role="status"`, `aria-live="polite"`) con el efecto, el porcentaje, el daño aplicado y la Vida antes → después, o «sin efecto» con el Ataque y la Defensa comparados. Todo sale de lo que envió Combat; ambos jugadores ven el mismo texto. Tras recargar (`snapshot`) se recupera la Vida y el turno vigentes, pero **no** el detalle del último golpe: un `snapshot` no trae acciones.
- **Movimiento reducido**: la animación del ancho de la barra existe solo bajo `motion-safe` (`prefers-reduced-motion: no-preference`).
- **320 px**: una columna, sin desbordamiento horizontal.
- **Batallas anteriores a HU-18**: se ven (turno, orden) sin barras ni botón, con una explicación; un rival `AI` sin perfil muestra «Vida no disponible».

## Verificación

- **Contraste medido** en la vista previa (WCAG 2.2, ambos temas): texto de Vida ≥ 5,2:1; borde de la barra 5,23:1 (claro) y 6,42:1 (oscuro); relleno verde 3,50 / 4,99, amarillo 3,24 / 5,38, rojo 5,10 / 6,42 (claro / oscuro) frente a la tarjeta; el token `--color-warning` se ajustó (`oklch(0.64 0.14 80)`) porque el primer valor quedaba en 1,78:1. Texto del botón sobre su fondo 4,73 (claro) y 4,58 (oscuro).
- **Pruebas** (Vitest, en `src/features/battle-rooms/battle`): guardas y reductor por `seq`, máquina de la intención, hook con un socket falso (comando exacto, doble clic, rechazos, corte y `resume`), componentes (`HealthBar`, `AttackPanel`, `BattleScreen`), `BattlePage` de punta a punta con el socket falso y la vista previa. Una **guarda estática** (`noClientAuthority.test.ts`) recorre el código de producción y falla ante `Math.random`/`randomUUID`, aritmética de Ataque/Defensa/daño/Vida, `Math.floor`/`round`/`min`/`max`, Poder o reenvíos con temporizadores.
- **Bytes reales de Combat** (`combatWire.test.tsx` + `combat-wire.fixture.json`): el fixture **no está escrito a mano**; son los mensajes exactos que el servidor real de Combat (MongoDB real, Nest real, secuencia HU-24 guionizada) envió a dos clientes `ws` reales en su prueba de extremo a extremo (crítico 137 %, repetición idempotente, efecto 0 %, golpe que no supera la Defensa y rechazos). Las guardas, el reductor y la pantalla de Web los procesan tal cual llegaron: ambos clientes terminan en el mismo estado. **No es una prueba con navegadores reales**; para eso está el procedimiento manual de Infrastructure (`docs/runbooks/hu-18-aceptacion-manual.md`).
- **Mutaciones manuales: 24 defectos, 24 detectados** (comando con datos extra, `commandId` nuevo en el reintento, sin bloqueo de doble clic, reenvío automático al reconectar, eventos duplicados o con salto aplicados, botón fuera de turno o con la conexión no lista, umbral del 60 %, cualquier rechazo fatal, resultado o rechazo ajeno que cierra mi intención, `COMMAND_CONFLICT` como rechazo definitivo, resolución incoherente aceptada, resultado viejo tras un `snapshot`, Vida solo con color, aliados como objetivo, barra invertida, daño calculado en Web, envío sin sincronizar, `commandId` fijo, intención sin marcar como pendiente…): cada una se aplicó sola, se ejecutó la suite de la batalla y se restauró el archivo.
- **Vista previa** (`/__dev/hu17/battle`): monta los componentes y los reductores de producción; **no es evidencia de extremo a extremo** (no hay Combat detrás) y sus marcadores están vetados del bundle productivo (`build:verify`).

## Fuera de alcance (no se inventó)

| Punto                                              | Estado                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Poder (`currentPower`, costo, recarga)             | Combat aún no lo modela; el ataque básico no lo usa. HU-11 / HU-19                                |
| Habilidades y épica                                | HU-19 / HU-31; el panel solo lo avisa                                                             |
| Fin de batalla, ganador, «derrotado»               | HU-21: una Vida en 0 solo se muestra como «Sin Vida»; Web no decide nada                          |
| Bonos de daño del equipamiento; participantes `AI` | Pendientes de Combat (ver su documento); Web pinta lo que llegue                                  |
| Chamán y Médico                                    | Su ataque lo rechaza Combat (`UNSUPPORTED_COMBAT_PROFILE`) y Web lo explica; el PO debe definirlo |
| Detalle del último golpe tras recargar             | No se persiste en el cliente ni viaja en el `snapshot`; se recupera la Vida y el turno            |
| Varios objetivos o área                            | Fuera del RF-18: el objetivo es siempre uno                                                       |
