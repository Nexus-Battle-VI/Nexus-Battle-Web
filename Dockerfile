# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Etapa 1 — compilacion de los estaticos
# ---------------------------------------------------------------------------
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
# `public` contiene los activos estaticos que Vite copia sin procesar.
COPY public ./public

RUN npm run build

# ---------------------------------------------------------------------------
# Etapa 2 — servidor estatico
# ---------------------------------------------------------------------------
# La aplicacion es un conjunto de ficheros estaticos: no necesita Node en
# ejecucion. Servirlos con Caddy elimina el runtime de JavaScript de la imagen
# final y reduce tanto su tamano como su superficie de ataque.
FROM caddy:2-alpine AS runtime

# La imagen oficial de Caddy corre como root y **no** define un usuario sin
# privilegios: hay que crearlo. Caddy escucha en 8080, que es un puerto no
# privilegiado, asi que no necesita root para enlazarlo.
RUN addgroup -g 1000 -S web \
  && adduser -u 1000 -S -G web -H -s /sbin/nologin web \
  && mkdir -p /data /config \
  && chown -R web:web /data /config

COPY --from=build --chown=web:web /app/dist /srv
COPY --chown=web:web Caddyfile /etc/caddy/Caddyfile

USER web

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/health || exit 1
