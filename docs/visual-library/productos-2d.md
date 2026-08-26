# Productos 2D (EN-026.4)

Documentación específica de la producción e integración de los 72 recursos visuales 2D de
equipamiento y productos (armas, armaduras, ítems, acciones especiales y habilidades épicas).
Complementa, sin repetir, `docs/visual-library/arquitectura-biblioteca-visual.md` (EN-026.2) y
`docs/visual-library/heroes-3d.md` (EN-026.3): este documento explica las decisiones propias de esta
Task; el diseño general de la biblioteca visual (identificadores, categorías, resolución, fallback)
sigue documentado en `arquitectura-biblioteca-visual.md`, y no se modificó.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#271`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#263`
Depende de: `Refs Nexus-Battle-VI/Nexus-Battle-Management#268` (`EN-026.1`), `#269` (`EN-026.2`) y `#270`
(`EN-026.3`, para reutilización cromática)
Base evaluada: `origin/develop` en `21ac67d6035c3d0fb7c1c2c3e251915596ed06cc`

## Alcance exacto: 72/72

Produce representación 2D **exclusivamente** para los 72 productos oficiales aprobados
(`docs/visual-library/inventario-heroes-productos.md`): 16 armas, 16 armaduras, 8 ítems, 24 acciones
especiales y 8 habilidades épicas. No produce modelos 3D adicionales, no equipa visualmente ningún
producto sobre el modelo del héroe (`Hero3D`, EN-026.3), no implementa HU-37, HU-07, HU-27, HU-28 ni
E-commerce, y no introduce lógica funcional (combate, inventario, equipamiento, precios, rareza, drop
rates). Ver `docs/visual-library/inventario-heroes-productos.md#conteos-contractuales` para el origen
de los conteos.

## Relación con `EN-026.1`

`docs/visual-library/inventario-heroes-productos.md` es la única fuente de verdad del catálogo. Esta
Task no lo modifica: `src/shared/visual-library/products/product-catalog.ts` transcribe una sola vez
los 72 registros (id, nombre oficial, categoría, `heroId`, y `slot` para armaduras), conservando
denominaciones que podrían parecer erratas de origen (`Machete vendito`, `Cierra sangrienta`,
`Frio concentrado`, `Té changua`) sin normalizarlas.

## Relación con `EN-026.2`

Esta Task reutiliza sin modificar `VisualResourceId`, `VisualCategory`, `VisualResourceDescriptor`,
`VisualResourceRegistry`, `resolveVisualResource` y el mismo fallback seguro definidos por `EN-026.2`.
No se creó un segundo registro: `registerProductVisualResources` puebla el mismo
`visualResourceRegistry` singleton que ya usa `EN-026.3`. `VisualResourceReference` ya soportaba
`{ kind: 'image', source: 'procedural' }` desde su extensión en `EN-026.3`, así que **no fue necesaria
ninguna extensión de contrato**: los 72 productos se registran con ese mismo caso ya existente,
únicamente cambiando `kind` a `'image'` (en vez de `'model3d'`, usado por los héroes).

## Convivencia con `EN-026.3`

Los héroes 3D y los productos 2D son subdominios hermanos dentro de
`src/shared/visual-library/`, ambos poblando el mismo registro pero sin acoplarse entre sí:

- `src/shared/visual-library/products/**` no importa `three` ni ningún módulo de
  `src/shared/visual-library/heroes/` que dependa de Three.js
  (`create-hero-model.ts`, `create-hero-scene.ts`, `mount-hero-view.ts`).
- Únicamente importa, desde el barril público `src/shared/visual-library/heroes/index.ts`, el tipo
  `HeroId` y los datos puros `HERO_VISUAL_SPECS_BY_ID` (`bodyColor`/`accentColor`), para mantener
  coherencia cromática entre un héroe y sus productos. Ese barril no reexporta ningún módulo de
  Three.js (ver `docs/visual-library/heroes-3d.md`, "Estrategia de carga"), así que esta importación no
  arrastra Three.js al grafo de `products/**`.
