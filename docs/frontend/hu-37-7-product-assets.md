# HU-37.7 — Carga de imagen principal de Producto

## Alcance implementado

La creación administrativa de Productos no acepta una URL escrita por la
persona usuaria. En su lugar, el paso **Datos básicos** permite seleccionar una
imagen JPG, PNG o WEBP de hasta 5 MiB y conserva en el borrador únicamente la
URL canónica emitida por Catalog.

## Flujo

1. Web valida el MIME y el tamaño, calcula SHA-256 y solicita `POST
/api/v1/admin/product-assets/uploads`.
2. Copia, sin reinterpretar ni registrar, todos los campos de la política
   firmada en un `FormData`, añade el archivo como `file` y publica directamente
   a la URL temporal de S3. No recibe ni almacena credenciales AWS.
3. Web llama `POST /api/v1/admin/product-assets/{assetId}/finalization`.
   Catalog valida el contenido y devuelve el asset `READY` con su `imageUrl`
   estable.
4. La petición `POST /api/v1/catalog/products` usa exclusivamente esa URL.

Catalog sigue siendo el owner de autorización, validación de bytes, promoción,
asociación y borrado de assets. Web solo transfiere el archivo y refleja el
resultado; por eso no registra el formulario firmado, la URL temporal, el JWT
ni el binario.

El contrato completo y los controles de infraestructura están en
[`catalog-product-assets-v1.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/catalog-product-assets-v1.md)
y ADR-016 de Infrastructure.

## Pruebas

`product-assets.test.ts` verifica que se transmiten los campos firmados sin
alterarlos, que se finaliza el asset y que los tipos o tamaños no admitidos no
solicitan una intención. `CreateProductPage.test.tsx` verifica que la URL
canónica final es la que viaja al crear el Producto.
