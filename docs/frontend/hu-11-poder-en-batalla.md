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

`{ current: number, max: number }` por héroe, con enteros y `0 ≤ current ≤ max`. Es una **propuesta**
para Team Alfa: el protocolo de eventos lo define ADR-020 y Combat todavía no envía el Poder. Ver
`docs/hu-11-hero-power.md` en Combat.

## Lo que falta para verlo en una batalla real

`PowerMeter` **no está montado en ninguna pantalla del producto**, porque las piezas de las que
depende no existen todavía:

1. El inicio de batalla y el agregado de batalla en Combat (HU-17 en adelante), que guarden el Poder
   de cada participante.
2. Un evento de Combat que lleve el Poder de cada participante en el mismo mensaje que lo cambia
   (ADR-020).
3. Una pantalla de batalla en Web que monte un `PowerMeter` por participante y lo alimente con ese
   evento. Hoy solo existe el lobby de preparación.

## Cómo verlo

```bash
npm run dev
```

y abrir `/__dev/hu11/poder`. La ruta solo existe con `import.meta.env.DEV`: el bundle de producción
no la lleva, y `npm run build:verify` lo comprueba.
