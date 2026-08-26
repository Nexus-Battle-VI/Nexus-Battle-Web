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

# Las variables `VITE_` se resuelven al COMPILAR, no al arrancar: acaban dentro
# del paquete servido al navegador. Por eso llegan como argumentos de
# construccion y no como `environment` del contenedor, donde no harian nada.
#
# Ninguna es un secreto. El cliente de Cognito se registra SIN secreto de
# cliente, porque uno embebido en el paquete servido al navegador es publico
# por definicion, y por eso el flujo es codigo de autorizacion con PKCE.
#
# Vacias por defecto, que es el estado de hoy: la aplicacion opera sin
# autenticacion y LO DICE en la cabecera, en lugar de simular una sesion.
ARG VITE_API_BASE_URL=""
ARG VITE_COGNITO_DOMAIN=""
ARG VITE_COGNITO_CLIENT_ID=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_COGNITO_DOMAIN=$VITE_COGNITO_DOMAIN \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID

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
