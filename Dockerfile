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

COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

# La imagen base de Caddy expone el usuario sin privilegios `caddy`.
USER caddy

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/health || exit 1
