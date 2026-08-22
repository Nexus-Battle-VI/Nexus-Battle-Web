# Política de seguridad

## Alcance

Esta política cubre el código de `Nexus-Battle-Web`. Nexus Battles VI es un producto académico en desarrollo: no existe todavía una versión en producción con datos reales de usuarios.

## Versiones soportadas

| Versión | Estado                                                 |
| ------- | ------------------------------------------------------ |
| `0.1.x` | En desarrollo activo. Recibe correcciones de seguridad |

## Reporte de vulnerabilidades

Las vulnerabilidades **no se reportan mediante Issues públicas ni Pull Requests**.

Se utiliza el reporte privado de vulnerabilidades de GitHub, disponible en la pestaña _Security_ de este repositorio. Un reporte útil incluye:

- Componente afectado y versión o commit.
- Descripción del problema y su impacto.
- Pasos reproducibles.
- Configuración necesaria para reproducirlo.

El equipo propietario acusa recibo y coordina la corrección junto con los Scrum Masters. La divulgación se realiza después de que la corrección esté integrada.

## Controles activos en el repositorio

- Grafo de dependencias y alertas de Dependabot.
- Actualizaciones de seguridad de dependencias agrupadas y programadas.
- Escaneo de secretos con protección de subida.
- Análisis estático de código con CodeQL.
- Revisión obligatoria del Code Owner antes de integrar en `main`.
- Historial lineal y prohibición de forzar la subida o eliminar `main`.
- Permisos de solo lectura por defecto para el token de los workflows.
- Acciones de terceros fijadas por SHA de commit completo.
- Aprobación requerida para ejecutar workflows de contribuciones externas.

## Manejo de secretos

- No se incorporan secretos, credenciales, tokens ni claves al repositorio.
- La configuración sensible se entrega por variables de entorno. `.env` está ignorado por Git; `.env.example` documenta las variables sin valores reales.
- La imagen de contenedor no incluye archivos de entorno ni credenciales.
- No se utilizan claves de acceso de larga duración de AWS. Cuando se habilite el despliegue, la autenticación usará OIDC con credenciales de corta duración.
- La evidencia enlazada desde las Issues no debe contener secretos.

## Consideraciones específicas de una aplicación de navegador

- **Todo lo que se envía al navegador es público.** Cualquier variable con prefijo `VITE_` acaba en el paquete servido al cliente. En este repositorio no se declara ningún secreto, clave de API ni credencial, y no debe declararse.
- **No hay autenticación real.** `useSession` guarda una identidad no verificada para que la interfaz pueda operar. Se mantiene en memoria de forma deliberada: persistirla en `localStorage` daría apariencia de una sesión que no existe.
- Las reglas de negocio no se duplican en la interfaz. Una comprobación en el cliente es una ayuda para quien usa la aplicación, nunca un control de seguridad: el servicio debe rechazar igualmente la petición.
- El cliente HTTP es la única puerta de salida. Concentrar las peticiones evita que una pantalla construya una URL a mano y termine hablando con un origen inesperado.
- La imagen de producción sirve estáticos con Caddy y **no incluye runtime de Node**, lo que reduce la superficie de ataque. Se envían las cabeceras `X-Content-Type-Options`, `Referrer-Policy` y `X-Frame-Options`.
- La aplicación no almacena datos personales en el navegador.

## Identidad

Esta aplicación no autentica. La identidad proviene del contexto Account, cuya integración con un proveedor autorizado permanece pendiente de aprobación. Hasta que se resuelva, la interfaz opera con una identidad declarada y no verificada, y así se documenta en el README. Ver `docs/adr/ADR-004-identity-directory.md` en Nexus-Battle-Infrastructure.
