# Héroes 3D (EN-026.3)

Documentación específica de la producción e integración de los ocho héroes 3D reutilizables con
Three.js. Complementa, sin repetir, `docs/visual-library/arquitectura-biblioteca-visual.md`
(EN-026.2): este documento explica las decisiones propias de esta Task; el diseño general de la
biblioteca visual (identificadores, categorías, resolución, fallback) sigue documentado allí.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#270`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#263`
Depende de: `Refs Nexus-Battle-VI/Nexus-Battle-Management#268` y `#269`
Base evaluada: `origin/develop` en `fd2c2c3a5a2ea5912d680dc746b854103fe82e42`

## Alcance

Produce representación 3D **exclusivamente** para los ocho héroes oficiales e iniciales
(`docs/visual-library/inventario-heroes-productos.md`), mediante geometrías procedimentales de
Three.js. No produce armas, armaduras, ítems, acciones ni habilidades épicas (corresponde
principalmente a `EN-026.4`), no implementa HU-37, HU-07, HU-27, HU-28 ni HU-57, y no introduce
lógica funcional (combate, inventario, equipamiento, precios, rareza).

## Versión de Three.js

`three@0.185.1` (dependencia de producción) y `@types/three@0.185.4` (dependencia de desarrollo).

`@types/three` fue necesaria porque `three` no publica sus propios tipos
(`node_modules/three/package.json` no declara `"types"`); sin ella, `npm run typecheck` falla con
`TS7016: Could not find a declaration file for module 'three'` — verificado antes de instalarla.

## Decisión: modelos procedimentales internos

