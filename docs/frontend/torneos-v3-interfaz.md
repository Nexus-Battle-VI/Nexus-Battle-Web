# Modalidades, árboles y ampliación de HU-85

La interfaz preserva el diseño revisado el 6/7 de octubre y reutiliza los manifiestos
de Cuenta, Comercio y Jugar Online del producto actual. No son assets recuperados de
PixelLab. OBS/YouTube y generación de arte siguen pendientes.

## Registro y calendario

`tournamentMode` fija SOLO/DUO/TRIO (1/2/3 miembros, siempre ocho cupos). El cliente
usa las rutas `/api/v1/tournaments` implementadas por Tournament. Los nuevos
registros envían `invitedMemberIds`, sin identidad del creador, precios de entrada
ni estados de confirmación. Los torneos históricos conservan `companionId` y v2.

Los DTO de B anuncian `torneos-v3.0.0`, `teamSize` y capacidad con `confirmedPeople`
y `totalPeople`. La propuesta documental de A usaba nombres y rutas diferentes;
esta diferencia debe reconciliarse en el contrato común, no en un backend editado
desde Web. Los consentimientos de inscripción pertenecen a cada `members[].subject`;
solo el dueño paga. Los borradores y operaciones se separan por versión/modalidad.

La creación distingue apertura de inscripción y primera aceptación. Su calendario
de seis rondas es una **vista previa**; no modifica una justa ni decide resultados.
Tournament debe persistir y devolver los horarios definitivos.

## Llaves

`bracketLayout.ts` genera posiciones y aristas desde `round`, `track`, `sources` y
`destinations`. Las tarjetas tienen geometría estable; cada conector llega al lado
A/B de la fuente recibida. Ganadores y perdedores se distinguen también por G/P,
línea continua/discontinua y texto. Hay 14 nodos, ocho seeds, 20 aristas y una final.
No hay grafo alternativo de eliminación simple ni reset de la final.

La vista mantiene desplazamiento dentro del diagrama, controles y selección por
teclado, búsqueda de equipo y consulta por rondas. El detalle enlaza por el
`encounterId` real a HU-83. El cliente solicita publicar el bracket; Tournament
valida cupos, consentimiento y elegibilidad. Un conteo en Web no autoriza publicar.

## Evidencia y límites

Base: `origin/develop` 59df33012bf5d6153d5075b0b96e4f9929c00f15. Original y copia
de revisión preservados. Se trasladaron diferencias de la feature, sin reemplazar
el checkout con la copia antigua ni modificar módulos ajenos.

La ruta `/__dev/tournament/formats` monta componentes productivos con fixtures
explícitos. Vite la elimina en producción y `build:verify` comprueba sus marcadores.
Nunca es un fallback de una API caída. Las capturas y pruebas de esa ruta verifican
presentación, no cuentas, cobros, sorteos, motor ni aceptación con JWT real.

Verificación inicial: 198 pruebas de torneo/rutas, TypeScript, ESLint de archivos
pertinentes, compilación y guardia de producción. Playwright comprobó 24
combinaciones de 360/390/768/1280 px, claro/oscuro y SOLO/DUO/TRIO: cardinalidad,
extremos de líneas, teclado, alternativa por rondas y ausencia de overflow de
página. Evidencia externa: `Entregables/Plan-Torneos-3v3-Arboles-HU85-2026-10-07/evidencia/chat-D`.

La tarea de comprensión con Carlos no fue ejecutada. Una captura no acredita que
pueda explicar el origen de su rival o el recorrido tras una derrota.
