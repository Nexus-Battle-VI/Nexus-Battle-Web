# Nexus-Battle-Web

Aplicación web de Nexus Battles VI. Es la interfaz de los seis bounded contexts del producto: cuenta, inventario, catálogo, comunidad, pedidos y notificaciones.

Este repositorio contiene código y Pull Requests. No contiene Issues ni Product Backlog: la fuente única de verdad es [Nexus-Battle-Management](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management).

- **Teams propietarios:** Team Alfa, Team Beta y Team Gama. Es el único repositorio compartido por los tres; `CODEOWNERS` reparte la propiedad **por feature**, alineada con la propiedad de cada servicio.
- **Arquitectura interna:** una feature por bounded context, sin microfrontends
- **Documentación técnica del sistema:** [Nexus-Battle-Infrastructure](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure)

## La aplicación no conoce la topología de los servicios

Todas las peticiones salen contra el **mismo origen**, bajo `/api`. Es el proxy inverso quien enruta hacia el servicio correspondiente.

```text
navegador  ->  /api/products   ->  proxy  ->  Catalog
               /api/orders                    Commerce
               /api/threads                   Community
```

Esa indirección es lo que permite que la demo corra en una sola máquina y que la arquitectura objetivo viva detrás de un balanceador **sin cambiar una línea del frontend**. Ningún componente construye una URL de servicio a mano: todo pasa por `src/lib/http.ts`.

## Requisitos

| Herramienta | Versión                                       |
| ----------- | --------------------------------------------- |
| Node.js     | 24 LTS (`.nvmrc` fija el major 24)            |
| npm         | 11 o superior                                 |
| Docker      | opcional, para construir y ejecutar la imagen |

Este repositorio usa **npm** y `package-lock.json`. No se utilizan pnpm ni yarn.

## Puesta en marcha

```bash
nvm use
npm ci
npm run dev
```

La aplicación queda en `http://localhost:5173`. El servidor de desarrollo redirige `/api` a `http://localhost:3000`; ajusta el destino en `vite.config.ts` si ejecutas otro servicio.

## Stack

| Pieza          | Versión         | Nota                                   |
| -------------- | --------------- | -------------------------------------- |
| React          | 19.2.8          |                                        |
| Vite           | 8.2.2           | Compilación y servidor de desarrollo   |
| TypeScript     | **7.0.2**       | Verificación de tipos y compilación    |
| Tailwind CSS   | 4.3.3           | Configuración en CSS mediante `@theme` |
| TanStack Query | 5.101.4         | Estado del servidor                    |
| Zustand        | 5.0.15          | Estado de cliente                      |
| React Router   | 8.3.0           |                                        |
| Vitest + RTL   | 4.1.11 / 16.3.2 |                                        |

## Compatibilidad de TypeScript

Este repositorio instala **dos** copias de TypeScript de forma deliberada:

| Paquete                               | Versión | Uso                                            |
| ------------------------------------- | ------- | ---------------------------------------------- |
| `typescript`                          | 6.0.3   | API JavaScript que consume typescript-eslint   |
| `typescript7` (alias de `typescript`) | 7.0.2   | Compilador y verificador de tipos del producto |

`typescript-eslint` todavía no soporta TypeScript 7 y **aborta en ejecución** si lo detecta. Este es el patrón _side-by-side_ documentado por el propio proyecto de TypeScript. La verificación de tipos autoritativa la realiza TypeScript 7, y `build` depende de ella. El detalle y la condición de salida están en ADR-003 de Nexus-Battle-Infrastructure.

Dos cambios de TypeScript 7 afectaron a este repositorio y quedan documentados aquí porque volverán a aparecer:

- **`baseUrl` fue eliminado.** Los `paths` se declaran relativos al `tsconfig.json`, con prefijo explícito `./`.
- **`exactOptionalPropertyTypes`** impide asignar `undefined` a una propiedad opcional. Por eso `HttpClient` compone el `RequestInit` por partes en lugar de declarar `headers: undefined`.

## Scripts

