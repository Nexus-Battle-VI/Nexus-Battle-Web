# Changelog / Registro de Cambios — HU-68

## TASK 68.5 — Interfaz y aceptación

- Se sustituyó el marcador de la ruta `/auction` por la lista de seguimiento real.
- El jugador puede seguir una subasta por identificador, revisar sus datos y dejar de seguirla.
- Se implementaron estados de carga, vacío y error, incluidos duplicados y subastas no disponibles.
- Se añadieron los tipos visuales `AUCTION_CHANGED` y `AUCTION_CLOSING_SOON` al historial de notificaciones.
- Se añadieron pruebas de aceptación del flujo de alta, listado, baja y manejo de errores.
