# HU-11 — Presentación del recurso Poder

Trazabilidad: `RF-11` → Management `#20` → Tasks `#234`–`#236` →
`HeroPowerPanel`.

## Decisión de alcance

La Task `HU-11.2` excluye UI y combate completo. Por eso esta rama no publica
una pantalla de juego, no inventa una API y no replica `spendPower` o
`regenPower` en React. Añade dos piezas acotadas:

1. `HeroPowerPanel`, componente presentacional listo para recibir el estado del
   contexto de combate;
2. `/__dev/hu11/power`, harness interactivo de revisión que Vite elimina por
   completo de producción.

El preview recorre snapshots reproducibles: estado inicial, gasto válido,
insuficiencia con degradación a ataque básico, cancelación, `+2`, restauración y
aislamiento de otro héroe. Los botones seleccionan resultados ya resueltos; no
calculan reglas de dominio.

## Adaptación del Figma Make

El MCP de Figma identificó el Make `ndxQEppSVEgiAcL46Uf1eC` y sus fuentes
`App.tsx`, `power.ts`, `heroes.ts`, `index.css` y dos imágenes. Se conservó su
intención —héroe, Poder y escenarios de acción en una sola vista—, pero no su
implementación aislada.

La adaptación usa el sistema real del proyecto:

- tokens `surface`, `ink`, `muted`, `border`, `brand`, `danger` y `success`;
- `Button` y la biblioteca `Hero3D` existentes;
- layout responsive y estados accesibles (`progressbar`, `status`, `alert`);
- ningún asset temporal del MCP ni imagen duplicada.

El archivo Make requiere iniciar sesión para ver la previsualización y el lector
de recursos del conector no entregó el contenido de sus enlaces. Por eso no se
copiaron tamaños, hex ni código no verificable; el diseño visual autoritativo es
el Design System que ya usa Nexus Battle Web.

## Contrato de presentación

`HeroPowerPanel` recibe:

- héroe: `heroId`, nombre, Poder actual y máximo;
- resolución: espera, gasto, insuficiencia, acción sin consumo, regeneración o
  restauración.

La UI muestra el valor actualizado de inmediato y explica el fallback. Nunca
decide si una acción se ejecutó ni modifica el saldo.

## Compatibilidad con HU-31

HU-31 define efectos épicos; HU-11 define el costo de Poder. Una épica que el
contexto no pueda pagar llega como `INSUFFICIENT`, muestra la degradación a
ataque básico y conserva el saldo. El componente no aplica daño, duración,
condiciones ni tiradas de HU-31.

## Pendiente productivo

El contexto de combate debe publicar el estado de Poder y el resultado de cada
acción. Solo entonces corresponde montar `HeroPowerPanel` en una ruta
productiva. Hasta ese contrato, el harness es evidencia ejecutable, no una
fuente de verdad ni una pantalla terminada.
