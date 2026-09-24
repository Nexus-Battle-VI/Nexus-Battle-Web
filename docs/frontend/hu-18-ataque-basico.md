# HU-18 — Ataque básico (interfaz)

Trazabilidad: `RF-18` → Management [`#62`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/62) → Task de Web [`#411`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/411) → `AttackPanel`, `HealthBar` y `useBattleRealtime`.

La HU pide que quien tiene el turno ataque a **un** objetivo, que el resultado (Ataque contra Defensa, efecto, daño y Vida) lo resuelva el servidor y que ambos clientes vean el resultado y el turno siguiente. Este documento describe **solo la interfaz**. Las reglas, el orden de sorteos, la idempotencia y la persistencia son de **Combat**; el contrato está en
[`docs/contracts/hu-18-basic-attack-v1.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/hu-18-basic-attack-v1.md)
de Infrastructure y el detalle del servidor en
[`docs/hu-18-basic-attack.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Combat/blob/develop/docs/hu-18-basic-attack.md)
de Combat.

## Qué hace la interfaz (y qué no)

|                                      | Web                                                      | Combat                                     |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------------ |
| A quién atacar                       | **Elige** un objetivo y envía la intención               | Valida turno, equipo, Vida y perfil        |
| Ataque contra Defensa, efecto y dado | Nada                                                     | Todo (HU-20, HU-24, HU-25)                 |
| Daño, redondeo (`floor`) y Vida      | Nada: **pinta** la Vida que llega                        | Todo                                       |
| Turno siguiente                      | Nada: pinta `currentTurn`                                | Todo                                       |
| Poder                                | **No interviene**: el botón no lo lee ni lo menciona     | El ataque básico **no** lo consume (HU-11) |
| Idempotencia                         | Un `commandId` por intención; reintento con el **mismo** | Devuelve el resultado guardado             |

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
| `BattleScreen`        | `battle/BattleScreen.tsx`        | La arena: HUD compacto, resultado en una franja, acciones y turnos (ver «Arena responsive»)                                             |
| `BattleArena`         | `battle/BattleArena.tsx`         | Un lado de la arena (rival o mío) y sus tarjetas de combatiente con héroe, nombre, insignias y Vida                                     |
| `TurnOrderStrip`      | `battle/TurnOrderStrip.tsx`      | Franja compacta con el orden de turnos (`battle.turnOrder` tal cual)                                                                    |
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
- **Resultado del último ataque** (desde HU-19 la región se llama «Resultado de la última acción» y también muestra habilidades): región viva (`role="status"`, `aria-live="polite"`) con el efecto, el porcentaje, el daño aplicado y la Vida antes → después, o «sin efecto» con el Ataque y la Defensa comparados. Todo sale de lo que envió Combat; ambos jugadores ven el mismo texto. Tras recargar (`snapshot`) se recupera la Vida y el turno vigentes, pero **no** el detalle del último golpe: un `snapshot` no trae acciones.
- **Movimiento reducido**: la animación del ancho de la barra existe solo bajo `motion-safe` (`prefers-reduced-motion: no-preference`).
- **320 px**: una columna, sin desbordamiento horizontal.
- **Batallas anteriores a HU-18**: se ven (turno, orden) sin barras ni botón, con una explicación; un rival `AI` sin perfil muestra «Vida no disponible».

## Arena responsive

La pantalla se compone como una **arena**, no como una pila de tarjetas administrativas. Jerarquía: 1) los héroes enfrentados, 2) su Vida, 3) el turno y la acción, 4) el resultado del último ataque y 5) —como información secundaria— el orden de turnos. Es un cambio **solo de presentación**: mismos datos (`BattleView`, `TurnOrderEntry`, `CombatantView`, `HealthView`, `LastAttack`), mismo contrato y las mismas reglas (Web no decide nada).

**Un solo DOM**, con el orden de lectura _estado → arena → resultado → acciones → turnos_. El CSS solo cambia la composición visual: no usa `order-*`, `*-reverse` ni `absolute`/`fixed` (una guarda estática lo vigila), así el orden de `Tab` y de los lectores de pantalla coincide con el del DOM. No hay un árbol de escritorio y otro móvil.

