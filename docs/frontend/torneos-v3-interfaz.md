# Modalidades, árboles y ampliación de HU-85

La interfaz preserva el diseño revisado el 6/7 de octubre y reutiliza los manifiestos
de Cuenta, Comercio y Jugar Online del producto actual. No son assets recuperados de
PixelLab. OBS/YouTube y generación de arte siguen pendientes.

## Registro y calendario

`tournamentMode` fija SOLO/DUO/TRIO (1/2/3 miembros, siempre ocho cupos). El cliente
usa las rutas `/api/v1/tournaments` implementadas por Tournament. Los nuevos
registros envían `invitedMemberIds`, sin identidad del creador, precios de entrada
ni estados de confirmación. Los torneos históricos conservan `companionId` y v2.

Los DTO de B y la revisión 3 del contrato común de A anuncian `torneos-v3.0.0`,
`teamSize`, `roundSchedule` y capacidad con `confirmedPeople` y `totalPeople`.
Las propuestas iniciales fueron reconciliadas con las rutas y campos implementados;
Web no editó Tournament ni Combat. Los consentimientos de inscripción pertenecen a cada `members[].subject`;
solo el dueño paga. Los borradores y operaciones se separan por versión/modalidad.

La creación distingue apertura de inscripción y primera aceptación. Su calendario
de seis rondas es una **vista previa**; no modifica una justa ni decide resultados.
El resumen y las llaves usan el `roundSchedule` persistido que devuelve Tournament,
y cada justa usa `scheduledStartAt` de su consulta. No hay edición posterior.

## Convocatoria, resultados y administración

Las consultas HU-83 existentes añaden `acceptanceStatus`, `operationalStatus`,
`acceptedCounts`, `myAcceptance`, `blockReason`, `resolution` y `serverNow`.
El JWT sigue determinando el actor: `POST /api/v1/tournaments/:id/matches/:encounterId/acceptance`
solo envía `operationId`. Se conserva la intención en doble click, reconexión y
errores 401/403/409/503. La confirmación personal puede proceder del recibo POST
validado; los conteos se releen del servidor, sin incrementos optimistas.

El contador reutiliza el reloj monotónico de batalla, anclado a la hora recibida
al completar HTTP. Revalida el deadline al pulsar, incluso entre ticks visuales.
Sin reloj válido, conexión o consulta actualizada no habilita aceptación.
Al reconectar se consultan hora, recibo y conteos. No decide aperturas, cierre,
ganadores ni sorteos.

`resolution.resultType=ABSENCE` muestra ganador, aceptaciones al cierre, regla
y recibo/sorteo conservado; oculta resultado y eventos de Combat. `PLAYED` usa
`combatResult` oficial, con compatibilidad para el resultado HU-83 legado.
Un bloqueo de dependencias y una operación de Combat pendiente tienen mensajes
distintos. Una final sin sala no genera un enlace de combate.

La administración requiere cierre confirmado, ambos rosters completos, conteos
completos y hora prevista antes de preparar/iniciar. Tournament vuelve a validar
la acción. Las filas y sus operaciones son independientes; la auditoría conserva
el actor y recibo originales del worker. No hay acciones para reprogramar,
cancelar una justa o elegir ganador. La transmisión conserva sus permisos.

La navegación a `/play/rooms/:roomId/battle` reutiliza BattlePage/BattleScreen y
sus controles del jugador. La consulta HU-83 representa todos los integrantes,
sin truncar al prototipo de cuatro. Se corrigió un desbordamiento de la cabecera
a 360 px cuando coincidían cuenta, saldo pendiente y tema: los controles pueden
pasar a una segunda fila sin alterar el orden de lectura.

## Llaves

`bracketLayout.ts` genera posiciones y aristas desde `round`, `track`, `sources` y
`destinations`. Las tarjetas tienen geometría estable; cada conector llega al lado
A/B de la fuente recibida. Ganadores y perdedores se distinguen también por G/P,
línea continua/discontinua y texto. Hay 14 nodos, ocho seeds, 20 aristas y una final.
No hay grafo alternativo de eliminación simple ni reset de la final.