- Ningún producto se añade físicamente al modelo `Hero3D`: `HeroesDevPreview` y `ProductsDevPreview`
  son harnesses independientes, en rutas dev-only independientes.

## Ubicación de la biblioteca de productos

```text
src/shared/visual-library/products/
  product-catalog.ts                    Los 72 registros oficiales (unica lista manual).
  product-catalog.test.ts
  product-visual-definitions.ts         ProductVisualSpec: deriva color/seed desde el catalogo.
  product-visual-definitions.test.ts
  render-product-visual.tsx             Unico dispatcher: familia -> geometria SVG.
  register-product-visual-resources.ts  Registra los 72 productos como READY (recurso procedural).
  register-product-visual-resources.test.ts
  ProductVisual2D.tsx                   Componente reutilizable <ProductVisual2D resourceId="..." category="..." />.
  ProductVisual2D.test.tsx
  ProductsDevPreview.tsx                Harness de verificacion (dev-only, ver "Preview humana").
  index.ts                              Punto unico de consumo publico.
```

Se ubica dentro de `src/shared/visual-library/` (no en una carpeta nueva de `src/`), como subdominio
hermano de `heroes/`, por el mismo motivo que `EN-026.3` documentó: extiende directamente la
biblioteca visual de `EN-026.2` sin modificarla.

## Arquitectura de renderer

Fábrica de datos + dispatcher único — no existe `EspadaDeUnaMano.tsx`, `EscudoDeDragon.tsx`, ni un
componente por familia:

```text
PRODUCT_CATALOG (product-catalog.ts, 72 filas oficiales)
        ↓
buildProductVisualSpec(entry)  →  ProductVisualSpec   (product-visual-definitions.ts)
        ↓
renderProductGlyph(spec)  →  SVG (5 ramas, una por familia)   (render-product-visual.tsx)
        ↓
<ProductVisual2D resourceId="..." category="..." />  (ProductVisual2D.tsx, resuelve via EN-026.2)
```

