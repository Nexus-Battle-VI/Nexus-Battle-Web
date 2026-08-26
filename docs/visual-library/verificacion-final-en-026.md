# Verificación final de la biblioteca visual (EN-026.5)

Evidencia final, reproducible, de que la biblioteca visual construida por `EN-026.1`, `EN-026.2`,
`EN-026.3` y `EN-026.4` cubre la línea base aprobada, conserva trazabilidad, es reutilizable,
extensible, respeta licenciamiento, no contiene contenido inventado y mantiene la frontera con HU-37.
No duplica el contenido de `arquitectura-biblioteca-visual.md`, `heroes-3d.md` ni `productos-2d.md`:
los referencia y consolida evidencia final sobre ellos.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#272`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#263`
Base evaluada: `origin/develop` en `75fe9fe34381dc617c9e6014ca05c9507634c76d`

Esta Task es de **validación y evidencia**. No agrega funcionalidad visual nueva. El único cambio de
código es un test aditivo (ver [Hallazgo y corrección](#hallazgo-y-corrección-únicos)); ningún archivo
existente fue modificado.

## Commits recientes revisados

```
75fe9fe feat(web): [HU-01] implementar interfaz de registro de jugador (#18)
90b2e0b feat(web): [EN-026.4] integrar recursos visuales 2D de productos (#16)
21ac67d feat(web): [EN-026.3] integrar ocho heroes 3D reutilizables con Three.js (#15)
fd2c2c3 feat(web): [EN-026.2] definir arquitectura reutilizable de biblioteca visual (#14)
7ddc375 docs(web): [EN-026.1] versionar inventario visual oficial de heroes y productos (#13)
```

`75fe9fe` (`HU-01`, de otro equipo) agrega `src/features/account/registration/**`, `public/assets/logo.png`
y modifica `src/lib/http.ts` y `src/routes/routes.tsx` (para anteponer `RegistrationPage` fuera del
layout y anidar `AppLayout`, incluido `...devRoutes`, bajo él). No toca ningún archivo de
`src/shared/visual-library/**` ni de `docs/visual-library/**`. Se preservó sin cambios; ver
[Cambios de otros equipos](#cambios-de-otros-equipos-detectados).

## Cambios de otros equipos detectados

- `src/features/account/registration/**` (HU-01): no se leyó su lógica interna más allá de confirmar
  que no importa `src/shared/visual-library/**`; no se modificó.
- `src/lib/http.ts`: modificado por HU-01 para el flujo de registro; no relacionado con la biblioteca
  visual; no se modificó.
- `src/routes/routes.tsx`: HU-01 reestructuró el árbol de rutas (login fuera de `AppLayout`,
  `devRoutes` ahora anidado bajo `AppLayout`). Se verificó que `src/routes/dev-routes.tsx` y las rutas
  `__dev/visual-library/heroes` y `__dev/visual-library/products` siguen resolviendo (ver
  [Preview humana](#preview-humana) y la suite completa en verde). No se modificó `routes.tsx`.
- `public/assets/logo.png`: nuevo asset de HU-01, ajeno a `EN-026`; no evaluado por no pertenecer al
  alcance de esta Task.

Confirmación: **`git diff origin/develop` (SHA `75fe9fe...`) del árbol de trabajo final de esta Task es
vacío salvo un único archivo nuevo de test** (ver [Estado Git final](#estado-git-final)). Ningún archivo
de otro equipo fue tocado.

## Conteo 8/8 héroes

`HERO_IDS` (`src/shared/visual-library/heroes/hero-ids.ts`): `guerrero-tanque`, `guerrero-armas`,
`mago-fuego`, `mago-hielo`, `picaro-veneno`, `picaro-machete`, `chaman`, `medico` — exactamente 8,
verificado por `hero-ids.test.ts` y `hero-definitions.test.ts`. Coincide con la sección `## Héroes` de
`docs/visual-library/inventario-heroes-productos.md`. No se creó un noveno héroe.

## Conteo 72/72 productos y desglose 16/16/8/24/8

`PRODUCT_CATALOG` (`src/shared/visual-library/products/product-catalog.ts`), verificado por
`product-catalog.test.ts`:

| Familia         | Contractual (`inventario-heroes-productos.md`) | Implementado |
| --------------- | ------------------------------------------------ | ------------ |
| Armas           | 16                                               | 16           |
| Armaduras       | 16                                               | 16           |
| Ítems          | 8                                                | 8            |
| Acciones        | 24                                               | 24           |
| Épicas         | 8                                                | 8            |
| **Total** | **72**                                     | **72** |

Sin producto número 73, sin ids inventados ni omitidos (`product-catalog.test.ts` compara longitud
exacta y ausencia de `PRODUCT_CATALOG[72]`).

## Verificación de ids

- Formato `{heroe-slug}--{categoria}--{nombre-slug}` para productos, `{heroe-slug}` para héroes,
  exactamente como define `inventario-heroes-productos.md`. Cruzado manualmente en esta Task para una
  muestra de cada familia (p. ej. `guerrero-tanque--arma--espada-de-una-mano`,
  `guerrero-armas--armadura--puno-lucido`) contra el documento fuente: coincide byte a byte.
- Sin duplicados: `product-catalog.test.ts` verifica que `PRODUCT_CATALOG.length === new Set(ids).size`.
- El nombre físico de archivo **no** es la identidad lógica: no existe ningún archivo por producto (son
  72 filas de datos, no 72 archivos); la identidad es el campo `id` del catálogo, consumido siempre por
  valor (`resourceId`), nunca por convención de ruta.

## Verificación de asociaciones

`heroId` de cada producto en `PRODUCT_CATALOG` pertenece a `HERO_IDS` (verificado en
`product-catalog.test.ts`). `ProductVisualSpec.primaryColor`/`accentColor` se derivan de
`HERO_VISUAL_SPECS_BY_ID.get(heroId)` (verificado en `product-visual-definitions.test.ts`),
demostrando la asociación héroe→producto también a nivel visual, sin duplicar los colores del héroe en
una segunda fuente.

## Verificación del registry/resolver

Único mecanismo central: `VisualResourceRegistry` (`registry.ts`) + `resolveVisualResource`
(`resolve-visual-resource.ts`), ambos de `EN-026.2`, sin modificar. `registerHeroVisualResources`
(`heroes/register-hero-visual-resources.ts`) y `registerProductVisualResources`
(`products/register-product-visual-resources.ts`) son los únicos dos puntos que llaman a
`registry.register(...)`; ninguno de los dos crea una instancia de registro propia — ambos reciben el
registro por parámetro y, en producción, ambos se invocan sobre el mismo singleton
`visualResourceRegistry` como efecto de módulo (`Hero3D.tsx:15`, `ProductVisual2D.tsx:15`). No existe un
segundo registro paralelo en ningún otro archivo del repositorio (`grep` de `createVisualResourceRegistry`
solo aparece en `registry.ts` y en archivos de test que crean instancias aisladas para no compartir
estado mutable entre pruebas).

### Nueva evidencia de convivencia real (`visual-library-coexistence.test.tsx`)

Los tests existentes de `EN-026.3`/`EN-026.4` verificaban cada registro por separado, siempre sobre una
instancia de registro **aislada** (`createVisualResourceRegistry()`), nunca sobre el `visualResourceRegistry`
real de la aplicación con ambos dominios registrados a la vez. Esto dejaba sin cubrir explícitamente el
escenario real: un consumidor que en producción importe tanto `Hero3D` como `ProductVisual2D` obtiene el
mismo registro compartido, ya poblado por los dos.

Se agregó `src/shared/visual-library/visual-library-coexistence.test.tsx` (único archivo nuevo de esta
Task) para cubrir ese hueco: monta `<Hero3D heroId="medico" />` y
`<ProductVisual2D resourceId="medico--epica--reanimador-3000" category="epic" />`, lo que dispara ambos
efectos de módulo sobre el `visualResourceRegistry` real, y luego verifica que los 8 héroes y los 72
productos resuelven `READY` simultáneamente sin sobrescribirse entre sí, y que ningún `id` de héroe
colisiona con ningún `id` de producto. No crea un registro nuevo, no duplica los tests existentes por
dominio, y no introduce lógica funcional.

## Reutilización transversal (CA-04)

- `register-product-visual-resources.test.ts` y `ProductVisual2D.test.tsx` ya prueban que
  `resolveVisualResource` devuelve el mismo objeto `VisualResourceDescriptor` para el mismo `id`
  resuelto desde dos "consumidores" distintos, y que `<ProductVisual2D>` puede montarse dos veces para
  el mismo `resourceId` sin lanzar ni duplicar el recurso subyacente.
- La nueva prueba de convivencia extiende esa evidencia a través del límite héroes/productos: el mismo
  registro sirve ambos dominios sin que uno necesite conocer al otro.
- Ninguna HU consumidora (`HU-07/27/28/33/37/57`) fue implementada; la reutilización se demuestra
  mediante pruebas y el harness técnico dev-only, no mediante una pantalla funcional.

## Extensibilidad (CA-05)

- **Héroe futuro**: agregar un noveno héroe aprobado requeriría únicamente una fila nueva en
  `HERO_IDS`/`HERO_VISUAL_SPECS` y no un componente nuevo — `Hero3D` es la única implementación 3D para
  los 8 héroes actuales (`buildHeroDetail`, ver `heroes-3d.md`). No se creó ningún héroe nuevo en esta
  Task: la extensibilidad se verifica por diseño (arquitectura de dispatcher único), no fabricando
  contenido inventado.
- **Producto futuro**: documentado con un ejemplo reproducible en
  `docs/visual-library/productos-2d.md#cómo-agregar-un-producto-futuro-oficialmente-aprobado` — una fila
  nueva en `PRODUCT_CATALOG` basta; `render-product-visual.tsx`, `ProductVisual2D` y el registro no
  cambian.
- En ambos casos la extensión depende primero de que el contenido exista aprobado en
  `docs/visual-library/inventario-heroes-productos.md`; ningún código de esta Task permite registrar un
  producto o héroe que no figure ahí.

## Three.js

- Único punto de integración real: `mount-hero-view.ts`, cargado mediante `import()` dinámico desde
  `Hero3D.tsx` solo cuando hay un recurso `READY` que mostrar (confirmado leyendo `Hero3D.tsx:73`).
- Cleanup verificado: `mount-hero-view.ts` expone `dispose()`, que libera `geometry`, cada `material` (o
  cada elemento si es un arreglo) y el `renderer` de Three.js; `mount-hero-view.test.ts` verifica que
  `dispose()` existe y es invocable. `Hero3D.tsx` lo invoca en el cleanup de su `useEffect` (línea 92).
- `src/shared/visual-library/products/**` no importa `three` en ningún archivo (confirmado por
  inspección de imports); el chunk de Three.js (`mount-hero-view-*.js`) permanece con el mismo tamaño
  antes y después de `EN-026.4` según `productos-2d.md`, y no cambió en esta Task (no se tocó ningún
  archivo de producción).
- Sin GPU real en el entorno de test (`jsdom`), `Hero3D.test.tsx` verifica explícitamente el camino de
  fallback (WebGL no disponible → sin excepción, UI estable) como caso de prueba intencional, no como
  limitación oculta.

## Performance/bundle

No se modificó ningún archivo de producción en esta Task (el único archivo nuevo es un test, excluido
del bundle). Medición de referencia con `npm run build` sobre el estado actual de `develop`
(`75fe9fe...`, que ya incluye `HU-01`):

| Chunk                               | Tamaño                    | Nota                                                           |
| ----------------------------------- | -------------------------- | -------------------------------------------------------------- |
| `index-*.js` (bundle inicial)     | 345.53 kB / gzip 108.52 kB | Incluye ahora`HU-01` (registro); no atribuible a `EN-026`. |
| `mount-hero-view-*.js` (Three.js) | 529.81 kB / gzip 133.29 kB | Sin cambios respecto a`EN-026.4` (`productos-2d.md`).      |
| `ProductsDevPreview-*.js`         | 12.11 kB / gzip 3.54 kB    | Sin cambios respecto a`EN-026.4`, dev-only, lazy.            |
| `HeroesDevPreview-*.js`           | 0.78 kB / gzip 0.48 kB     | Dev-only, lazy.                                                |
| `Hero3D-*.js`                     | 4.01 kB / gzip 1.72 kB     | Cargado junto al harness dev-only, no en el bundle inicial.    |

El crecimiento del bundle inicial desde `EN-026.4` (330.76 kB → 345.53 kB) proviene íntegramente de
`HU-01` (pantalla de registro fuera del alcance de `EN-026`), no de esta Task ni de la biblioteca
visual. No se optimizó nada especulativamente: no había ninguna regresión atribuible a `EN-026` que
corregir.

## Licenciamiento y `EN-021`

Confirmado por relectura de `docs/assets/README.md`, `docs/assets/inventario-activos.md`,
`heroes-3d.md` y `productos-2d.md`: los 8 héroes (Three.js procedural) y los 72 productos (SVG
procedural) son **completamente internos y procedurales**, sin ningún asset externo (imagen, modelo,
fuente, icono) descargado o incorporado. Ninguno de los dos requiere trazabilidad de contenido generado
por IA como "asset" per se: el código fuente (geometría/color programáticos) fue producido por un
agente de IA bajo supervisión humana como cualquier otro código del repositorio, no como un archivo de
asset licenciado de terceros. `docs/assets/inventario-activos.md` no necesitaba, y no recibió, ninguna
entrada nueva en `EN-026.3` ni `EN-026.4`, y tampoco en esta Task (no se incorporó ningún asset externo
nuevo). `three` es una dependencia de software (motor de render), no un asset visual, y no requiere
entrada en el inventario de activos.

## Recursos propios/procedurales

Confirmado: 0 archivos binarios de imagen/modelo agregados por `EN-026.3`/`EN-026.4`/`EN-026.5`
(`public/` solo cambió por `HU-01`, ajeno a `EN-026`, con `logo.png`). Los 8 héroes son geometría y
materiales de Three.js generados en código; los 72 productos son SVG declarativo en JSX.

## Frontera con HU-37 (CA-07)

`docs/visual-library/arquitectura-biblioteca-visual.md#frontera-con-hu-37` ya documenta explícitamente
que `HU-37 — Diseñador visual de productos` sigue siendo responsable, funcionalmente, de crear/modificar
productos, y que la biblioteca visual (`EN-026`) solo provee representación, registro, resolución y
consumo reutilizable — nunca un editor, personalización funcional ni persistencia de diseños. Se
releyó esa sección en esta Task y se confirma vigente sin cambios: ningún archivo de `EN-026.5` implementa
editor, workflow ni persistencia de diseño visual. `productos-2d.md` refuerza la misma frontera en su
sección "Qué NO deben hacer futuros Developers/agentes de IA".

## Documentación de consumo

- `docs/visual-library/arquitectura-biblioteca-visual.md` (EN-026.2): contratos, resolución, fallback,
  frontera con HU-37.
- `docs/visual-library/heroes-3d.md` (EN-026.3): arquitectura 3D, carga perezosa de Three.js, preview.
- `docs/visual-library/productos-2d.md` (EN-026.4): arquitectura 2D, familias, cómo agregar un producto
  futuro, licenciamiento.
- Este documento (EN-026.5): evidencia final consolidada y matriz CA-01→CA-08.

Ningún documento fue modificado; este archivo es aditivo.

## Preview humana

Ambos harnesses dev-only siguen accesibles tras la reestructuración de rutas de `HU-01`
(`AppLayout` ahora envuelve `devRoutes`, ver [Cambios de otros equipos](#cambios-de-otros-equipos-detectados)),
verificado por `src/routes/dev-routes.test.ts` (en verde, ver [resultados](#26-testcoverage)):

```text
npm run dev
http://localhost:5173/__dev/visual-library/heroes    (8/8, sin guardia de sesión en el estado evaluado — ver nota abajo)
http://localhost:5173/__dev/visual-library/products  (72/72, sin guardia de sesión en el estado evaluado — ver nota abajo)
```

**Nota importante detectada en esta auditoría**: `HU-01` anidó `devRoutes` bajo `AppLayout`, que ahora es
un hijo de la ruta raíz reservada para `RegistrationPage`. Se inspeccionó `src/app/AppLayout.tsx`: solo
renderiza cabecera, navegación y `<Outlet />`, sin ningún guard de sesión (`SessionControl` es un
control de UI, no una redirección condicionada a autenticación) y `routes.tsx` no envuelve `AppLayout`
en ningún componente de protección de ruta. Por tanto las rutas dev (`__dev/visual-library/heroes` y
`__dev/visual-library/products`) siguen siendo alcanzables sin autenticación en este estado del
repositorio, igual que el resto de `AppLayout` (catálogo, inventario, etc.). Esto es responsabilidad de
la reestructuración de rutas de `HU-01`/`AppLayout` (fuera del alcance de `EN-026`), no algo que esta
Task deba corregir. Se documenta como observación, no como defecto atribuible a `EN-026` — ver
[Incidencias pendientes](#incidencias-pendientes-no-bloqueantes). No se modificó `routes.tsx` para no
tocar código ajeno sin necesidad directa de `EN-026.5`.

## Matriz CA-01 → CA-08

| Criterio                                        | Evidencia                                                                                                                      | Archivos/pruebas                                                                                                                            | Resultado | Observaciones                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| CA-01 — Ocho héroes base representados        | 8/8 ids únicos, cada uno resuelve`READY`, representación 3D real con Three.js, fallback y cleanup verificados              | `hero-ids.ts`, `hero-ids.test.ts`, `Hero3D.tsx`, `Hero3D.test.tsx`, `mount-hero-view.test.ts`                                     | PASS      | Ninguno depende de equipamiento real ni introduce reglas funcionales.                                         |
| CA-02 — Correspondencia con el producto        | `heroId` de cada producto pertenece a `HERO_IDS`; colores derivados de `HERO_VISUAL_SPECS_BY_ID`                         | `product-catalog.test.ts`, `product-visual-definitions.test.ts`                                                                         | PASS      | Verificado también a nivel visual (color), no solo de dato.                                                  |
| CA-03 — Productos aprobados con recurso visual | 72/72 productos registrados`READY` con recurso procedural, desglose 16/16/8/24/8 exacto                                      | `product-catalog.test.ts`, `register-product-visual-resources.test.ts`                                                                  | PASS      | Sin producto 73, sin duplicados, sin normalización de nombres de origen.                                     |
| CA-04 — Reutilización transversal             | Mismo`VisualResourceDescriptor` desde dos consumidores; héroes y productos conviven en el mismo registro sin colisión      | `ProductVisual2D.test.tsx`, `register-product-visual-resources.test.ts`, `visual-library-coexistence.test.tsx`                        | PASS      | Nueva prueba de convivencia agregada en esta Task (único cambio de código).                                 |
| CA-05 — Extensibilidad                         | Un héroe/producto futuro aprobado se incorpora sin arquitectura ni renderer exclusivo (dispatcher único por familia/dominio) | `productos-2d.md#cómo-agregar-un-producto-futuro-oficialmente-aprobado`, `heroes-3d.md`, `render-product-visual.tsx`, `Hero3D.tsx` | PASS      | No se inventó contenido para demostrarlo; depende de aprobación previa en el inventario.                    |
| CA-06 — Licenciamiento                         | 100% procedural/interno, sin assets externos;`docs/assets/inventario-activos.md` correctamente sin entrada nueva             | `docs/assets/README.md`, `docs/assets/inventario-activos.md`, `heroes-3d.md`, `productos-2d.md`                                     | PASS      | `three` es dependencia de software, no asset visual.                                                        |
| CA-07 — Consistencia con HU-37                 | Frontera explícita documentada:`EN-026` no implementa editor, personalización ni persistencia de diseño                   | `arquitectura-biblioteca-visual.md#frontera-con-hu-37`, `productos-2d.md`                                                               | PASS      | Releída y confirmada vigente en esta Task.                                                                   |
| CA-08 — No invención de contenido             | Nombres/ids/categorías/heroId transcritos exactamente desde`inventario-heroes-productos.md`, incluidas erratas de origen    | `product-catalog.ts`, `product-catalog.test.ts`, `hero-ids.ts`                                                                        | PASS      | Ninguna forma literal inventada a partir de nombres ambiguos (ver`productos-2d.md#no-inventar-semántica`). |

## Hallazgo y corrección únicos

**Hallazgo**: los tests de registro existentes (`EN-026.3`/`EN-026.4`) verifican cada dominio
(héroes/productos) de forma aislada, sobre un `VisualResourceRegistry` creado ad hoc para la prueba, no
sobre el `visualResourceRegistry` real y compartido de la aplicación con ambos dominios poblados a la
vez. Esto es un hueco de verificación real y directamente atribuible al alcance de `EN-026.5`
("trazabilidad... no existen registros paralelos contradictorios"), no una mejora especulativa.

**Corrección**: se agregó `src/shared/visual-library/visual-library-coexistence.test.tsx` (2 tests, 15
líneas de aserciones). Es pequeño, no modifica ningún archivo de producción existente, no amplía el
alcance funcional, y queda cubierto por su propia prueba (que además ya pasó como parte de la suite
completa, ver [resultados](#26-testcoverage)).

## Fuera de alcance confirmado

No se implementó ninguna pantalla ni lógica de `HU-07`, `HU-27`, `HU-28`, `HU-33`, `HU-37` ni `HU-57`. No
se tocó `auth`, `login`, `src/lib/http.ts`, configuración de despliegue, ni ninguna `feature` funcional.
No se creó un noveno héroe ni un producto número 73. No se modificó
`docs/visual-library/inventario-heroes-productos.md`, `docs/assets/inventario-activos.md`,
`docs/assets/README.md`, `docs/visual-library/arquitectura-biblioteca-visual.md`,
`docs/visual-library/heroes-3d.md` ni `docs/visual-library/productos-2d.md`.

## Incidencias pendientes (no bloqueantes)

- La revisión visual humana real (forma/color/legibilidad en navegador) de los 8 héroes y 72 productos
  sigue pendiente, tal como ya lo documentaba `productos-2d.md`; este entorno no dispone de navegador
  con inspección visual.
- La observación de [Preview humana](#preview-humana) sobre `devRoutes` alcanzable sin guardia de sesión
  tras la reestructuración de `HU-01` no es un defecto de `EN-026`: se deja registrada para que el equipo
  responsable de `AppLayout`/autenticación la evalúe: es su árbol de rutas, no el de la biblioteca
  visual.

## Estado Git final

```
 ?? src/shared/visual-library/visual-library-coexistence.test.tsx
 ?? docs/visual-library/verificacion-final-en-026.md
```

Ningún archivo existente fue modificado. `git diff origin/develop --stat` sobre archivos existentes: vacío.
No se ejecutó `git add`, `git commit`, `git push` ni se abrió Pull Request.

## Veredicto técnico

**IMPLEMENTATION: PASS — READY FOR HUMAN REVIEW**