| Bloque    | Componente                  | Qué es                                                                                                                                              |
| --------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| HUD       | `BattleScreen`              | Una franja: «Tu turno» / «Turno de Bruno», ronda y conexión en texto («Conectado», «Reconectando…»). La región `role="status"` conserva `aria-live` |
| Arena     | `BattleArena` (`ArenaSide`) | Rival · **VS** · mi lado. Cada lado es una rejilla de 1, 2 o 3 columnas según cuántos participantes trae; el título del lado no repite «Equipo B»   |
| Resultado | `BattleScreen`              | Una franja de texto con el efecto, el daño aplicado y la Vida antes → después. La región viva existe siempre, pero **vacía no reserva altura**      |
| Acciones  | `AttackPanel`               | Barra: objetivo (radios nativos) + «Ataque básico» como acción principal. Deja sitio para las habilidades y la épica (HU-19) sin botones falsos     |
| Turnos    | `TurnOrderStrip`            | Franja de chips `1 Bruno · Actual → 2 Ana (tú)` que renderiza `battle.turnOrder` tal cual; con seis caben en una fila y, si no, bajan de línea      |

**Breakpoints** (Tailwind vigente, sin librerías nuevas):

- **Móvil (< 768 px):** todo apilado — Rival, VS, Tu héroe, resultado, acciones, turnos. Una columna por lado hasta `sm`; nunca dos héroes diminutos lado a lado a 320 px.
- **Tablet y escritorio:** con **1 o 2 participantes por lado** la arena es horizontal desde `md` (768 px); con **3 por lado**, desde `lg` (1024 px). Depende solo de cuántos son, no de la modalidad ni de nombres.
- **Tamaño del héroe:** por participantes del lado (prominente en 1v1, más compacto en 2v2 y 3v3) y, desde `md`, acotado también por la altura de la ventana (`vh`) para que la escena entera quepa; en pantallas muy anchas (`2xl`) crece un poco. No se tocó `Hero3D`.

**Verificado en la vista previa** (mediciones de layout y revisión visual; no es E2E — no hay Combat detrás), con Ana en su turno, sin desbordamiento horizontal, sin tarjetas solapadas y sin elementos fuera del ancho de la ventana:

| Ventana   | 1v1                                                                                                                    | 2v2                     | 3v3                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------- |
| 320×568   | apilado; sin desbordamiento                                                                                            | apilado                 | apilado                                           |
| 390×844   | apilado                                                                                                                | apilado                 | apilado                                           |
| 768×1024  | **horizontal**; héroes, Vida y botón visibles a la vez                                                                 | **horizontal**          | apilado por lado (3 columnas dentro de cada lado) |
| 1280×720  | héroes, Vida y «Ataque básico» dentro de la ventana                                                                    | —                       | horizontal, todo dentro                           |
| 1366×768  | ambos héroes (200 px), ambas Vidas y el botón dentro de la ventana; el botón termina en y≈640–700 según haya resultado | horizontal, todo dentro | horizontal, todo dentro                           |
| 1440×900  | todo el bloque de batalla, incluida la franja de turnos, cabe (termina en y≈761)                                       | todo dentro             | todo dentro                                       |
| 1920×1080 | todo dentro (termina en y≈809); héroes de 256 px                                                                       | todo dentro             | todo dentro                                       |

En 1366×768 el encabezado global de la app mide 67 px (medido) más el relleno de la página; el orden de turnos, que es información secundaria, puede quedar al borde de la ventana cuando hay franja de resultado, pero rival, héroe propio, ambas Vidas, el turno y «Ataque básico» se ven sin desplazarse.

**Contraste** (medido, ambos temas): el rótulo «Actual» pasó de `text-brand` (3,16:1 en oscuro y 4,40:1 en claro) a `text-ink` (12,9:1 y 15,2:1); el resto del texto nuevo (ronda, conexión, títulos de lado, detalle del resultado, nota de habilidades) queda entre 4,59:1 y 6,42:1, y el nombre 15,5:1 o más.

**Vista previa DEV** (`/__dev/hu17/battle`): los controles de simulación (turno, «servidor simulado», Vida, batalla anterior a HU-18, formato incluido **3v3**) están en un panel plegable de borde discontinuo rotulado «Controles de desarrollo — no forman parte del producto», **fuera** de la pantalla de batalla, que va debajo con el mismo contenedor de la app. Se pliega para capturar solo la batalla. Ese rótulo está vetado del bundle productivo (`build:verify`).

## Verificación

