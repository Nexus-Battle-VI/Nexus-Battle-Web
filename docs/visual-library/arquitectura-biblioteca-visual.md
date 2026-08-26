# Arquitectura de la biblioteca visual

Arquitectura mínima, versionada y extensible para identificar, organizar, resolver y reutilizar
técnicamente los recursos visuales de héroes y productos de `Nexus Battles VI`.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#269`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#263`
Depende de: `Refs Nexus-Battle-VI/Nexus-Battle-Management#268`
(`docs/visual-library/inventario-heroes-productos.md`)

## Propósito

`EN-026.1` respondió qué héroes y productos existen oficialmente. `EN-026.2` responde cómo se
identifican, organizan, resuelven, cargan y reutilizan técnicamente sus recursos visuales, dejando
una arquitectura mínima que `EN-026.3` (héroes) y `EN-026.4` (productos) puedan poblar con recursos
reales sin rediseñarla.

Esta Task **no produce ningún recurso visual, no instala Three.js y no implementa HU-37, inventario,
catálogo funcional adicional ni E-commerce**. Ver [Frontera con HU-37](#frontera-con-hu-37) y
[Relación con Three.js](#relación-con-threejs).

## Arquitectura

```text
contenido funcional (docs/visual-library/inventario-heroes-productos.md)
        ↓
identificador estable (VisualResourceId, ya definido por EN-026.1)
        ↓
registro visual (VisualResourceRegistry — vacío hasta que EN-026.3/EN-026.4 produzcan recursos)
        ↓
resolución (resolveVisualResource — pura, con fallback seguro)
        ↓
descriptor vigente (VisualResourceDescriptor)
        ↓
consumidor (feature) / futuro loader-adapter de Three.js (EN-026.3)
```

Ninguna feature construye una ruta física de asset a mano (equivalente a
`"/assets/heroes/guerrero-tanque-final-v3.glb"`); todas resuelven mediante `VisualResourceId` y
`resolveVisualResource`.

## Responsabilidades

| Módulo                                                 | Responsabilidad                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `docs/visual-library/inventario-heroes-productos.md`   | Fuente de verdad del contenido funcional aprobado (EN-026.1, no se modifica) |
| `src/shared/visual-library/visual-resource.ts`         | Contratos de datos (`VisualResourceId`, categorías, estados, descriptor)     |
| `src/shared/visual-library/registry.ts`                | Registro en memoria de descriptores vigentes                                 |
| `src/shared/visual-library/resolve-visual-resource.ts` | Resolución pura de un `id` a su descriptor vigente, con fallback seguro      |
| `src/shared/visual-library/index.ts`                   | Único punto de consumo público de la biblioteca                              |
| Futuro loader-adapter (`EN-026.3`)                     | Traduce un `VisualResourceReference` en una escena/objeto Three.js real      |

## Estructura

```text
src/shared/visual-library/
  visual-resource.ts              Tipos: VisualResourceId, VisualCategory, VisualResourceStatus,
                                   VisualResourceReference, VisualResourceDescriptor.
  registry.ts                     VisualResourceRegistry, createVisualResourceRegistry,
                                   visualResourceRegistry (instancia única de la app).
  resolve-visual-resource.ts      resolveVisualResource (función pura).
  resolve-visual-resource.test.ts Pruebas de comportamiento.
  index.ts                        Punto único de consumo público.
```

Se ubica en `src/shared/` porque debe ser consumible por más de una feature (selección de héroe,
inventario, equipamiento, catálogo, E-commerce) sin que ninguna dependa de otra: la regla de
arquitectura ya vigente en el repositorio ("las capas compartidas no importan de `features`; una
feature no importa de otra feature") es precisamente la que esta biblioteca necesita cumplir, y
`src/shared/` ya aloja el precedente de un módulo de dominio compartido y feature-agnóstico
(`src/shared/auth/`). No se creó una carpeta nueva en la raíz de `src/`: **extender, no rehacer**.

## Identificadores

Se reutiliza sin modificación la convención ya definida por `EN-026.1`
(`docs/visual-library/inventario-heroes-productos.md`, sección "Identificador estable"):

- Héroe: `{heroe-slug}`. Ejemplo: `guerrero-tanque`.
- Recurso asociado a un héroe: `{heroe-slug}--{categoria}--{nombre-slug}`. Ejemplo:
  `guerrero-tanque--arma--espada-de-una-mano`.

`VisualResourceId` (`src/shared/visual-library/visual-resource.ts`) es un alias de `string`: no se
introdujo un tipo de marca (_branded type_) ni un UUID, porque el identificador ya es determinista y
legible por construcción, y una capa adicional de validación de formato no tiene todavía un
consumidor real que la necesite.

El nombre físico de un archivo de asset **no es la única fuente de verdad**: `VisualResourceReference`
(campo `resource` del descriptor) es la única referencia al recurso físico, y solo existe cuando
`status = 'READY'`. Cambiar el archivo físico (p. ej. `modelo-v1.glb` → `modelo-v2.glb`) implica
actualizar `resource.url` del descriptor con el mismo `id`; el `id` funcional no cambia.

## Categorías

`VisualCategory` soporta exactamente las categorías aprobadas por `EN-026`, mapeadas 1 a 1 con las
categorías ya usadas por `EN-026.1` para preservar trazabilidad:

| `VisualCategory` (código) | Categoría en `EN-026.1` | Significa       |
| ------------------------- | ----------------------- | --------------- |
| `hero`                    | (el propio héroe)       | Héroe           |
| `action`                  | `accion`                | Acción especial |
| `weapon`                  | `arma`                  | Arma            |
| `armor`                   | `armadura`              | Armadura        |
| `item`                    | `item`                  | Ítem            |
| `epic`                    | `epica`                 | Habilidad épica |

No se agregó ninguna categoría fuera de esta lista.

## Metadatos visuales

`VisualResourceDescriptor` contiene únicamente lo necesario para resolver y gestionar un recurso
visual:

- `id`: identificador estable (ver arriba).
- `category`: una de las seis categorías aprobadas.
- `heroId`: héroe asociado (igual a `id` cuando `category = 'hero'`).
- `status`: ver [Estados de recursos](#estados-de-recursos).
- `resource`: referencia opaca al recurso físico (`kind`, `url`). **Obligatoria cuando
  `status = 'READY'`, e inexistente por tipo cuando `status = 'NOT_PRODUCED'`** — ver más abajo.
- `assetInventoryId` (opcional): enlace a una fila de `docs/assets/inventario-activos.md` cuando el
  recurso incorpore un asset externo licenciado. Ver [Relación con EN-021](#relación-con-en-021).

`VisualResourceDescriptor` es una unión discriminada por `status`
(`NotProducedVisualResourceDescriptor | ReadyVisualResourceDescriptor`), no una interfaz plana con
`resource` opcional: TypeScript rechaza en tiempo de compilación tanto un `READY` sin `resource` como
un `NOT_PRODUCED` con `resource`. No se agregó ningún validador en tiempo de ejecución para esto —
el sistema de tipos ya lo resuelve por completo en cada punto donde se construye un descriptor
(`registry.register(...)`, los literales de prueba, `buildFallbackDescriptor`).

Deliberadamente **no** incluye daño, defensa, vida, poder, cooldown, rareza, precio ni probabilidades:
la biblioteca visual no es una base de datos de reglas de juego.

## Estados de recursos

`VisualResourceStatus` tiene exactamente dos valores: `NOT_PRODUCED` y `READY`.

No se modeló un tercer estado `REPLACED` (o equivalente a "reemplazado"), a pesar de que la Task lo
menciona como estado conceptual posible: el descriptor vigente de un `id` siempre representa el
recurso **actual**; cuando un recurso se reemplaza, se actualiza el mismo descriptor (nuevo
`resource.url`), y el historial de versiones anteriores ya lo conserva Git — no hace falta un campo ni
un estado adicional en tiempo de ejecución para eso. Añadirlo ahora, sin un consumidor real que
necesite distinguir "reemplazado" de "vigente" en tiempo de ejecución, sería una abstracción sin
necesidad concreta.

`EN-026.1` declara sus 80 registros como `NOT_PRODUCED`; esta biblioteca respeta esa realidad: ningún
descriptor se marca `READY` sin que exista efectivamente un `VisualResourceReference` real.

## Resolución de recursos

`resolveVisualResource(registry, id, category)` (`src/shared/visual-library/resolve-visual-resource.ts`)
es la única estrategia de resolución, reutilizable desde cualquier feature futura (selección de héroe,
inventario, equipamiento, catálogo, E-commerce):

- es una función pura: mismo `registry` + `id` + `category` produce siempre el mismo resultado;
- no conoce ninguna interfaz concreta ni importa de `features`;
- no tiene dependencias circulares (`registry.ts` y `visual-resource.ts` no importan de
  `resolve-visual-resource.ts`);
- nunca lanza una excepción.

Se le pasa `category` explícitamente porque quien resuelve un recurso ya conoce, por construcción, qué
está resolviendo (una pantalla de selección de héroe resuelve `category: 'hero'`; una lista de
equipamiento resuelve `category: 'weapon'`, etc.) — evita inferir la categoría analizando el `id` por
convención de string, que sería más frágil.

Un descriptor registrado solo se devuelve como resultado real cuando **su `category` coincide con la
solicitada**. Dos categorías distintas no comparten espacio de `id`, así que si `id` existe en el
registro bajo otra categoría, `resolveVisualResource` no lo devuelve silenciosamente como si fuera el
recurso pedido: cae al mismo fallback seguro que un `id` desconocido.

## Fallback

Si `id` no está en el registro — porque el recurso todavía es `NOT_PRODUCED`, porque la referencia es
desconocida, porque el registro aún no fue poblado, o porque `id` existe registrado bajo otra
`category` — `resolveVisualResource` devuelve:

```ts
{
  descriptor: { id, category, heroId, status: 'NOT_PRODUCED' }, // sin `resource`
  isFallback: true,
}
```

Este es el **único** mecanismo de fallback: no se generan modelos 3D ni imágenes de reemplazo para
cubrir ausencias. `isFallback` permite que un futuro consumidor (p. ej. un componente de UI en
`EN-026.3`) decida cómo representar la ausencia (un placeholder simple, un estado vacío declarado)
sin que la resolución misma falle o lance. No se implementa aquí ningún componente visual de fallback:
construirlo ahora, sin una pantalla real que lo consuma, sería una feature visual nueva fuera de
alcance de `EN-026.2`.

## Carga y rendimiento

`EN-026.2` no instala Three.js ni implementa código de carga (ver
[Relación con Three.js](#relación-con-threejs)), pero deja documentada la estrategia que debe seguir
quien lo haga:

- **import dinámico**: el adaptador de Three.js (y Three.js mismo) deben cargarse mediante `import()`
  dinámico dentro del loader-adapter, nunca en el punto de entrada de la aplicación (`src/main.tsx`) ni
  en un import estático de una feature — así el bundle inicial no incluye Three.js si la pantalla que
  se visita no necesita render 3D.
- **carga bajo demanda, uno a la vez**: una pantalla que necesita un solo héroe no debe forzar la
  carga de los ocho; el loader-adapter debe aceptar un único `VisualResourceReference` por invocación.
- **reutilización**: si el mismo `id` se resuelve dos veces (dos consumidores distintos), el registro
  devuelve el mismo objeto `VisualResourceDescriptor` (ver prueba
  `reutiliza el mismo descriptor registrado desde mas de un consumidor, sin duplicarlo`); cachear el
  resultado del loader físico (la geometría/textura cargada) es responsabilidad del loader-adapter que
  construya `EN-026.3`, no de esta capa de resolución.
- **aislamiento**: ningún código de Three.js existe todavía en el repositorio; cuando exista, debe
  vivir exclusivamente detrás del loader-adapter, nunca importado directamente por una feature.

No se promete "latencia cero"; esta estrategia se puede medir cuando exista carga real que perfilar.

## Relación con Three.js

**No se instaló `three` en esta Task.** Se inspeccionó `package.json` y `package-lock.json`: ninguna
dependencia de Three.js, `@react-three/fiber`, `@react-three/drei` ni motor 3D alternativo existe
actualmente. El alcance de `EN-026.2` (contratos, registro, resolución, documentación) se completa por
completo sin código ejecutable de Three.js — no hay todavía ningún componente que renderice un modelo
3D. Instalarlo ahora habría sido una dependencia "por si acaso", explícitamente prohibida por la Task.

El punto de integración queda preparado conceptualmente, sin forzar una implementación exacta:

```text
feature
  ↓
src/shared/visual-library (resolveVisualResource → VisualResourceDescriptor)
  ↓
loader-adapter de Three.js (EN-026.3, no existe todavía)
  ↓
Three.js (https://threejs.org/)
```

Cuando `EN-026.3` necesite Three.js de verdad, debe:

1. instalar únicamente `three` (o el paquete mínimo que demuestre necesitar, con justificación
   explícita), dejando que `npm` resuelva `package-lock.json` normalmente;
2. crear el loader-adapter como módulo aislado (posible ubicación: `src/shared/visual-library/`, en un
   submódulo propio, o en la feature concreta si el consumo termina siendo específico de una sola
   pantalla — esa decisión le corresponde a `EN-026.3` con la información real de esa Task);
3. consumir `resolveVisualResource` para obtener el `VisualResourceDescriptor`, nunca construir una
   ruta de asset a mano.

## Relación con `EN-021`

Esta biblioteca **no duplica** `docs/assets/README.md` ni `docs/assets/inventario-activos.md`: esos
documentos siguen siendo la única fuente de verdad de procedencia, licencia y atribución de recursos
externos. `VisualResourceDescriptor.assetInventoryId` es un campo opcional que **enlaza** a una fila de
`inventario-activos.md` cuando el recurso visual incorpore un asset externo real; no repite `tipo`,
`fuente_origen`, `autor_proveedor`, `licencia_o_autorizacion` ni ningún otro campo de ese modelo.

Un recurso producido internamente (por el equipo o con apoyo de IA, según lo aprobado para `EN-026`)
se identifica simplemente por la **ausencia** de `assetInventoryId`: no se inventa una licencia externa
para un recurso propio, y tampoco hace falta inventarle un campo booleano `esExterno` — la presencia o
ausencia de `assetInventoryId` ya lo distingue sin duplicar el modelo de `EN-021`.

## Frontera con HU-37

`HU-37 — Diseñador visual de productos` sigue siendo responsable, funcionalmente, de crear/modificar
diseños, previsualizar, versionar funcionalmente, importar/exportar, mantener historial y hacer
rollback desde la aplicación. `EN-026.2` no implementa ningún panel administrativo, editor, mecanismo
de carga (_upload_), historial funcional, rollback ni API administrativa: únicamente deja preparada
`resolveVisualResource`/`VisualResourceRegistry` como la capa que un futuro editor de `HU-37` podría
usar para **leer** el estado visual vigente de un producto, sin que `EN-026.2` decida cómo se
administra ese contenido.

## Extensibilidad — cómo agregar un héroe o producto futuro aprobado

1. El héroe/producto debe existir primero como fila aprobada en
   `docs/visual-library/inventario-heroes-productos.md` (responsabilidad de una futura Task de
   auditoría equivalente a `EN-026.1`, no de esta Task ni de código).
2. Cuando su recurso visual exista realmente (`EN-026.3`/`EN-026.4`), se llama
   `visualResourceRegistry.register(descriptor)` con `status: 'READY'` y el `resource` real. Ningún
   `id` existente cambia ni se reescribe: se agrega una entrada nueva.
3. Cualquier feature que ya use `resolveVisualResource` con el `id` correspondiente obtiene
   automáticamente el descriptor `READY` en vez del fallback `NOT_PRODUCED`, sin cambios en la propia
   feature.

Ver la prueba `permite extender el registro con un noveno heroe futuro sin afectar la resolucion de
los existentes` para el comportamiento verificado.

## Ejemplo de consumo

```ts
import { resolveVisualResource, visualResourceRegistry } from '@/shared/visual-library'

// "guerrero-tanque" -> resolución -> descriptor visual / fallback.
const { descriptor, isFallback } = resolveVisualResource(
  visualResourceRegistry,
  'guerrero-tanque',
  'hero',
)

// Hoy: descriptor = { id: 'guerrero-tanque', category: 'hero', heroId: 'guerrero-tanque',
//                      status: 'NOT_PRODUCED' }, isFallback = true.
// EN-026.1 declara 'guerrero-tanque' como NOT_PRODUCED; ningún recurso fue inventado para completar
// este ejemplo.
```

Este ejemplo usa la API real (`src/shared/visual-library/resolve-visual-resource.test.ts` lo ejercita
como prueba automatizada); no se simula un resultado que el código no produce.

## Qué NO deben hacer futuros Developers/agentes de IA

- No construir una ruta de asset física a mano en una feature; siempre resolver por `id` con
  `resolveVisualResource`.
- No marcar un descriptor como `READY` sin que exista realmente un `VisualResourceReference` válido.
- No agregar campos de reglas de juego (daño, vida, rareza, precio, cooldown, probabilidades) a
  `VisualResourceDescriptor`.
- No inventar un noveno héroe o un producto nuevo directamente en el registro: primero debe existir
  como fila aprobada en `docs/visual-library/inventario-heroes-productos.md`.
- No importar Three.js directamente desde una feature; debe pasar por el futuro loader-adapter.
- No cargar los ocho héroes 3D cuando la pantalla solo necesita mostrar uno.
- No dejar que `src/shared/visual-library` importe de `src/features/**` (ya bloqueado por
  `eslint.config.js`, pero debe mantenerse así conscientemente).
- No usar esta biblioteca para implementar HU-37, inventario, catálogo funcional adicional o
  E-commerce: son fronteras de otras Historias/Tasks.
- No duplicar el modelo de datos de `docs/assets/inventario-activos.md`; enlazarlo mediante
  `assetInventoryId` cuando corresponda.
