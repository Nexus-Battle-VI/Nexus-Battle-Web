# Sprites originales de héroes en la arena

La arena de Jugar Online y la vista de espectador usan los ocho PNG de
`Nexus-Heroes-Showcase.zip`, entregado por el usuario el 8 de octubre de 2026.
`HeroSprite` consume un catálogo derivado de sus JSON originales, con los mismos
ocho identificadores oficiales de `hero-ids.ts`. Inventario y catálogo mantienen
su representación 3D; si falla un PNG, la arena también dispone de `Hero3D` como
fallback.

Los PNG y JSON se conservan sin modificación en `public/assets/heroes/sprites`.
`provenance.json` conserva las referencias de los exports y sus SHA-256; las
pruebas comprueban los 16 hashes, dimensiones, límites de celdas y 338 frames.
El catálogo de producción está en `hero-sprites.json`; no ejecuta el JavaScript
del showcase ni añade dependencias.

## Correspondencia

| Pack    | Identificador oficial |
| ------- | --------------------- |
| tank    | guerrero-tanque       |
| weapons | guerrero-armas        |
| fire    | mago-fuego            |
| ice     | mago-hielo            |
| poison  | picaro-veneno         |
| machete | picaro-machete        |
| shaman  | chaman                |
| medic   | medico                |

## Reproducción y límites

La postura se reproduce a ocho fps, un valor de presentación porque el export
no especifica ritmo. Se conserva la celda completa y su pivote central, sin
recortes ni espejos. El lado izquierdo usa sudeste y el derecho noroeste,
independientemente de quién sea el jugador. Si falta una secuencia en esa
dirección, se muestra la pose original correspondiente. La médica tiene ocho
poses y ninguna animación: se mantiene estática.

Una reducción de vida observada dispara la secuencia de recibir golpe solo
cuando existe en esa dirección. No genera daño, turnos, habilidades o resultados.
Al llegar la vida a cero, la postura se pausa y atenúa; no se inventa una muerte.
La reproducción respeta `prefers-reduced-motion`. El área de selección de
objetivos, la formación, los nombres y el HUD conservan sus contratos.

El pack contiene 13 animaciones en 38 secuencias direccionales y 64 poses.
Faltan sprites de ataque, lanzamiento de habilidades y muerte; tampoco incluye
efectos, audio o armas/ítems separados. Esta entrega visual no acredita la
aceptación funcional de torneos, pagos, premios o cuentas operativas.