Agregar un producto futuro oficialmente aprobado (cuando exista como fila nueva en
`docs/visual-library/inventario-heroes-productos.md`) requiere únicamente una entrada nueva en
`product-catalog.ts`; `render-product-visual.tsx`, `ProductVisual2D` y el registro no cambian —
ver [Cómo agregar un producto futuro](#cómo-agregar-un-producto-futuro-oficialmente-aprobado).

## `ProductVisualSpec`

```ts
interface ProductVisualSpec {
  readonly id: string
  readonly displayName: string
  readonly category: ProductCategory // 'weapon' | 'armor' | 'item' | 'action' | 'epic'
  readonly heroId: HeroId
  readonly primaryColor: string // bodyColor del heroe asociado (EN-026.3)
  readonly accentColor: string // accentColor del heroe asociado (EN-026.3)
  readonly seed: number // variacion decorativa deterministica, ver mas abajo
}
```

No contiene ningún campo de reglas de juego (daño, vida, rareza, precio, cooldown, probabilidad):
verificado por `product-visual-definitions.test.ts`, que compara explícitamente el conjunto de claves
del objeto.

## Cómo se registra cada producto

`registerProductVisualResources(registry)` recorre `PRODUCT_CATALOG` y llama
`registry.register(...)` con `status: 'READY'` y
`resource: { kind: 'image', source: 'procedural' }` para cada uno de los 72 productos. Es idempotente
y no depende de ningún renderer. Se invoca como efecto de módulo desde `ProductVisual2D.tsx` la primera
vez que algo importa ese componente (directa o indirectamente vía `./index`), igual que
`registerHeroVisualResources` en `Hero3D.tsx`.

## Cómo consume un Developer un recurso

```tsx
import { ProductVisual2D } from '@/shared/visual-library/products'

;<ProductVisual2D resourceId="guerrero-tanque--arma--espada-de-una-mano" category="weapon" />
```

`resourceId` y `category` son los mismos que ya identifican ese producto en
`docs/visual-library/inventario-heroes-productos.md` y en `VisualResourceDescriptor` (EN-026.2). El
componente resuelve internamente con `resolveVisualResource`; ningún consumidor construye una ruta de
asset a mano.

## Estrategia SVG/procedural

Los 72 productos se dibujan con SVG vectorial declarativo (JSX), sin GLTF, PNG, ni ningún archivo
binario. Todas las formas comparten `viewBox="0 0 64 64"` (dimensiones relativas), por lo que escalan
sin pérdida de nitidez tanto en una tarjeta pequeña como en una vista ampliada. `render-product-visual.tsx`
es el único módulo que dibuja geometría: 5 funciones puras (una por familia), sin estado ni efectos.

## Familias soportadas

`ProductCategory` = `'weapon' | 'armor' | 'item' | 'action' | 'epic'`, en correspondencia 1 a 1 con
`VisualCategory` de EN-026.2 (excluyendo `'hero'`, que no aplica a productos).

| Familia  | Forma base                                                                                                                         | Color primario          | Color de acento                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------- |
| `weapon` | Hoja diagonal + empuñadura                                                                                                         | `bodyColor` del héroe   | `accentColor` del héroe                |
| `armor`  | Silueta de placa/escudo con panel interior                                                                                         | `accentColor` del héroe | `bodyColor` del héroe (panel interior) |
| `item`   | Token compacto (cuadrado redondeado + punto central)                                                                               | `accentColor` del héroe | `bodyColor` del héroe (punto)          |
| `action` | Ráfaga radial (núcleo + 5 trazos)                                                                                                  | `accentColor` del héroe | —                                      |
| `epic`   | La misma ráfaga de `action`, con un marco/anillo punteado exterior en `primaryColor` (jerarquía visual mayor, sigue siendo ligera) | `accentColor` del héroe | `primaryColor` del héroe (marco)       |

Cada familia es reconocible por su forma, independientemente del color (ver
[Accesibilidad](#accesibilidad)). Dentro de una familia, cada producto tiene una rotación decorativa
distinta (`spec.seed`) que lo diferencia visualmente de los demás miembros de su misma familia, sin
implicar ninguna diferencia funcional.

## No inventar semántica

Ningún nombre oficial (`Raíz china`, `Yerbabuena`, `Piedra de afilar`, `Benditas`, etc.) se interpretó
para producir una forma literal específica: hacerlo para 72 productos heterogéneos, muchos con nombres
que no permiten una representación evidente y seria (p. ej. `Toma y lleva`, `Frio concentrado`, `Té
changua`), habría exigido inventar lore, función o forma no declarada por la fuente. En su lugar, cada
producto se representa mediante:

1. la forma de su familia (`weapon`/`armor`/`item`/`action`/`epic`), que sí comunica de forma genérica y
   segura "esto es un arma"/"esto es una armadura"/etc.;
2. el color de identidad de su héroe asociado (coherencia cromática con `EN-026.3`);
3. una variación geométrica puramente decorativa y determinista (`spec.seed`, derivado por hash del
   `id`), sin significado funcional.

Esta regla y su justificación quedan documentadas aquí explícitamente, tal como exige la Task: la
variación decorativa **no** implica rareza, poder, calidad ni ninguna otra regla de juego.

## Fallback

Reutiliza exactamente el mismo mecanismo de `EN-026.2` (`resolveVisualResource` + `isFallback`).
`ProductVisual2D` nunca lanza: un `resourceId` desconocido, no registrado, o registrado bajo otra
`category`, muestra un mensaje de texto simple dentro del mismo contenedor `role="img"`, sin `<svg>`,
conservando el layout (`aspect-square`). No se implementó ningún mecanismo de fallback paralelo.

## Reutilización

`resolveVisualResource(registry, id, category)` devuelve el mismo objeto `VisualResourceDescriptor`
sin importar cuántas veces o desde cuántos consumidores distintos se resuelva el mismo `id`
(`register-product-visual-resources.test.ts`, `ProductVisual2D.test.tsx`). Agregar un producto futuro
no exige un nuevo renderer: ver
[Cómo agregar un producto futuro](#cómo-agregar-un-producto-futuro-oficialmente-aprobado).

## Accesibilidad

- El contenedor de `ProductVisual2D` expone `role="img"` con `aria-label={displayName}` (el nombre
  oficial del producto); el `<svg>` interno es `aria-hidden="true"` para no duplicar el nombre
  accesible ni exponer contenido decorativo redundante a lectores de pantalla.
- Ninguna familia se distingue únicamente por color: cada una tiene una **forma** distinta (hoja,
  placa, token, ráfaga, ráfaga enmarcada), verificable incluso en escala de grises.
- El nombre visible (`<p>`) siempre acompaña al recurso visual, igual que en `Hero3D`.
- Los tests consultan por `role`/`name` accesibles (`getByRole('img', { name })`), nunca por clases CSS.

## Preview humana

Ruta de desarrollo, exclusivamente de verificación técnica, **no una pantalla del producto**:

```text
npm run dev
http://localhost:5173/__dev/visual-library/products
```

Solo existe cuando `import.meta.env.DEV` es verdadero (`src/routes/dev-routes.tsx`, misma condición que
el harness de héroes): no aparece en `NAVIGATION` ni en una compilación de producción. Organiza los 72
productos en 5 secciones (ARMAS 16/16, ARMADURAS 16/16, ÍTEMS 8/8, ACCIONES 24/24, ÉPICAS 8/8), cada
tarjeta muestra el recurso visual, el nombre oficial y, en modo técnico, el `id` estable. Es responsive
(`grid-cols-2` en móvil hasta `grid-cols-6` en escritorio).

Verificación automatizada realizada en este entorno (`src/routes/dev-routes.test.ts`): los 72 productos
se resuelven `READY`, las 5 secciones muestran el conteo contractual correcto, y se verificaron por
nombre accesible productos representativos de ambos extremos del catálogo. Este entorno de ejecución no
dispone de navegador con inspección visual real; la revisión de forma/color/legibilidad efectiva queda
para revisión humana en la URL indicada.

## Performance

- `src/shared/visual-library/products/index.ts` no reexporta `render-product-visual.tsx` (detalle
  interno de `ProductVisual2D`) ni `ProductsDevPreview.tsx` (dev-only).
- `ProductsDevPreview` se carga mediante `import()` dinámico desde `src/routes/ProductsDevPreviewLazy.tsx`
  (mismo patrón que `HeroesDevPreviewLazy.tsx`), y su ruta solo se agrega al árbol quirúrgicamente
  cuando `import.meta.env.DEV` es verdadero.
- Ningún módulo de `products/**` importa `three`.
- No se instaló ninguna librería de iconos ni de renderizado adicional: el SVG se genera con JSX nativo
  de React.

### Bundle antes/después

Medido con `npm run build` antes y después de esta Task:

| Chunk                             | Antes (EN-026.3, iteración final) | Después (EN-026.4)         | Nota                                                                                                                                                                                            |
| --------------------------------- | --------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index-*.js` (bundle inicial)     | 330.42 kB / gzip 104.11 kB        | 330.76 kB / gzip 104.26 kB | Crecimiento de 0.34 kB: solo el nuevo `path` de ruta dev-only agregado a `dev-routes.tsx`; `ProductVisual2D`/`render-product-visual.tsx` no se importan desde ningún módulo del bundle inicial. |
| `mount-hero-view-*.js` (Three.js) | 529.81 kB / gzip 133.29 kB        | 529.81 kB / gzip 133.29 kB | Sin cambios: `products/**` no importa Three.js.                                                                                                                                                 |
| `ProductsDevPreview-*.js` (nuevo) | no existía                        | 12.11 kB / gzip 3.54 kB    | Chunk nuevo, dev-only, cargado perezosamente; incluye `ProductVisual2D`, `render-product-visual.tsx` y los datos de las 72 specs.                                                               |

El crecimiento del bundle inicial es marginal (< 0.5 kB) y no introduce ninguna dependencia nueva de
producción.

## Licenciamiento y `EN-021`

Los 72 productos se producen **completamente** mediante SVG declarativo interno: ningún archivo,
imagen, icono ni fuente externa se descargó o incorporó al repositorio (`public/` no cambió, no se
agregó ningún archivo binario). Por tanto:

- **no fue necesaria ninguna entrada nueva en `docs/assets/inventario-activos.md`**;
- ese documento no se modificó en esta Task;
- no se instaló ninguna dependencia npm nueva (`package.json`/`package-lock.json` sin cambios).

Si en el futuro se decide incorporar un asset visual externo real para algún producto, ese incremento
deberá registrarlo en `docs/assets/inventario-activos.md` siguiendo `docs/assets/README.md`, en el
mismo Pull Request, tal como ya establece `heroes-3d.md` para EN-026.3.

## Cómo agregar un producto futuro oficialmente aprobado

1. El producto debe existir primero como fila aprobada en
   `docs/visual-library/inventario-heroes-productos.md` (responsabilidad de una futura Task de
   auditoría equivalente a `EN-026.1`).
2. Agregar una entrada nueva en `PRODUCT_CATALOG` (`product-catalog.ts`) con su `id`, `name`,
   `category`, `heroId` (y `slot` si es `armor`) exactamente como figuran en el inventario.
3. `PRODUCT_VISUAL_SPECS`, `registerProductVisualResources` y `render-product-visual.tsx` no cambian:
   el nuevo producto hereda automáticamente la forma de su familia, el color de su héroe y su propia
   variación decorativa determinista.
4. Cualquier feature que ya use `<ProductVisual2D resourceId="..." category="..." />` con el `id`
   correspondiente obtiene automáticamente el recurso `READY`, sin cambios en la propia feature.

## Qué NO deben hacer futuros Developers/agentes de IA

- No crear un componente por producto ni por familia; toda variación visual pasa por
  `render-product-visual.tsx` y por datos (`PRODUCT_CATALOG`/`ProductVisualSpec`).
- No inventar un producto nuevo directamente en `product-catalog.ts`: primero debe existir como fila
  aprobada en `docs/visual-library/inventario-heroes-productos.md`.
- No inventar lore, función, estadísticas ni forma literal a partir de un nombre ambiguo; usar el
  lenguaje visual de la familia + color + variación decorativa determinista (ver
  [No inventar semántica](#no-inventar-semántica)).
- No equipar visualmente ningún producto sobre `Hero3D`; `products/**` y `heroes/**` son subdominios
  independientes que solo comparten color de identidad, nunca geometría 3D.
- No importar `three` desde ningún módulo de `products/**`.
- No agregar campos de reglas de juego (`daño`, `vida`, `rareza`, `precio`, `cooldown`, `probabilidad`)
  a `ProductVisualSpec` ni a `VisualResourceDescriptor`.
- No implementar aquí HU-37, catálogo funcional, inventario, equipamiento ni E-commerce: son fronteras
  de otras Historias/Tasks.
- No usar `docs/visual-library/inventario-heroes-productos.md` como si fuera editable desde esta Task.

## Fuera de alcance

Ver §20 del enunciado de la Task (`Management#271`): sin HU-07/27/28/37, sin E-commerce, subasta,
carrito, lógica de equipamiento/inventario/combate, estadísticas, efectos, probabilidades, precios,
rareza, drop rates, productos nuevos, slots nuevos, héroes nuevos, equipamiento visible sobre `Hero3D`,
escenarios, misiones ni Máster. Ninguno de esos elementos se implementó. No se modificó ningún backend.

## Pendientes reales

- La revisión visual humana (forma, color, legibilidad en tarjetas pequeñas de las 5 familias) queda
  pendiente en el navegador, en la URL de preview indicada arriba — no fue posible capturarla desde
  este entorno.
- Un consumidor real (catálogo, inventario, equipamiento, E-commerce) que use `<ProductVisual2D>` queda
  fuera del alcance de esta Task; su implementación corresponde a las HUs correspondientes.