La vista comienza por ganadores; los controles permiten elegir perdedores, final
o todas las 14 justas. El ancho se mide en el panel, incluso cuando este es más
estrecho que el navegador. Si la rama no cabe con texto legible, se consulta una
ronda a la vez, con selector y botones anterior/siguiente; «Ver árbol» permite
recorrer el diagrama completo con desplazamiento contenido y zoom. «Ajustar»
recupera la adaptación automática. La geometría de los nodos compactos y sus
puertos coincide con los estilos y conectores; no cambia el grafo del servidor.

La vista mantiene selección por teclado y búsqueda de equipo. El detalle enlaza por el
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

Verificación del primer incremento: 198 pruebas de torneo/rutas, TypeScript, ESLint de archivos
pertinentes, compilación y guardia de producción. Playwright comprobó 24
combinaciones de 360/390/768/1280 px, claro/oscuro y SOLO/DUO/TRIO: cardinalidad,
extremos de líneas, teclado, alternativa por rondas y ausencia de overflow de
página. Evidencia externa: `Entregables/Plan-Torneos-3v3-Arboles-HU85-2026-10-07/evidencia/chat-D`.

La verificación del segundo incremento y su SHA final se registran en
`estado/chat-D.json` y en los logs de esa carpeta. `validate-calendar-browser.mjs`
comprueba 64 combinaciones de ancho/tema/estado, con convocatoria, administración
y consulta. Son DTO de demostración, no ejecuciones de Tournament.

`capture-real-combat.mjs` arranca el módulo compilado de Combat sin modificar
su repositorio: HTTP, guard HMAC, motor y WebSocket reales; Account, Inventory,
verificación JWT, compromisos y drops son dobles explícitos; persistencia en
memoria. Preparó/inició E1/E2 simultáneas con 3+3, ejecutó un ataque al tercer
puesto y comprobó que E2 no avanzó por ese ataque. BattlePage productiva recibió
HTTP/WS reales a 360/390/768/1280 px en ambos temas. El registro conserva SHA de
Combat, hash del módulo compilado y bytes de los mensajes; Web los pasa por sus
guardas/reductor/arena en `TrioCombatWire.test.tsx`.

Eso acredita el motor y su representación, no el recorrido completo de 24
cuentas reales, el worker de Tournament desplegado, premios ni persistencia tras
reinicio. Esa integración corresponde al cierre coordinado A/B/C/D; OBS/YouTube
y nuevos recursos PixelLab siguen fuera de esta entrega.

La tarea de comprensión con Carlos no fue ejecutada. Una captura no acredita que
pueda explicar el origen de su rival o el recorrido tras una derrota.

## Vista capturable por modalidad

La captura utiliza `BattleScreen`, la misma arena remasterizada de Jugar Online, con modelos `Hero3D`, HUD de Vida/Poder y turno autoritativo. La ruta compone `SpectatorArena` con la captura de Tournament mediante un contrato visible compartido; no se duplica la arena. Tournament conserva `startedAt`, `seat` y `heroSubtype` publicados por Combat. Un ID opaco de inventario nunca decide el modelo visual. Un subtipo ausente o desconocido usa el marcador seguro de la biblioteca.

El espectador no recibe controles de ataque/habilidades, selección de objetivos, apuestas ni consultas de premios propios. El final procede de `snapshot.status/result`; no se calculan ganador, daño, turnos ni temporizadores que el snapshot no publica. La acción resumida se muestra tal como llega; la retransmisión por consultas no reproduce cada animación o evento intermedio del WebSocket del jugador.

La observación acepta dos lados completos de 1, 2 o 3 jugadores: 2/4/6 combatientes únicos. Rechaza tamaños impares, lados mezclados o incompletos, jugadores duplicados y etiquetas ajenas; conserva la última vista válida al recibir un estado incoherente. Se cubre la ruta productiva mediante HTTP para SOLO/DUO/TRIO y el cambio E1→E2 sin controles de jugador.

La vista del administrador designado sigue siendo una consulta para capturar con OBS. La aplicación publica los enlaces externos; no inicia ni graba un directo en YouTube por sí misma. Las pruebas de captura con datos de QA no acreditan un torneo completo con cuentas operativas ni una emisión recibida por YouTube.
