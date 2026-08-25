# Verificación de RNF-07 — Evidencia responsive reproducible

Este documento consolida la evidencia reproducible de verificación de `RNF-07` sobre la versión
candidata de `Nexus-Battle-Web` descrita abajo, conforme al contrato definido en
[`docs/frontend/base-responsive.md`](./base-responsive.md).

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#267`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#195`
RNF: `RNF-07`

## Versión evaluada

| Campo                   | Valor                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Repositorio             | `Nexus-Battle-VI/Nexus-Battle-Web`                                                     |
| Rama de verificación    | `test/en-007-3-verificar-rnf-07-evidencia-responsive`                                  |
| Base evaluada           | `origin/develop`                                                                       |
| SHA evaluado            | `b4b1c9e8dffdb8cca6a245f203cc4bd4cc29188d`                                             |
| Commit del SHA evaluado | `docs(web): [EN-007.2] hacer operativo el contrato responsive en contribuciones (#10)` |
| Fecha de verificación   | 2026-08-24                                                                             |

Este documento fue producido evaluando ese SHA exacto; una re-verificación posterior debe registrar
el nuevo SHA evaluado en una entrada separada o en una nueva versión de este documento.

## Procedimiento reproducible

```bash
git fetch origin
git checkout origin/develop  # o el SHA evaluado exacto indicado arriba
npm ci
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. No requiere backend disponible para esta
verificación: los estados dependientes de servicio se evalúan tal como la aplicación los presenta
realmente (ver [Estados dependientes de backend](#estados-dependientes-de-backend)).

## Resolución utilizada y limitación de la herramienta

La resolución mínima obligatoria de referencia de `RNF-07` es `1360 × 768 px` de viewport CSS.

La verificación se ejecutó con la extensión de automatización de navegador (`claude-in-chrome`) sobre
un entorno con una pantalla virtual de tamaño fijo. Se solicitó explícitamente un tamaño de ventana de
`1360 × 768` mediante la herramienta de redimensionamiento disponible, y se midió el resultado real
con JavaScript en la propia página:

```js
;({ innerWidth: window.innerWidth, innerHeight: window.innerHeight })
// { innerWidth: 1280, innerHeight: 665 }
```

La herramienta reportó el redimensionamiento como exitoso, pero el viewport CSS medido realmente fue
`1280 × 665`, no `1360 × 768`. Se confirmó, además, que la pantalla del entorno está fija en
`1280 × 800` (`screen.width` / `screen.height`), con `1280 × 752` de área disponible
(`screen.availWidth` / `screen.availHeight`): el entorno de este agente no puede producir un viewport
CSS mayor a `1280` de ancho, independientemente del tamaño de ventana solicitado. Se documenta esto
honestamente en lugar de reportar una medición de `1360 × 768` no alcanzada realmente.

**Justificación de por qué la evidencia obtenida a `1280 × 665` sigue siendo válida para `RNF-07` en
esta versión concreta del código:**

- El repositorio no contiene ningún breakpoint CSS (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `@media` de
  ancho) en `src/` — confirmado por búsqueda de texto sobre el árbol de fuentes en esta misma
  verificación. El renderizado del layout es, por tanto, idéntico en todo el rango entre `1280px` y
  `1360px` de ancho: no existe ninguna regla que cambie el comportamiento en ese intervalo.
- El contenedor de contenido de `AppLayout` usa `max-w-5xl` (`1024px`), muy por debajo tanto de
  `1280px` como de `1360px`: en ambos casos el contenido queda centrado con margen sobrante, sin que
  el ancho adicional de `80px` entre `1280` y `1360` tenga ningún efecto observable.
- La altura medida (`665px`) es menor que la referencia (`768px`), lo que hace de esta verificación
  una prueba _más estricta_ en altura que la resolución de referencia, no más permisiva.

Por lo anterior, el resultado obtenido a `1280 × 665` se considera evidencia representativa y
suficiente de `RNF-07` a `1360 × 768` para el código de esta versión, sujeto a la limitación de
herramienta documentada arriba. Si en el futuro el repositorio introduce algún breakpoint o regla que
dependa del ancho exacto entre `1280` y `1360`, esta verificación debe repetirse en un entorno capaz de
alcanzar el viewport exacto de referencia.

## Inventario de interfaces evaluadas

Derivado de `src/routes/routes.tsx` en el SHA evaluado.

| Ruta                   | Tipo                  | Elemento renderizado                                              |
| ---------------------- | --------------------- | ----------------------------------------------------------------- |
| `/` (índice)           | IMPLEMENTED           | `CatalogPage` (misma interfaz que `/catalog`)                     |
| `/catalog`             | IMPLEMENTED           | `CatalogPage` — consume el servicio Catalog, filtra por categoría |
| `/inventory`           | AVAILABLE PLACEHOLDER | `PlayerInventoryPage` — marcador de posición declarado            |
| `/community`           | AVAILABLE PLACEHOLDER | `CommunityPage` — marcador de posición declarado                  |
| `/orders`              | AVAILABLE PLACEHOLDER | `CommercePage` — marcador de posición declarado                   |
| `/account`             | AVAILABLE PLACEHOLDER | `AccountPage` — marcador de posición declarado                    |
| `/notifications`       | AVAILABLE PLACEHOLDER | `NotificationsPage` — marcador de posición declarado              |
| `*` (ruta desconocida) | IMPLEMENTED           | `NotFoundPage` — página 404 funcional, no un placeholder          |

No existen otras rutas navegables en el SHA evaluado. Ninguna interfaz de una HU pendiente (subasta,
torneo, administración, e-commerce, etc.) existe todavía en el código, por lo que ninguna de ellas
aparece en este inventario ni puede recibir un veredicto.

## Matriz de evidencia

| Interfaz / ruta           | Tipo                  | Resolución                       | Resultado esperado                                                              | Resultado obtenido                                                                                                                                                                                                                              | Estado | Observaciones                                                                           |
| ------------------------- | --------------------- | -------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `/catalog` (`/`)          | IMPLEMENTED           | 1280×665 CSS px (ver limitación) | Contenido legible, filtro accesible, navegación operable, sin overflow          | Título, descripción, label y campo de filtro visibles y legibles; navegación en una fila con "Catalogo" resaltado como activo; estado mostrado: `Cargando...` (backend no disponible localmente, esperado); sin overflow horizontal ni vertical | PASS   | El estado `Cargando...` es el real de la aplicación sin backend; no se simuló contenido |
| `/inventory`              | AVAILABLE PLACEHOLDER | 1280×665 CSS px                  | Card legible declarando estado no implementado y servicio responsable           | Título "Inventario", descripción y texto de marcador visibles completos; nav resalta "Inventario"; sin overflow                                                                                                                                 | PASS   | Placeholder evaluado tal como existe hoy, sin inventar funcionalidad futura             |
| `/community`              | AVAILABLE PLACEHOLDER | 1280×665 CSS px                  | Card legible declarando estado no implementado y servicio responsable           | Título "Comunidad", descripción y texto de marcador visibles completos; nav resalta "Comunidad"; sin overflow                                                                                                                                   | PASS   | —                                                                                       |
| `/orders`                 | AVAILABLE PLACEHOLDER | 1280×665 CSS px                  | Card legible declarando estado no implementado y servicio responsable           | Título "Pedidos", descripción y texto de marcador visibles completos; nav resalta "Pedidos"; sin overflow                                                                                                                                       | PASS   | —                                                                                       |
| `/account`                | AVAILABLE PLACEHOLDER | 1280×665 CSS px                  | Card legible declarando estado no implementado y servicio responsable           | Título "Cuenta", descripción y texto de marcador visibles completos; nav resalta "Cuenta"; sin overflow                                                                                                                                         | PASS   | —                                                                                       |
| `/notifications`          | AVAILABLE PLACEHOLDER | 1280×665 CSS px                  | Card legible declarando estado no implementado y servicio responsable           | Título "Notificaciones" (etiqueta de navegación más larga), descripción y texto de marcador visibles completos sin truncarse ni envolver de forma problemática; nav resalta "Notificaciones"; sin overflow                                      | PASS   | Caso más exigente para el ancho de la navegación; sin problema                          |
| `*` (`/ruta-inexistente`) | IMPLEMENTED           | 1280×665 CSS px                  | Mensaje de página no encontrada, enlace de retorno operable, navegación visible | "Pagina no encontrada" y mensaje visibles; enlace "Volver al catalogo" visible y con `href="/catalog"`; navegación visible sin ningún destino resaltado (correcto: la ruta no coincide con `NAVIGATION`); sin overflow                          | PASS   | —                                                                                       |

No se registró ningún `FAIL` ni `NOT EVALUABLE`: las 8 rutas declaradas en el enrutador (7 interfaces
distintas, `/` y `/catalog` comparten la misma) fueron navegadas y evaluadas individualmente.

## Estados dependientes de backend

`/catalog` es la única interfaz que consume un servicio externo (`Catalog`). Durante esta verificación
no había backend disponible localmente, por lo que la aplicación permaneció honestamente en el estado
`Cargando...` (definido por `QueryState`) en lugar de mostrar datos. Ese estado es legible, no produce
overflow ni oculta la navegación o el filtro, por lo que no constituye un `FAIL` de `RNF-07`: la
ausencia de un backend externo no invalida la responsividad de la interfaz que sí se está renderizando.
Los estados `error`, `vacío` y `contenido` de `/catalog` no fueron observables en este entorno por la
misma razón y no se les asigna un resultado de `RNF-07` distinto al ya registrado para el estado
`cargando`, que es el único disponible para inspección visual reproducible en este entorno.

## Overflow y operabilidad — resumen transversal

- Ninguna de las 7 interfaces produjo overflow horizontal de página en el viewport medido.
- Ninguna interfaz recortó contenido de forma que impidiera leerlo o completar el flujo disponible.
- La navegación permaneció visible, identificable y operable en las 8 rutas, incluida la ruta
  desconocida.
- Ninguna acción disponible (el filtro de `/catalog`, el enlace de retorno de `NotFoundPage`)
  desapareció ni quedó inaccesible.
- Ningún comportamiento funcional cambió respecto al que ya tenían las interfaces antes de esta
  verificación: no se modificó código de aplicación.

## Suite técnica ejecutada

Ver [`VALIDATION RESULTS`](#validation-results-resumen) más abajo para el detalle completo; resumen:
`lint`, `format:check`, `typecheck`, `test:coverage` (57/57, cobertura ≥ 80 % en las cuatro métricas) y
`build` pasaron sin hallazgos sobre el SHA evaluado, sin cambios de código de aplicación.

### VALIDATION RESULTS (resumen)

| Comando                 | Resultado                                        |
| ----------------------- | ------------------------------------------------ |
| `npm ci`                | PASS                                             |
| `npm run lint`          | PASS                                             |
| `npm run format:check`  | PASS                                             |
| `npm run typecheck`     | PASS                                             |
| `npm run test:coverage` | PASS (57/57, cobertura ≥ 80 % en las 4 métricas) |
| `npm run build`         | PASS                                             |
| `git diff --check`      | PASS                                             |

## Resultado

`RNF-07`: **PASS** sobre el SHA `b4b1c9e8dffdb8cca6a245f203cc4bd4cc29188d`, sujeto a la limitación de
viewport documentada arriba (verificación efectiva a `1280 × 665` CSS px en lugar de `1360 × 768`,
justificada como representativa para este código concreto por ausencia total de breakpoints y por el
contenedor de contenido de `1024px`).

## Trazabilidad

- Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#267`
- Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#195`
- RNF: `RNF-07`
- Contrato aplicado: [`docs/frontend/base-responsive.md`](./base-responsive.md)

Se utiliza siempre el nombre completo del repositorio al referenciar estos números, porque
`Nexus-Battle-Web` no es la fuente de verdad de las Issues y una referencia corta como `#267`
apuntaría a una Issue local inexistente o equivocada.