Los ocho héroes se generan por código combinando primitivas de Three.js (`BoxGeometry`,
`SphereGeometry`, `CylinderGeometry`, y una geometría de acento por héroe), no se descargan archivos
`.glb`/`.gltf`/imágenes externas. Esto evita: introducir ocho archivos de procedencia dudosa,
depender de un pipeline de modelado externo, y necesitar una entrada de `EN-021` para cada héroe (ver
[Licenciamiento](#licenciamiento-y-en-021)).

## Mapeo id → representación

| `heroId` (EN-026.1) | Nombre oficial  | Silueta    | Acento geométrico |
| ------------------- | --------------- | ---------- | ----------------- |
| `guerrero-tanque`   | Guerrero Tanque | `bulky`    | `shoulderBlock`   |
| `guerrero-armas`    | Guerrero Armas  | `balanced` | `crest`           |
| `mago-fuego`        | Mago Fuego      | `slender`  | `flame`           |
| `mago-hielo`        | Mago Hielo      | `slender`  | `crystal`         |
| `picaro-veneno`     | Pícaro Veneno   | `slender`  | `hood`            |
| `picaro-machete`    | Pícaro Machete  | `balanced` | `band`            |
| `chaman`            | Chamán          | `balanced` | `antlers`         |
| `medico`            | Médico          | `balanced` | `halo`            |

Silueta (proporción de torso/extremidades) y acento (forma geométrica abstracta) son los dos únicos
ejes de diferenciación visual, definidos en `hero-definitions.ts`. Ninguno representa un arma,
armadura o ítem del inventario de `EN-026.1` — ver [Identidad visual](#identidad-visual).

## Ubicación del código fuente

```text
src/shared/visual-library/heroes/
  hero-ids.ts                          Los 8 ids oficiales (HERO_IDS).
  hero-definitions.ts                  HeroVisualSpec por heroe (sin datos de reglas de juego).
  create-hero-model.ts                 Fabrica unica: HeroVisualSpec -> THREE.Group.
  create-hero-model.test.ts
  create-hero-scene.ts                 Scene/camara/iluminacion compartidas.
  create-hero-scene.test.ts
  mount-hero-view.ts                   Renderer, resize, cleanup. Unico modulo que crea WebGLRenderer.
  mount-hero-view.test.ts
  register-hero-visual-resources.ts    Registra los 8 heroes como READY (recurso procedural).
  register-hero-visual-resources.test.ts
  Hero3D.tsx                           Componente reutilizable <Hero3D heroId="..." />.
  Hero3D.test.tsx
  HeroesDevPreview.tsx                 Harness de verificacion (dev-only, ver "Preview humano").
  index.ts                             Punto unico de consumo publico.
```

Se ubica dentro de `src/shared/visual-library/` (no en una carpeta nueva de `src/`) porque extiende
directamente la biblioteca visual de `EN-026.2`: reutiliza `registry.ts` y `resolve-visual-resource.ts`
sin modificarlos, y solo agrega el subdominio "héroes" que esa Task dejó preparado.

## Arquitectura de render

Fábrica única y reutilizable — no existe `GuerreroTanque3D.tsx`, `MagoFuego3D.tsx`, etc.:

```text
HERO_IDS (hero-ids.ts)
        ↓
HeroVisualSpec (hero-definitions.ts)
        ↓
createHeroModel(spec)  →  THREE.Group   (create-hero-model.ts, sin WebGL)
        ↓
mountHeroView(canvas, container, spec)  (mount-hero-view.ts, requiere WebGL)
        ↓
<Hero3D heroId="..." />  (Hero3D.tsx, resuelve heroId vía EN-026.2)
```

Agregar un noveno héroe futuro aprobado (cuando exista en `docs/visual-library/inventario-heroes-productos.md`)
requiere únicamente una entrada nueva en `hero-definitions.ts`; `createHeroModel`, `mountHeroView` y
`Hero3D` no cambian.

## Cámara, iluminación y fondo

`create-hero-scene.ts` centraliza una única configuración reutilizada por los ocho héroes:
`PerspectiveCamera` (fov 35°, encuadrada para las proporciones normalizadas de `PROPORTIONS` en
`create-hero-model.ts`), una luz ambiental y una direccional, y `scene.background = null`. El
`WebGLRenderer` se crea con `alpha: true` (`mount-hero-view.ts`), así el héroe se ve sobre el fondo
real de `Nexus-Battle-Web` (`src/index.css`, token `--color-surface`), sin imponer un fondo propio ni
duplicar un Design System paralelo.

## Estrategia responsive

`mount-hero-view.ts` usa `ResizeObserver` sobre el contenedor de `Hero3D` para llamar
`renderer.setSize` y actualizar `camera.aspect` en cada cambio de tamaño. `Hero3D.tsx` envuelve el
`<canvas>` en un contenedor `aspect-square w-full`, así el harness de verificación
(`HeroesDevPreview.tsx`) puede mostrar los ocho en una grilla `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
sin reglas responsive propias del héroe.

## Estrategia de carga

- `src/shared/visual-library/heroes/index.ts` **no** reexporta `create-hero-model.ts`,
  `create-hero-scene.ts` ni `mount-hero-view.ts` (los únicos módulos que importan `three` de forma
  estática), para que importar el barril no arrastre Three.js.
- `Hero3D.tsx` carga `mount-hero-view.ts` mediante `await import('./mount-hero-view')` **dentro** de
  su `useEffect`, solo cuando el `heroId` resuelto está `READY` — nunca en el módulo de nivel
  superior ni en `src/main.tsx`.
- Un `<Hero3D>` monta un único héroe: no existe ningún camino que cargue los ocho modelos cuando se
  pide uno solo. El harness de verificación monta ocho instancias de `Hero3D` porque cada una debe
  verse simultáneamente para la revisión humana; eso es responsabilidad del harness, no de `Hero3D`.
- `mountHeroView` limita `devicePixelRatio` a un máximo de 2 (`Math.min(devicePixelRatio, 2)`).

Ver [Comparación de bundle](#comparación-de-bundle) para la evidencia medida.

## Fallback

`Hero3D` nunca lanza. Cae al mismo estado de fallback seguro (mensaje visible, sin canvas) en:

- `heroId` desconocido o sin `HeroVisualSpec` (`resolution.isFallback === true`, ver EN-026.2);
- el descriptor resuelto no está `READY`;
- `import('./mount-hero-view')` o `mountHeroView(...)` lanzan (por ejemplo, sin contexto WebGL
  disponible en el navegador).

No se inventa un noveno modelo ni un placeholder 3D: el fallback es un mensaje de texto simple dentro
del mismo contenedor `role="img"`.

## Cleanup

Al desmontarse o cambiar `heroId`/elegibilidad, el efecto de `Hero3D` desconecta el `ResizeObserver`,
recorre el `Group` liberando cada `geometry`/`material` (`disposeMesh` en `mount-hero-view.ts`), y
llama `renderer.dispose()`. No queda ningún `requestAnimationFrame` activo porque la escena es
estática (ver siguiente sección).

## `prefers-reduced-motion`

La escena es **estática**: no existe ningún game loop ni `requestAnimationFrame` continuo.
`mountHeroView` renderiza un frame en el montaje inicial y uno por cada evento de `ResizeObserver`;
no hay animación que respetar o detener bajo `prefers-reduced-motion` porque no hay movimiento que
producir.

## Licenciamiento y EN-021

Los ocho héroes se producen **completamente** mediante geometrías y materiales internos de Three.js:
ningún modelo, imagen, textura ni ícono externo se descargó o incorporó al repositorio (verificado:
`public/` no cambió, no se agregó ningún archivo binario). Por tanto:

- no se requiere ninguna entrada nueva en `docs/assets/inventario-activos.md`;
- `three`/`@types/three` son dependencias de software (paquetes npm), no activos visuales; su
  licencia (Three.js: MIT) no está sujeta al modelo de datos de `EN-021`
  (`docs/assets/README.md` gobierna activos visuales/multimedia externos, no dependencias de código,
  igual que `react`, `vite` u otras dependencias existentes del proyecto no generan una entrada ahí).

Si en el futuro `EN-026.4` u otra Task incorpora un asset visual externo real, ese incremento deberá
registrarlo en `docs/assets/inventario-activos.md` siguiendo `docs/assets/README.md`, en el mismo
Pull Request.

## Extensión del contrato `VisualResourceReference` (EN-026.2)

El diseño original de `EN-026.2` (`VisualResourceReference { kind, url }`) solo representaba un
recurso cargado desde una URL real. Los héroes de `EN-026.3` no tienen ningún archivo físico que
descargar, así que forzarlos a ese contrato habría exigido inventar una URL falsa
(`https://example.invalid/...` o equivalente) únicamente para satisfacer el tipo — exactamente lo que
la auditoría de esta Task debía evitar.

`src/shared/visual-library/visual-resource.ts` extiende `VisualResourceReference` a una unión
discriminada por `source`:

```ts
type VisualResourceReference =
  | { kind: 'model3d' | 'image'; source: 'url'; url: string }
  | { kind: 'model3d' | 'image'; source: 'procedural' }
```

Es una extensión mínima y retrocompatible: `source: 'url'` conserva exactamente el contrato original
(`kind` + `url`); `source: 'procedural'` es el caso nuevo, sin `url`. Los ocho héroes se registran con
`{ kind: 'model3d', source: 'procedural' }` (`register-hero-visual-resources.ts`). Las pruebas de
`resolve-visual-resource.test.ts` se actualizaron para reflejar ambas variantes; el resto de
`arquitectura-biblioteca-visual.md` (identificadores, categorías, resolución, fallback) no cambió.

## Identidad visual

Cada héroe se distingue únicamente por silueta y acento geométrico abstracto (ver
[Mapeo id → representación](#mapeo-id--representación)) — nunca por su arma, armadura o ítem del
inventario de `EN-026.1`. Por ejemplo, `guerrero-tanque` usa proporciones `bulky` y un acento
`shoulderBlock` genérico, no el modelo de "Escudo de dragón" ni "Espada de una mano"; `picaro-machete`
no porta el "Machete vendito". Esto respeta explícitamente la regla funcional de `EN-026`: equipar un
producto no obliga a modificar visualmente el héroe.

## Preview humano

Ruta de desarrollo, exclusivamente de verificación técnica, **no una pantalla del producto**:

```text
npm run dev
http://localhost:5173/__dev/visual-library/heroes
```

La ruta solo existe cuando `import.meta.env.DEV` es verdadero (`src/routes/dev-routes.tsx`): no
aparece en `NAVIGATION`, no se agrega al árbol de rutas en una compilación de producción, y no
requiere autenticación (fuera del flujo normal de la aplicación).

Verificación automatizada realizada en este entorno (`src/routes/dev-routes.test.ts`,
`src/shared/visual-library/heroes/Hero3D.test.tsx`): los ocho héroes se resuelven `READY`, cada uno
expone `role="img"` con su nombre oficial visible, y el título del harness muestra `(8/8)`. Este
entorno de ejecución no dispone de un navegador con GPU/WebGL real, así que la inspección visual (el
render 3D efectivo, colores, proporciones vistas) queda para revisión humana en la URL indicada —
no se generó ninguna captura simulada.

## Cómo reproducir las pruebas

```bash
npm run test:coverage
```

Pruebas relevantes a esta Task: `src/shared/visual-library/heroes/*.test.{ts,tsx}` y
`src/routes/dev-routes.test.ts`.

## Fuera de alcance

Ver `§23` del enunciado de la Task (`Management#270`): sin animaciones de combate, sin equipamiento
renderizado, sin escenarios, sin post-processing, sin HU-37, sin lógica funcional. Ninguno de esos
elementos se implementó.

## Pendientes reales

- La revisión visual humana (colores, proporciones, distinción entre los ocho) queda pendiente en el
  navegador, en la URL de preview indicada arriba — no fue posible capturarla desde este entorno.
- `EN-026.4` deberá producir e integrar los recursos visuales de productos (armas, armaduras, ítems)
  siguiendo esta misma arquitectura, sin equiparlos visualmente sobre el modelo del héroe.
