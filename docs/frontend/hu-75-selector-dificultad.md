# HU-75 — Selector de dificultad de misión (interfaz)

Trazabilidad: `RF-75` → Management `#60` → Task HU-75.3 `#385` → `MissionDifficultyPicker`.

La HU pide que el jugador elija el nivel de dificultad al matricular una misión y vea un mensaje explicativo cuando no cumple la progresión. Este documento describe la parte de interfaz y dice qué falta para verla en el producto. La regla de desbloqueo es de Missions: está en el [contrato hu-75-mission-difficulty-v1](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/hu-75-mission-difficulty-v1.md) y en la implementación de [Missions #9](https://github.com/Nexus-Battle-VI/Nexus-Battle-Missions/pull/9).

## Qué hay

| Pieza                      | Dónde                                                        | Qué hace                                                                                                       |
| -------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `fetchMissionDifficulties` | `src/features/missions/api.ts`                               | `GET /api/v1/missions/{missionId}/difficulties` por `httpClient`. El jugador lo deduce Missions del testimonio |
| `useMissionDifficulties`   | `src/features/missions/useMissionDifficulties.ts`            | Consulta con la clave `queryKeys.missions.difficulties(subject, missionId)`. Sin sesión no consulta            |
| `DifficultySelector`       | `src/features/missions/DifficultySelector.tsx`               | Los cuatro niveles con su nombre, escalado, recompensa, estado y motivo del bloqueo                            |
| `MissionDifficultyPicker`  | `src/features/missions/MissionDifficultyPicker.tsx`          | Conecta el selector con Missions y cubre cargando, error, vacío y contenido                                    |
| `difficultyPresentation`   | `src/features/missions/difficultyPresentation.ts`            | Nombres en español, «50 % más» a partir del factor y texto del nivel de recompensa                             |
| Vista previa               | `src/features/missions/dev/DifficultySelectorDevPreview.tsx` | Solo desarrollo, en `/__dev/hu75/dificultad`: los dos fixtures del contrato, sin red                           |

## Principios

- **La interfaz no decide.** `unlocked` y `lockReason` llegan resueltos de Missions y se muestran tal cual. Impedir elegir un nivel bloqueado es solo una ayuda: la validación real ocurre al matricular (`422 PROGRESSION_LOCKED`), y `HttpError` ya expone el `message` que redactó Missions.
- **El porcentaje sale del servicio.** «50 % más» se calcula a partir del factor `1.5` que envía Missions, no de una tabla propia. Mítico llega sin factor y se muestra «Dificultad máxima», sin inventar un número.
- **La identidad va en la clave de caché**, como en el carrito: el desbloqueo es propio de cada jugador y no debe reutilizarse entre sesiones.

## Accesibilidad

- El grupo es un `role="radiogroup"` nombrado «Dificultad». Cada nivel es un `<button role="radio">` con `aria-checked`, igual que `SelectableCard`.
- Un nivel bloqueado usa `aria-disabled` y no `disabled`: sigue siendo alcanzable con Tab y el lector de pantalla lee el motivo, enlazado con `aria-describedby`.
- El nombre accesible es solo el nivel (`aria-labelledby`). El escalado, la recompensa y el motivo van en la descripción.
- El bloqueo se comunica con la etiqueta «Bloqueado», el borde discontinuo y el motivo, nunca solo con color.
- Contraste medido en el navegador a 1360×768: todos los textos del selector pasan WCAG AA, con un mínimo de 5,2:1 en tema oscuro y 4,82:1 en tema claro. Para lograrlo no se atenúan las tarjetas bloqueadas con `opacity`, y las etiquetas de estado y el nivel elegido van en color de tinta: el texto de color de `StatusBadge` y el color de marca quedaban por debajo de 4,5:1.

## Responsividad (RNF-07)

La rejilla usa `repeat(auto-fit, minmax(12rem, 1fr))`, sin breakpoints propios. A 1360×768 las cuatro tarjetas caben en una fila y la página no desborda en horizontal.

## Pruebas y lo que NO se verificó

| Suite                                       | Qué demuestra                                                                                                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DifficultySelector.test.tsx`               | Grupo accesible, motivo del bloqueo como descripción, teclado, un nivel bloqueado que no se elige ni con ratón ni con teclado, y que el selector obedece al servicio aunque sus datos contradigan la regla. También Mítico libre, elegible y sin porcentaje inventado (P-05, Task HU-75.4) |
| `MissionDifficultyPicker.test.tsx`          | Los cuatro estados, con el `fetch` sustituido en su frontera: cargando, error con el mensaje del servicio, vacío distinto del error y contenido. También que sin sesión no se consulta y la clave de caché                                                                                 |
| `api.test.ts`                               | La URL del contrato, el testimonio en la cabecera y no en la URL, el identificador codificado y el `HttpError` con el mensaje de Missions                                                                                                                                                  |
| `difficultyPresentation.test.ts`            | Nombres, porcentajes a partir del factor y Mítico sin porcentaje inventado                                                                                                                                                                                                                 |
| `dev/DifficultySelectorDevPreview.test.tsx` | Los dos escenarios de la vista previa y la elección                                                                                                                                                                                                                                        |

**Integración local verificada:** Missions, desde la rama de HU-75.2, corrió en local con `AUTH_MODE=disabled`, Vite hizo de proxy de `/api` y el selector se montó en una página temporal. Missions respondió el contrato, Normal se pudo elegir y Heroico, bloqueado, no.

**No verificado:** el selector no está montado en ninguna pantalla del producto, ni se probó contra Missions desplegado ni con una sesión de Cognito. Eso llega cuando HU-70.3 monte el detalle y la matrícula de la misión.

## Qué falta para verlo en el producto

| Pendiente                                                                  | Depende de                                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Montar `MissionDifficultyPicker` en el detalle y la matrícula de la misión | HU-70.3 (#367)                                                                          |
| Enviar `difficulty` al matricular y mostrar el `422 PROGRESSION_LOCKED`    | HU-70.2 (#366) y HU-70.3                                                                |
| Tener el endpoint desplegado                                               | HU-75.2, [Missions #9](https://github.com/Nexus-Battle-VI/Nexus-Battle-Missions/pull/9) |
| Ver niveles desbloqueados por progreso real                                | HU-72, que registra los niveles completados                                             |