- **Contraste medido** en la vista previa (WCAG 2.2, ambos temas): texto de Vida ≥ 5,2:1; borde de la barra 5,23:1 (claro) y 6,42:1 (oscuro); relleno verde 3,50 / 4,99, amarillo 3,24 / 5,38, rojo 5,10 / 6,42 (claro / oscuro) frente a la tarjeta; el token `--color-warning` se ajustó (`oklch(0.64 0.14 80)`) porque el primer valor quedaba en 1,78:1. Texto del botón sobre su fondo 4,73 (claro) y 4,58 (oscuro).
- **Pruebas** (Vitest, en `src/features/battle-rooms/battle`): guardas y reductor por `seq`, máquina de la intención, hook con un socket falso (comando exacto, doble clic, rechazos, corte y `resume`), componentes (`HealthBar`, `AttackPanel`, `BattleScreen`, con pruebas de **semántica y orden del DOM** para 1v1, 2v2 y 3v3, no de píxeles ni de clases), `BattlePage` de punta a punta con el socket falso y la vista previa. Una **guarda estática** (`noClientAuthority.test.ts`) recorre el código de producción y falla ante `Math.random`/`randomUUID`, aritmética de Ataque/Defensa/daño/Vida, `Math.floor`/`round`/`min`/`max`, Poder o reenvíos con temporizadores.
- **Bytes reales de Combat** (`combatWire.test.tsx` + `combat-wire.fixture.json`): el fixture **no está escrito a mano**; son los mensajes exactos que el servidor real de Combat (MongoDB real, Nest real, secuencia HU-24 guionizada) envió a dos clientes `ws` reales en su prueba de extremo a extremo (crítico 137 %, repetición idempotente, efecto 0 %, golpe que no supera la Defensa y rechazos). Las guardas, el reductor y la pantalla de Web los procesan tal cual llegaron: ambos clientes terminan en el mismo estado. **No es una prueba con navegadores reales**; para eso está el procedimiento manual de Infrastructure (`docs/runbooks/hu-18-aceptacion-manual.md`).
- **Mutaciones manuales: 24 defectos, 24 detectados** (comando con datos extra, `commandId` nuevo en el reintento, sin bloqueo de doble clic, reenvío automático al reconectar, eventos duplicados o con salto aplicados, botón fuera de turno o con la conexión no lista, umbral del 60 %, cualquier rechazo fatal, resultado o rechazo ajeno que cierra mi intención, `COMMAND_CONFLICT` como rechazo definitivo, resolución incoherente aceptada, resultado viejo tras un `snapshot`, Vida solo con color, aliados como objetivo, barra invertida, daño calculado en Web, envío sin sincronizar, `commandId` fijo, intención sin marcar como pendiente…): cada una se aplicó sola, se ejecutó la suite de la batalla y se restauró el archivo.
- **Vista previa** (`/__dev/hu17/battle`): monta los componentes y los reductores de producción; **no es evidencia de extremo a extremo** (no hay Combat detrás) y sus marcadores están vetados del bundle productivo (`build:verify`).

## Fuera de alcance (no se inventó)

| Punto                                              | Estado                                                                                                                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Poder (`currentPower`, costo, recarga)             | Combat aún no lo modela; el ataque básico no lo usa. HU-11 / HU-19                                                                                                                           |
| Habilidades y épica                                | HU-19 / HU-31; el panel solo lo avisa                                                                                                                                                        |
| Fin de batalla, ganador, «derrotado»               | HU-21: Web pinta el resultado que publica Combat (`battleFinished`/`snapshot`), muestra el «Sin Vida» y no decide nada; ver [`hu-21-resultado-de-batalla.md`](hu-21-resultado-de-batalla.md) |
| Bonos de daño del equipamiento; participantes `AI` | Pendientes de Combat (ver su documento); Web pinta lo que llegue                                                                                                                             |
| Chamán y Médico                                    | Su ataque lo rechaza Combat (`UNSUPPORTED_COMBAT_PROFILE`) y Web lo explica; el PO debe definirlo                                                                                            |
| Detalle del último golpe tras recargar             | No se persiste en el cliente ni viaja en el `snapshot`; se recupera la Vida y el turno                                                                                                       |
| Varios objetivos o área                            | Fuera del RF-18: el objetivo es siempre uno                                                                                                                                                  |
