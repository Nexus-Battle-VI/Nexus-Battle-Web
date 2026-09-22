# HU-11 — Poder en batalla (interfaz)

Trazabilidad: `RF-11` → Management `#20` → `PowerMeter`.

La HU pide que el nuevo valor del Poder «se muestre actualizado al jugador durante la batalla o
misión». Este documento describe la parte de interfaz y dice qué falta para verla en una batalla
real. La regla (gastar, +2 por turno, restaurar al terminar el combate) es de Combat, y su
especificación está en
[`docs/hu-11-power.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Player-Inventory/blob/develop/docs/hu-11-power.md)
de Player/Inventory.

## Qué hay

| Pieza           | Dónde                                                    | Qué hace                                                                                              |
| --------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `PowerMeter`    | `src/features/battle-rooms/PowerMeter.tsx`               | Medidor del Poder de **un** héroe: texto `6/10`, barra y anuncio para lectores de pantalla            |
| `describePower` | `src/features/battle-rooms/power.ts`                     | Comprueba que el dato sea presentable (enteros, `0 ≤ actual ≤ máximo`) y prepara el texto             |
| Vista previa    | `src/features/battle-rooms/dev/PowerMeterDevPreview.tsx` | Solo desarrollo, en `/__dev/hu11/poder`: un recorrido de combate de ejemplo y los estados de la barra |

## Principios

- **La interfaz no calcula.** No gasta, no regenera, no restaura y no decide si una habilidad se
  puede pagar. Muestra el `{ current, max }` que envía Combat, tal cual.
- **Actualización inmediata.** `PowerMeter` no tiene estado propio: cuando el padre le pasa un valor
  nuevo, el texto, la barra y el anuncio cambian en el mismo renderizado, así que no puede quedar
  mostrando el valor anterior.
- **Un medidor por héroe.** Cada uno lleva el Poder de un solo héroe y nunca se combina con el de
  otro, igual que en la regla.
- **Un dato roto no se dibuja.** Si `current` o `max` no son enteros no negativos, o `current` supera
  a `max`, se muestra «No disponible» en vez de una barra con un porcentaje inventado o recortado.
  Un héroe con Poder máximo 0 es válido y se muestra `0/0` con la barra vacía.

## Accesibilidad

- La barra es un `role="meter"` con `aria-valuemin`, `aria-valuemax`, `aria-valuenow` y
  `aria-valuetext` («6 de 10»), y se nombra «Poder de <héroe>».
- El texto visible `6/10` está oculto a los lectores de pantalla y en su lugar hay una región
  `aria-live="polite"` con «Poder de <héroe>: 6 de 10». Así cada cambio se anuncia sin leer «6 barra 10».
- La transición de la barra solo se aplica con `motion-safe`.

## Contrato de datos

`{ current: number, max: number }` por héroe, con enteros y `0 ≤ current ≤ max`. Desde HU-19 lo
publica Combat en `battle.combatants[].power` (ver
[`docs/frontend/hu-19-habilidades.md`](./hu-19-habilidades.md) y el contrato `hu-19-skills-v1` de
Infrastructure). Ver también `docs/hu-11-hero-power.md` en Combat.

## Dónde está montado

Desde HU-19, `PowerMeter` está **montado en la arena de batalla**: `BattleArena` pinta uno por
tarjeta de combatiente con el Poder de **ese** participante, y se actualiza con cada `battle` que
llega (`battleStarted`, `basicAttackResolved`, `skillUsed`, `snapshot`). Si la batalla no trae
`power` (Combat anterior a HU-19) no se pinta ningún medidor.

Sigue sin verificarse contra el sistema desplegado ni en un navegador real (Task #416 de HU-19
pendiente).

## Cómo verlo

```bash
npm run dev
```

y abrir `/__dev/hu11/poder`. La ruta solo existe con `import.meta.env.DEV`: el bundle de producción
no la lleva, y `npm run build:verify` lo comprueba.
