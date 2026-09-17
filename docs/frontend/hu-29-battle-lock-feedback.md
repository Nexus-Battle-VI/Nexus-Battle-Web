# HU-29 — Feedback de bloqueo de equipamiento durante el combate

## Alcance

La Web interpreta el rechazo estable que publica Player/Inventory al intentar
mutar el equipamiento de un héroe durante una batalla activa:

```json
{
  "reason": "battle_lock",
  "message": "No se puede modificar el equipamiento porque el héroe participa en una batalla activa."
}
```

La respuesta usa HTTP `409`. Solo la combinación `409 + battle_lock` se
presenta como bloqueo de HU-29; otros conflictos de HU-28, por ejemplo una
ranura ocupada, conservan su tratamiento normal.

## Responsabilidades

### Player/Inventory

- conoce si la operación fue rechazada por `battle_lock`;
- no aplica la mutación;
- publica el mensaje explicativo;
- devuelve el loadout actualizado únicamente cuando la operación termina con
  éxito.

### Web

- envía la misma operación de equipamiento de HU-28;
- no actualiza el loadout de forma optimista;
- muestra el mensaje recibido y aclara que el equipo visible se conservó;
- no calcula si existe una batalla activa;
- no implementa ni simula el ciclo de vida de la batalla.

## Flujo verificable

| Estado publicado por backend     | Respuesta            | Resultado visible                               |
| -------------------------------- | -------------------- | ----------------------------------------------- |
| Batalla activa                   | `409`, `battle_lock` | Mensaje explicativo y equipamiento intacto      |
| Batalla finalizada / sin batalla | Éxito de HU-28       | La respuesta reemplaza el equipamiento en caché |
| Otro conflicto de HU-28          | Error HTTP normal    | Se conserva el mensaje específico del servicio  |

La vista `/__dev/hu29/equipment-lock` monta `HeroConfigurator`, el componente de
producción, e intercepta únicamente su frontera HTTP para reproducir las dos
respuestas. Vite elimina esta ruta y sus fixtures de la compilación productiva.

## Diseño y Figma

El archivo Figma Make `Cumplir reglas de negocio` fue consultado mediante el
conector de Figma. Su manifiesto corresponde a la demostración de Poder de
HU-11 y no define una pantalla de HU-29. Además, los recursos internos del Make
no estuvieron disponibles como código legible sin una sesión interactiva.

Por eso HU-29 no copia una maqueta ajena a su alcance. El feedback se integró en
la pantalla real de equipamiento de HU-28 y reutiliza el sistema visual del
repositorio: colores semánticos, tipografía, bordes, `Card`, `Button`,
`HeroConfigurator` y el héroe 3D existente. No se añadieron imágenes ni iconos
inventados; el candado proviene de la dependencia de iconos ya usada por Web.

## Dependencias y límites

- HU-29 continúa bloqueada productivamente por HU-14, que debe publicar el
  inicio y fin reales de una batalla.
- El PR backend de HU-29 permanece en borrador mientras esa señal no exista.
- Esta integración no crea una pantalla de combate, no bloquea el botón por
  anticipado y no modifica las reglas 2/6/2 de HU-28.
- HU-31 no se toca: sus efectos épicos no son posiciones de equipamiento ni
  cambian el contrato `battle_lock`.

Trazabilidad: `RF-29` → Management `#76` → Player/Inventory PR `#26` → feedback
Web y pruebas de conservación del estado.
