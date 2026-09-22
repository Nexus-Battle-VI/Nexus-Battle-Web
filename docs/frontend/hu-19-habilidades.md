# HU-19 — Habilidades, Poder y recarga (interfaz)

Trazabilidad: `RF-19` → Management [`#63`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/63) → Task de Web [`#415`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/issues/415) → `SkillList`, `skillIntent`, `skillPresentation` y `useBattleRealtime`.

La HU pide que quien tiene el turno **ejecute una habilidad** contra un objetivo, que el servidor valide el Poder y la recarga, resuelva el resultado y lo difunda a ambos clientes. Este documento describe **solo la interfaz**. Las reglas, el orden de sorteos, la idempotencia y la persistencia son de **Combat**; el contrato está en
[`docs/contracts/hu-19-skills-v1.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/hu-19-skills-v1.md)
de Infrastructure y el detalle del servidor en
[`docs/hu-19-skills.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Combat/blob/develop/docs/hu-19-skills.md)
de Combat.

> **La habilidad ÉPICA no está en esta entrega.** Depende de HU-31 (#78): hoy no existe una fuente que diga cuál épica está activa, y el Catalog v1 solo admite un efecto específico por épica. La interfaz **no** tiene botón de épica y lo dice en texto. Ver «Épica».

## Qué hace la interfaz (y qué no)

|                                             | Web                                                      | Combat                                                       |
| ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| Qué habilidad y contra quién                | **Elige** y envía la intención (`abilityId` + objetivo)  | Valida turno, objetivo, que la habilidad sea del héroe       |
| Costo de Poder, si alcanza, Poder que queda | Nada: **muestra** el costo y el Poder que llegan         | Todo (paga, o degrada a ataque básico si no alcanza — HU-11) |
| Recarga (cuántos turnos, cuándo termina)    | Nada: **muestra** `cooldownRemaining` y `status`         | Todo (marca la recarga, la descuenta al cerrar el turno)     |
| Resultado, daño, Vida, turno siguiente      | Nada: **pinta** lo que llega                             | Todo (HU-20, HU-24, HU-25)                                   |
| Idempotencia                                | Un `commandId` por intención; reintento con el **mismo** | Devuelve el resultado guardado, sin cobrar Poder dos veces   |

Web **nunca** envía costo, Poder, efectos, Ataque, Defensa, daño, Vida, semilla ni turno, y **no usa aleatoriedad de juego**.

Tras el final de la batalla (HU-21) el panel de acciones y las habilidades **desaparecen** (no se muestran deshabilitadas) y en su lugar aparece el resultado que publica Combat; ver [`hu-21-resultado-de-batalla.md`](hu-21-resultado-de-batalla.md).

## Qué hay

| Pieza                | Dónde                         | Qué hace                                                                                                                        |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Tipos y guardas      | `battle/types.ts`             | `power` y `skills` en `combatants`, `skillUsed` y `degradedFrom`, validados campo por campo; un mensaje mal formado se ignora   |
| `battleReducer`      | `battle/battleReducer.ts`     | Igual que en HU-18 (`seq === lastSeq + 1`); guarda `lastSkill` y `degradedFrom` tal como llegaron; una instantánea los descarta |
| `skillIntentReducer` | `battle/skillIntent.ts`       | Máquina de estados de **una** intención de habilidad: pendiente, sin confirmar, rechazada                                       |
| `useBattleRealtime`  | `battle/useBattleRealtime.ts` | `sendSkill` / `retrySkill`: una sola acción a la vez (habilidad o ataque), sin reenvío automático                               |
| `SkillList`          | `battle/SkillList.tsx`        | Las habilidades del héroe con costo, recarga y estado en **texto**; botón por habilidad; avisos de reintento y rechazo          |
| `skillPresentation`  | `battle/skillPresentation.ts` | Textos y disponibilidad; `describeLatestAction` elige entre ataque y habilidad por `seq`                                        |
| `PowerMeter` (HU-11) | `PowerMeter.tsx`              | Ahora **montado** en cada tarjeta de la arena, con el Poder de **ese** héroe                                                    |

## Cuándo aparecen las habilidades

Solo en **tu turno**, si la batalla trae estado de habilidades y tu héroe tiene Vida y al menos una habilidad. Se ubican junto al «Ataque básico» y comparten el objetivo elegido. Cada una muestra su nombre, su costo («2 de Poder» o «Todo el Poder»), su estado y su recarga, todo en texto:

| Estado que publica Combat | Qué se ve                                               | Botón                                |
| ------------------------- | ------------------------------------------------------- | ------------------------------------ |
| `READY`                   | «Disponible · 1 turno de recarga»                       | Habilitado (con objetivo y conexión) |
| `RECHARGING`              | «En recarga: falta 1 turno»                             | Deshabilitado                        |
| `UNSUPPORTED`             | «Todavía no disponible» y «Todavía no está disponible.» | Deshabilitado                        |

«Deshabilitado» usa `aria-disabled` (no `disabled`): el botón conserva el foco mientras espera y el clic se ignora; la razón es texto visible enlazado con `aria-describedby`. Con otra acción pendiente (un ataque **o** una habilidad) todas quedan bloqueadas: hay una acción por turno.

**El Poder NO deshabilita ninguna habilidad.** HU-11 manda que con Poder insuficiente la acción **se degrade a un ataque básico** en ese turno, y esa decisión es de Combat. La interfaz lo avisa con un texto fijo («Si tu Poder no alcanza, se usa un ataque básico en su lugar y la habilidad no se gasta») y deja que Combat resuelva. Cuando ocurre, llega un `basicAttackResolved` con `degradedFrom` y el mismo `commandId`: **no es un error**, cierra la intención como cualquier resultado y se explica en la franja de resultado («X no tenía Poder suficiente para Y: se usó un ataque básico… La habilidad no se gastó ni quedó en recarga»).

## Un comando por intención

```json
{
  "type": "useSkill",
  "commandId": "6f0b6f0e-…",
  "roomId": "aaaaaaaa-…",
  "abilityId": "2e97537a-…",
  "target": { "teamLabel": "B", "seat": 0 }
}
```

- Exactamente esas cinco claves; el objetivo es **uno**, identificado por `(teamLabel, seat)`. Una guarda estática comprueba la lista blanca en el código del hook.
- `abilityId` es el `productId` de Catalog tal como lo publica Combat en `skills[].abilityId`.
- El `commandId` se genera **una vez por intención**. **No hay reenvío automático**: tras un corte de conexión (o un `COMMAND_CONFLICT`) la intención queda **sin confirmar** y se ofrece «Reintentar habilidad», que reenvía el **mismo** `commandId`: si Combat ya lo procesó devuelve el resultado guardado sin cobrar el Poder ni marcar la recarga otra vez.
- Un rechazo definitivo cierra la intención y se anuncia con `role="alert"` y **texto propio por código** (nunca el del servidor):

| Código                                                                                                                                                       | Texto (resumen)                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `NOT_YOUR_TURN`, `BATTLE_NOT_ACTIVE`, `INVALID_TARGET`, `SAME_TEAM_TARGET`, `TARGET_UNAVAILABLE`, `ACTOR_UNAVAILABLE`, `NOT_A_PARTICIPANT`, `ROOM_NOT_FOUND` | Como en HU-18, adaptados a la habilidad                         |
| `UNKNOWN_SKILL`                                                                                                                                              | «Esa habilidad no pertenece a tu héroe.»                        |
| `UNSUPPORTED_SKILL_EFFECT`                                                                                                                                   | «…su efecto aún no está definido para el combate.»              |
| `SKILL_ON_COOLDOWN`                                                                                                                                          | «Esa habilidad sigue en recarga. Tu turno no se consumió.»      |
| `SKILLS_NOT_AVAILABLE`                                                                                                                                       | «Esta batalla comenzó antes de que existieran las habilidades…» |
| `UNSUPPORTED_COMBAT_PROFILE`                                                                                                                                 | «Las habilidades todavía no están disponibles para este héroe…» |
| cualquier otro                                                                                                                                               | «No fue posible usar la habilidad. Inténtalo de nuevo.»         |

Un rechazo de habilidad (`command: "useSkill"`) **no** vuelve inaccesible la batalla.

## Qué pinta y cómo

- **Poder**: un medidor por héroe (`PowerMeter` de HU-11) en su tarjeta, `role="meter"` con «Poder de <héroe>». El Poder **pertenece al participante**, nunca se combina con el de otro. Se actualiza con cada `battle` nuevo, sin estado propio. Sin `power` en la batalla (Combat anterior a HU-19) no hay medidor.
- **Resultado de la última acción**: la misma región viva (`role="status"`, `aria-live="polite"`, «Resultado de la última acción») que en HU-18. Si la última acción fue una habilidad muestra quién la usó y contra quién, el efecto, el daño, la Vida antes → después, los **bonos de la habilidad** (solo si son mayores que 0), el **Poder antes → después** y la **recarga**. Gana la acción de `seq` mayor (ataque o habilidad). Todo sale de lo que envió Combat; ambos jugadores ven el mismo texto. Tras recargar (`snapshot`) se recupera el Poder, la recarga, la Vida y el turno vigentes, pero **no** el detalle del último golpe.
- **Habilidades sin efecto soportado** (10 de las 24 del Catalog desplegado hoy; ninguna de las curativas): salen como «Todavía no disponible». No es un fallo: Combat solo ejecuta los efectos que sabe resolver (ver el contrato §10 y §16).

## Épica

No hay botón ni estado de épica. El panel muestra el texto «La habilidad épica llegará cuando el juego defina cómo se equipa; hoy no hay ninguna disponible.» El motivo es el bloqueo de HU-31 (#78): no existe una fuente de «épica activa/equipada» ni el Catalog v1 admite varios efectos específicos. Web **no** inventa una selección de épica.

## Accesibilidad

- Todo lo importante es **texto** (costo, recarga, estado, motivo de no disponibilidad, resultado): el color solo refuerza.
- El botón mantiene el foco mientras espera (`aria-disabled`); `aria-busy` y «Usando…» en la habilidad enviada.
- Los avisos de reintento y de rechazo son `role="alert"`; el medidor de Poder anuncia cada cambio con una región `polite`.
- Los nombres de habilidad se pintan como texto (React escapa el marcado); una prueba lo comprueba con HTML hostil.

## Pruebas y lo que NO se verificó

| Prueba                         | Qué fija                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `skillTypes.test.ts`           | Guardas: `power`, `skills`, `skillUsed`, `degradedFrom` (aceptan lo válido; rechazan cada variante inválida)                         |
| `skillReducer.test.ts`         | `lastSkill`, duplicados, saltos de `seq`, instantáneas, `degradedFrom`                                                               |
| `skillIntent.test.ts`          | La máquina de estados de la intención                                                                                                |
| `skillPresentation.test.ts`    | Textos, disponibilidad (el Poder no deshabilita), resultado, degradación                                                             |
| `SkillList.test.tsx`           | Componente: estados, clic, accesibilidad, avisos, HTML hostil                                                                        |
| `BattleScreen.skills.test.tsx` | Medidores por héroe, panel de acciones, franja de resultado                                                                          |
| `useBattleSkill.test.tsx`      | El hook: comando exacto, doble clic, resultado, rechazos, reintento y reconexión                                                     |
| `BattlePage.skill.test.tsx`    | Del clic al resultado en la página, incluida la degradación                                                                          |
| `combatSkillWire.test.tsx`     | **Bytes reales** de Combat (`combat-skill-wire.fixture.json`) por las guardas, el reductor y la pantalla, desde las dos perspectivas |
| `noClientAuthority.test.ts`    | Guardas estáticas: sin aritmética de Poder/costo/recarga, sin estado asignado, lista blanca del comando                              |

**No se verificó** en un navegador real, ni contra el sistema desplegado (Player-Inventory, Catalog y Combat reales): `combat-skill-wire.fixture.json` son bytes que produjo Combat en su prueba de extremo a extremo con MongoDB real, pero pasados por Web en jsdom. La Task #416 (validación 1 contra 1 con dos clientes reales) queda **pendiente** hasta que el sistema esté desplegado en el orden Player-Inventory → Combat (`npm run migrate`, migración 008) → Web.

## Despliegue

Web depende de que Combat publique `power` y `skills`. Si Web se despliega antes que Combat, los campos están ausentes y la interfaz se comporta como en HU-18 (sin medidor ni habilidades): los campos son **opcionales** en las guardas.
