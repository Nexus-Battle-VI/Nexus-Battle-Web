# Verificación manual del cliente realtime contra un Auction real (EN-034.5)

Ejecuta el hook `useAuctionRealtime` de producción (el mismo de `src/features/auction/realtime/`)
contra la composición real: **Caddy** (con el `Caddyfile` real de Infrastructure) → **Auction**
(imagen construida desde `develop`) → **PostgreSQL**. Sin dobles de socket ni de ticket.

**No forma parte de `npm test` ni del CI.** El `include` de Vitest es `src/**`, y esta carpeta está
excluida de ESLint. Existe para comprobar lo que las pruebas con sockets simulados no pueden: que el
protocolo que habla la Web es el que habla el servidor.

## Qué comprueba (8 pruebas, en dos modos)

**Realtime encendido (7):** conexión real (ticket por HTTP → WebSocket → `authenticated`);
CA-01 dos sesiones se actualizan sin acción manual; CA-02 una subasta ajena no toca este detalle;
CA-05 Marketplace relee la lista; CA-04 un cambio de estado llega; CA-03 si Auction pierde su
conexión con PostgreSQL, el servidor manda `resync` y la Web relee; cierre limpio al desmontar.

**Realtime apagado (1, `LIVE_REALTIME_OFF=1`):** el ticket responde `404` y la conexión queda
`disabled`, sin reintentos ni sondeo (reversión de ADR-024).

Cada sesión monta consultas reales de React Query y cuenta cuántas veces se vuelve a leer: lo que se
verifica es la relectura, no solo que se llame a `invalidateQueries`.

## Requisitos

- Docker, y los repositorios `Nexus-Battle-Auction` e `Nexus-Battle-Infrastructure` clonados.
- `ws` instalado **sin guardarlo**: `npm install --no-save ws@8.21.3`. Hace falta porque el
  `WebSocket` global de Node dispara eventos incompatibles con el `Event` de jsdom.
- Comandos escritos para Git Bash en Windows.

## 1. Levantar el entorno

Los contenedores deben llamarse `rt-pg`, `auction` y `caddy` (el `Caddyfile` enruta a `auction:3008`
y las pruebas siembran datos con `docker exec rt-pg`).

```bash
# Desde Nexus-Battle-Auction (rama develop)
docker build -t auction-rt:test .
docker network create rt-net
docker run -d --name rt-pg --network rt-net -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=auction postgres:17-alpine
docker run --rm --network rt-net -e DATABASE_URL=postgres://postgres:pw@rt-pg:5432/auction \
  -e PERSISTENCE_DRIVER=postgres -e NODE_ENV=development auction-rt:test node dist/infrastructure/persistence/migrate.js

# AUCTION_REALTIME_ENABLED=true para el modo encendido; false para el apagado.
docker run -d --name auction --network rt-net --memory 160m --memory-swap 160m \
  -e NODE_ENV=development -e PORT=3008 -e PERSISTENCE_DRIVER=postgres \
  -e DATABASE_URL=postgres://postgres:pw@rt-pg:5432/auction \
  -e AUTH_MODE=disabled -e AUCTION_REALTIME_ENABLED=true auction-rt:test

# El Caddyfile REAL (sitio interno :8080, sin TLS).
docker run -d --name caddy --network rt-net -p 18080:8080 \
  -v "<ruta>/Nexus-Battle-Infrastructure/compose/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine
```

## 2. Ejecutar

```bash
# Encendido (7 pruebas)
npx vitest run --config scripts/realtime-live/vitest.live.config.ts

# Apagado: recrear `auction` con AUCTION_REALTIME_ENABLED=false y luego
LIVE_REALTIME_OFF=1 npx vitest run --config scripts/realtime-live/vitest.live.config.ts
```

`LIVE_BASE_URL` cambia el origen de Caddy (por defecto `http://127.0.0.1:18080`).

Control de que no pasan en vacío: con el servidor **apagado**, el modo encendido debe fallar (las 7).

## 3. Limpiar

```bash
docker rm -f auction caddy rt-pg; docker network rm rt-net; docker rmi auction-rt:test
```

## Lo que esto NO cubre

- **No es un navegador.** Es el código real del hook y un cliente WebSocket real, pero dentro de
  jsdom. No se ve la pantalla, el indicador ni el diseño.
- **No es una prueba con dos personas.** «Dos sesiones» son dos `QueryClient` independientes en el
  mismo proceso. La prueba visual con dos navegadores sigue pendiente.
- **La identidad no se prueba:** Auction corre con `AUTH_MODE=disabled`, así que todas las
  conexiones comparten el mismo usuario (el límite de 3 por usuario sigue aplicando). Con JWT real
  habría que usar una cuenta y un `user pool` de Cognito.
- No hay TLS ni balanceador delante: es el sitio interno `:8080` de Caddy.
