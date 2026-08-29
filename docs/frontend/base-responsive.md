# Base responsive de Nexus-Battle-Web

Este documento define y versiona el contrato técnico transversal de responsividad de
`Nexus-Battle-Web`, exigido por `RNF-07`.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#265`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#195`

## Propósito

`EN-007 — Responsividad de la interfaz` (`Nexus-Battle-VI/Nexus-Battle-Management#195`) establece
una base común de diseño e implementación responsive para las interfaces web del producto. Sin esa
base, cada Historia de Usuario puede implementar su layout de forma aislada y producir
superposiciones, controles inaccesibles, navegación rota, duplicación de estilos o incumplimiento de
`RNF-07`.

`EN-007.1 — Definir y versionar la base responsive reutilizable de Nexus-Battle-Web`
(`Nexus-Battle-VI/Nexus-Battle-Management#265`) es la Task que deja disponible ese contrato. No
implementa patrones reutilizables concretos (`EN-007.2`) ni ejecuta la evidencia final de
verificación (`EN-007.3`).

## Resolución de referencia (RNF-07)

La resolución mínima obligatoria de **referencia** para verificar `RNF-07` es:

```text
1360 × 768 px
```

Esto significa que toda interfaz incluida en el incremento, ejecutada a `1360 × 768`, debe
conservar:

- contenido principal legible;
- navegación operable;
- acciones obligatorias disponibles;
- ausencia de superposiciones críticas;
- ausencia de recortes que impidan completar el flujo.

**`1360 × 768` no es:**

- un breakpoint CSS obligatorio;
- el único viewport permitido;
- un ancho máximo de diseño;
- una resolución de diseño fija;
- una exigencia mobile-first;
- una justificación para crear breakpoints arbitrarios.

Un breakpoint técnico concreto solo puede introducirse cuando la infraestructura vigente o una
necesidad objetiva de un layout lo justifique — no como anticipación especulativa.

## Conservación funcional

Cuando un layout se adapta o se reorganiza, no puede:

- ocultar ni eliminar un control obligatorio;
- alterar una regla de negocio;
- impedir completar un flujo;
- impedir la navegación;
- impedir enviar un formulario;
- impedir el acceso a un control necesario;
- impedir la lectura de información necesaria;
- cambiar el significado funcional de una Historia de Usuario.

Esta regla es transversal: se aplica a toda pantalla presente y futura del producto,
independientemente de qué Task o bounded context la implemente.

## Contenedores

- El contenido usa el espacio disponible del viewport en lugar de anchos fijos en píxeles.
- El ancho máximo de un contenedor de contenido (cuando existe, como en `AppLayout`) se expresa
  como límite de legibilidad, no como diseño para una resolución concreta, y se combina con padding
  horizontal para evitar que el contenido toque el borde del viewport.