| Script                  | Descripción                                          |
| ----------------------- | ---------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo                               |
| `npm run build`         | Verifica tipos con TypeScript 7 y compila a `dist/`  |
| `npm run preview`       | Sirve la compilación de producción localmente        |
| `npm run typecheck`     | Verificación de tipos con TypeScript 7               |
| `npm run lint`          | ESLint con reglas basadas en información de tipos    |
| `npm run lint:fix`      | Corrige automáticamente lo que ESLint puede corregir |
| `npm run format`        | Aplica Prettier                                      |
| `npm run format:check`  | Verifica el formato sin modificar archivos           |
| `npm test`              | Ejecuta las pruebas                                  |
| `npm run test:watch`    | Pruebas en modo observación                          |
| `npm run test:coverage` | Pruebas con cobertura y umbral del 80 %              |

## Estructura

```text
src/
  app/               Composicion de la aplicacion, layout y pagina de error.
  routes/            Definicion de rutas y navegacion.
  features/          Una carpeta por bounded context.
  components/ui/     Componentes de interfaz reutilizables.
  shared/            Estado y configuracion compartidos entre features.
  lib/               Cliente HTTP y utilidades de formato.
  hooks/             Hooks reutilizables.
  test/              Configuracion y ayudantes de prueba.
```

**No hay microfrontends.** Es una única aplicación con una feature por contexto.

Dos reglas de arquitectura se verifican en CI mediante ESLint:

- Las capas compartidas (`shared`, `lib`, `components`) **no pueden importar de `features`**. Sin esa regla, la capa compartida acaba siendo el punto por el que todo se acopla con todo.
- Una feature **no importa de otra feature**. La comunicación ocurre por rutas, por estado compartido o por el cliente HTTP.

## Estado de las pantallas

| Ruta             | Estado                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| `/catalog`       | **Implementada**: consume el servicio Catalog, filtra por categoría y formatea importes |
| `/inventory`     | Marcador de posición declarado                                                          |
| `/community`     | Marcador de posición declarado                                                          |
| `/orders`        | Marcador de posición declarado                                                          |
| `/account`       | Marcador de posición declarado                                                          |
| `/notifications` | Marcador de posición declarado                                                          |

Las pantallas no implementadas **lo dicen explícitamente y nombran el servicio responsable**. No muestran datos inventados: una pantalla con contenido simulado es indistinguible de una terminada, y esa confusión es peor que una pantalla vacía honesta. Hay pruebas que verifican precisamente eso.

## Docker

```bash
docker build -t nexus-battle-web:local .
docker run --rm -p 8080:8080 nexus-battle-web:local
```

La aplicación es un conjunto de ficheros estáticos y no necesita Node en ejecución: la imagen final es Caddy sirviendo `dist/`, lo que elimina el runtime de JavaScript y reduce la superficie de ataque. Se ejecuta con el usuario sin privilegios `caddy`.

El `Caddyfile` devuelve `index.html` para cualquier ruta desconocida, que es lo que exige el enrutado en el cliente; sin eso, recargar en `/catalog` produciría un `404`.

## Limitaciones conocidas del alcance actual

- **No hay autenticación.** `useSession` guarda quién dice ser la persona para que la interfaz pueda operar, pero **no verifica nada**: no hay token, no hay firma y el servidor no comprueba identidad. Se mantiene en memoria a propósito, no en `localStorage`: persistir una identidad no verificada daría apariencia de una sesión que no existe. Depende del proveedor de identidad pendiente de aprobación.
- **Cinco de las seis pantallas no están implementadas.** Ver la tabla anterior.
- **No hay pruebas de extremo a extremo.** Playwright se incorporará cuando exista un flujo completo que ejercitar; con una sola pantalla implementada aportaría menos que las pruebas de integración actuales.
- Toda variable con prefijo `VITE_` acaba en el paquete servido al navegador y es **pública**. Aquí no se declara ningún secreto.

## Contribución

Se aplican las convenciones descritas en [CONTRIBUTING.md](CONTRIBUTING.md) y la [política de trazabilidad entre repositorios](https://github.com/Nexus-Battle-VI/Nexus-Battle-Management/blob/main/docs/governance/cross-repository-traceability.md) de Management.

## Licencia

`Licensing pending project governance`. Este repositorio todavía no tiene una licencia asignada; su definición requiere autorización del gobierno del proyecto.
