# Integración de E-commerce con Catalog canónico

Refs Nexus-Battle-VI/Nexus-Battle-Management#30
Refs Nexus-Battle-VI/Nexus-Battle-Management#31
Refs Nexus-Battle-VI/Nexus-Battle-Management#32
Refs Nexus-Battle-VI/Nexus-Battle-Management#33
Refs Nexus-Battle-VI/Nexus-Battle-Management#35

## Entrada y contratos

`/ecommerce` monta CommercePage dentro del guard de sesión. `/orders` redirige mediante React Router, sin recargar ni perder el token en memoria.

La vitrina consume `GET /api/v1/catalog/products` con `query,type,minPrice,maxPrice,currency,page`. La respuesta es `{items,page,pageSize:16,total}`. Catalog ejecuta búsqueda, filtros AND y paginación: Web no vuelve a filtrar los resultados. El detalle consume `GET /api/v1/catalog/products/:reference`.

Los tipos canónicos son HEROE, HABILIDAD, ARMA, ARMADURA, ITEM y EPICA. Se muestran descripción, atributos, imagen, créditos enteros y, cuando existe, dinero real. Los filtros de precio están expresados en unidades menores y requieren COP, USD o EUR. El selector es una selección explícita de moneda, no geolocalización ni conversión.

Se envía `productId` en nuevas líneas del carrito. Las modificaciones y eliminaciones usan `productId ?? sku` para poder leer registros heredados. Commerce devuelve nombre/imagen y precios autoritativos; Web nunca envía precios. Al cambiar de moneda con carrito vacío se solicita abrirlo en la nueva moneda; con productos existentes se indica la moneda vigente.

Cada referencia visible se consulta mediante `GET /api/wishlist/:productId`, incluida la que no esté en deseos. Así adquirido no depende de estar en la lista. Las escrituras mantienen POST/DELETE de la misma ruta; la identidad se obtiene del token.

## Sesión y guardado

Cada identidad monta su propio QueryClient. Al salir se cancelan consultas, se elimina la caché y se desmontan los consumidores; respuestas tardías no se comparten con la siguiente identidad. Las claves privadas de Commerce incluyen subject. Los tokens siguen en memoria.

HU61 mantiene guardado explícito y recuperación desde el servicio mediante las rutas `/orders/cart/persistence` y `/orders/cart/persistence/restoration`. No se inventan carritos múltiples, fusión automática ni almacenamiento de tokens. La verificación de persistencia entre sesiones y reinicios requiere el adaptador durable del backend.

## Pago simulado

El resumen lleva version. Web envía expectedVersion con los cuatro campos requeridos y valida únicamente presencia, conforme HU59. El servicio mantiene autoridad de validación y coordinación.

Una respuesta PROCESSING se muestra como pendiente. Web consulta `GET /api/orders/:id/payment` hasta COMPLETED y no vuelve a enviar POST automáticamente. `GET /api/orders/:id/checkout` permite reconocer un pedido PROCESSING/CONFIRMED. Un error HTTP de cliente detiene la consulta periódica del recibo.

Las modificaciones del carrito invalidan el resumen; mientras este se actualiza no se permite confirmar. El resultado está ligado al pedido, el formulario se desmonta al cerrar y una segunda compra comienza con estado nuevo. Tras el éxito se refrescan carrito, deseos y consultas del inventario. Los cuatro datos de tarjeta no se guardan en mutation.variables, localStorage ni registro.

## Imágenes

Las URLs de la propia API se descargan con el cliente HTTP y Bearer en cabecera. La UI presenta un Blob y revoca su URL al desmontarse. No hay tokens en query strings. Las imágenes externas se cargan directamente, sin enviarles credenciales de la aplicación.

El despliegue debe permitir la lectura CORS del destino S3 tras la redirección307. Si existe CSP, img-src necesita blob:. Un fallo de imagen deja una alternativa accesible y no oculta el resto del producto.

## Alcance pendiente de decisiones o de integración

- HU57 CA03: el usuario confirmó que la moneda debe proceder del país/región del perfil. El selector manual de este primer incremento es transitorio y no cumple todavía esa decisión; se debe conectar al contrato de Account sin inventar conversión de divisas.
- HU57 CA04 y CA10: Catalog aún no publica promociones. No se inventan descuentos ni un filtro que no tenga efecto.
- HU59: la entrega única de inventario, recuperación durable y consistencia de compra se verifican en los servicios y en una prueba integrada real.
- HU60: el correo corresponde a Commerce/Notifications. Una pantalla de éxito no demuestra entrega del correo.
- HU61: pruebas de interfaz y aislamiento de caché no sustituyen una autenticación nueva ni un reinicio del servidor.
- RNF07: la rejilla se adapta mediante auto-fit/minmax por necesidad de alojar tarjetas legibles; la comprobación visual a1360×768 y en Chrome/Edge/Firefox debe registrarse con el entorno integrado.

## Verificación de esta entrega

Se ejecutaron npm ci y la suite completa:620 pruebas en77 archivos, cobertura statements88.42%, branches82.38%, functions85.86%, lines88.35%. Se añadieron pruebas de contrato HTTP de vitrina/detalle, adquirido fuera de wishlist, recorrido carrito→cantidad→resumen→pago, expectedVersion, segunda compra, PROCESSING sin repago, imágenes autenticadas y aislamiento A/B con cancelación de respuestas tardías.

Las pruebas sustituyen fetch con respuestas controladas; no se presentan como compras verificadas en producción. Lint, formato, tipos y build pasaron, además de las regresiones focales posteriores para checkout, detalle e imágenes. No se modifican guías históricas de otras entregas para reinterpretar su evidencia.