- El overflow horizontal no controlado a nivel de página no es aceptable: si un contenedor puede
  exceder el ancho disponible, la contención u overflow local (ver [Overflow](#overflow)) es
  responsabilidad de ese contenedor, no del `body`.
- No se fijan medidas arbitrarias sin relación con el contenido real que el contenedor aloja.

## Layout

- La distribución horizontal y vertical usa `flex` o `grid` según la infraestructura vigente
  (Tailwind CSS 4), evitando posicionamiento absoluto para estructura de página.
- Cuando el espacio disponible disminuye, los elementos que no caben en una fila se reorganizan
  (`flex-wrap` u otro mecanismo equivalente) en lugar de desbordar o solaparse.
- La lógica funcional de una pantalla permanece separada de su presentación: un cambio de layout no
  requiere ni produce un cambio de comportamiento.

## Navegación

La navegación principal debe permanecer, en toda condición de espacio contemplada por este contrato:

- visible o accesible (no eliminada silenciosamente);
- identificable (una persona puede reconocer que es la navegación);
- operable (cada destino sigue siendo alcanzable);
- funcionalmente completa (ningún destino desaparece al reorganizarse).

## Formularios

Un formulario que se adapta a un espacio menor conserva:

- las etiquetas (`label`) asociadas a cada campo;
- los campos de entrada;
- los mensajes de validación o error, visibles;
- los botones de acción;
- el orden lógico de lectura y de tabulación;
- las acciones obligatorias para completar el formulario.

## Tablas y listados

Ningún dato ni ninguna acción crítica puede quedar inutilizable cuando el espacio disminuye. Según
corresponda al caso concreto, la estrategia puede incluir reorganización del contenido, wrapping de
texto, scroll localizado al contenedor de la tabla o listado (no scroll horizontal de página
completa), o una representación alternativa del mismo dato. Esta Task no impone una única estrategia
para todos los casos ni implementa estas estrategias de forma indiscriminada: `EN-007.2` decide e
implementa el patrón concreto cuando una pantalla real lo requiera.

El único listado real existente hoy (`/catalog`) ya seguía, antes de esta Task, un patrón
compatible: cada fila usa `min-w-0` en el bloque de texto y `truncate` en el nombre del producto para
absorber el espacio que falta, y `shrink-0` en el bloque de precio/estado para que nunca ceda espacio
a costa de volverse ilegible.

## Tarjetas

Una tarjeta (`Card`) que se adapta a un espacio menor no puede:

- ocultar información crítica de su contenido;
- eliminar una acción disponible en su contenido;
- romper la jerarquía funcional entre título, descripción y contenido.

## Overflow

Se distinguen dos categorías:

- **Overflow controlado**: el contenido excede visualmente el espacio ideal pero no impide leer la
  información ni ejecutar la operación (por ejemplo, un scroll localizado en un contenedor concreto,
  o texto que se recorta con una alternativa accesible para leerlo completo).
- **Overflow crítico**: el contenido impide leer información necesaria, acceder a un control o
  completar el flujo. Esto nunca es aceptable, independientemente de la resolución.

El overflow no se resuelve mediante hacks globales (por ejemplo, `overflow: hidden` a nivel de
`body` o de contenedores de layout de alto nivel para "ocultar" un problema de espacio); se resuelve
en el contenedor concreto que produce el desbordamiento.

## Reorganización del contenido

Cuando el espacio disponible disminuye, el contenido se reorganiza (cambia de disposición, apila
elementos, ajusta espaciados) en lugar de recortarse, solaparse o volverse inoperable. La
reorganización es válida como estrategia general de este contrato; el mecanismo técnico concreto
(qué se apila, en qué orden, con qué utilidad de Tailwind) lo decide cada implementación según su
contenido real.

## Reutilización

- Los patrones responsive comunes (contenedores, navegación, formularios, tablas o listados,
  tarjetas) deben reutilizarse entre features cuando exista un patrón equivalente ya definido, en
  lugar de reimplementarse de forma aislada por cada Historia de Usuario.
- Una feature no debe duplicar una regla responsive ya resuelta por una capa compartida
  (`src/components/ui`, `src/shared`) sin una justificación objetiva.
- Una feature no importa directamente la implementación interna de otra feature para reutilizar un
  patrón visual; la capa compartida es el punto de reutilización, siguiendo la misma regla de
  arquitectura ya vigente en el repositorio (ver `CONTRIBUTING.md`, sección "Reglas de
  arquitectura").
- `EN-007.1` deja establecida esta regla. `EN-007.2` implementará los patrones o utilidades
  reutilizables concretos que resulten realmente necesarios al construir nuevas pantallas.

## Frontera entre EN-007.1, EN-007.2 y EN-007.3

| Task            | Responsabilidad                                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EN-007.1` #265 | Define y versiona el contrato responsive: referencia`1360 × 768`, conservación funcional, criterios de contenedores, layout, navegación, formularios, tablas/listados, tarjetas, overflow, reorganización y reutilización. |
| `EN-007.2` #266 | Implementa los patrones responsive comunes, componentes o utilidades reutilizables y los ajustes técnicos compartidos que resulten objetivamente necesarios para que las pantallas cumplan este contrato.                  |
| `EN-007.3` #267 | Verifica y consolida`RNF-07`: ejecuta la verificación reproducible por interfaz, resolución, resultado esperado y resultado obtenido, y conserva la evidencia final.                                                       |

Este documento no adelanta trabajo de `EN-007.2` ni de `EN-007.3`: no implementa patrones
reutilizables concretos más allá de los ya existentes en el repositorio, y no declara ninguna
verificación de `RNF-07` como concluida.

## Compatibilidad con el Design System

`EN-021.7` (`Refs Nexus-Battle-VI/Nexus-Battle-Management#264`), ya integrado en la historia base de
`develop` al iniciar esta Task, incorporó la tipografía `Inter` y la librería de iconos `Lucide` al
código de `Nexus-Battle-Web`. Ese alcance es de recursos tipográficos e iconográficos, no de reglas
de layout o de spacing responsive, por lo que no existe conflicto entre ambos: este documento no
modifica tokens, Foundations, componentes ni la paleta visual definidos por el Design System.

## Estado auditado al versionar este contrato

La auditoría técnica realizada para esta Task encontró:

- Ningún breakpoint CSS (`sm:`, `md:`, `lg:`, `xl:`, `@media` de ancho) existe todavía en
  `src/`; la única regla `@media` presente es la de preferencia de esquema de color en
  `src/index.css`.
- `AppLayout.tsx` ya usa `flex-wrap` en la navegación y un contenedor de ancho limitado
  (`max-w-5xl`) con padding horizontal, sin anchos fijos en píxeles.
- Los componentes compartidos (`Card`, `Button`, `QueryState`, `StatusBadge`) no declaran anchos
  fijos y son compatibles con este contrato sin modificación.
- De las seis rutas/páginas actualmente declaradas en `Nexus-Battle-Web`, solo `/catalog` tiene contenido funcional real en este estado del repositorio; ya usa un patrón de
  listado compatible con este contrato (ver [Tablas y listados](#tablas-y-listados)). Las cinco
  restantes son marcadores de posición declarados explícitamente y no contienen layout que evaluar
  todavía.
- No existe ningún elemento `<table>` en el repositorio.

Por lo anterior, esta Task no requirió corregir código para dejar versionado el contrato: la
infraestructura vigente ya es compatible con los criterios aquí definidos.

## Actualización de este documento

Este documento debe actualizarse cuando ocurra cualquiera de los siguientes eventos:

- se introduce un breakpoint CSS con una justificación técnica objetiva;
- se identifica una necesidad de layout no cubierta por los criterios actuales;
- `EN-007.2` define un patrón reutilizable que afecta alguno de los criterios aquí descritos;
- `EN-007.3` identifica, durante la verificación, un ajuste necesario a este contrato.

## Trazabilidad

Toda modificación de este documento debe poder trazarse hacia:

- Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#265`
- Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#195`
- RNF: `RNF-07`

Se utiliza siempre el nombre completo del repositorio al referenciar estos números, porque
`Nexus-Battle-Web` no es la fuente de verdad de las Issues y una referencia corta como `#265`
apuntaría a una Issue local inexistente o equivocada.
