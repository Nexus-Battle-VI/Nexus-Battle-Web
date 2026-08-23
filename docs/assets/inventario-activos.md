# Inventario de activos

Fuente de verdad versionada de los activos visuales y multimedia externos utilizados por
`Nexus-Battle-Web`.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#245`
Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#246`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#203`

El modelo de datos, los valores controlados y el procedimiento de registro están definidos en
[`docs/assets/README.md`](./README.md). Toda entrada añadida a este documento debe seguir ese
procedimiento.

## Estado actual

La auditoría técnica realizada para `EN-021.1` no encontró activos externos reales incorporados
actualmente en `Nexus-Battle-Web` que requieran registro. Por ese motivo, el inventario se deja
publicado y versionado, listo para recibir entradas, sin filas de datos.

`EN-021.2` (`Refs Nexus-Battle-VI/Nexus-Battle-Management#246`) amplió la auditoría a la página
`02 — Foundations` del Design System en Figma e identificó dos fundamentos externos propuestos allí:
la familia tipográfica `Inter` y la librería de iconos `Lucide`. Ninguno de los dos está incorporado
actualmente al código de `Nexus-Battle-Web`: la tipografía en uso sigue siendo la del sistema
operativo (`system-ui, -apple-system, 'Segoe UI', sans-serif`) y el proyecto no tiene instalada
ninguna librería de iconos. Por ese motivo, `Inter` y `Lucide` no generan una entrada en este
inventario en este momento. Si cualquiera de los dos se incorpora al producto en el futuro, debe
registrarse siguiendo el procedimiento de `docs/assets/README.md`, con evidencia verificable del
mecanismo de distribución elegido y de su licencia aplicable en ese momento. Los tokens propios del
Design System (color, spacing, radios, tipografía como escala, elevaciones) son decisiones de diseño
expresadas como configuración y no se tratan como activos externos únicamente por estar definidos en
Figma.

## Inventario

| id  | nombre | tipo | fuente_origen | autor_proveedor | licencia_o_autorizacion | url_referencia | requiere_atribucion | texto_atribucion | estado_verificacion | evidencia | bounded_context_o_feature | fecha_registro | observaciones |
| --- | ------ | ---- | ------------- | --------------- | ----------------------- | -------------- | ------------------- | ---------------- | ------------------- | --------- | ------------------------- | -------------- | ------------- |

Sin registros. Cada nuevo recurso externo incorporado al producto debe añadirse a esta tabla
siguiendo el modelo de datos y el procedimiento descritos en `docs/assets/README.md`, en el mismo
Pull Request que incorpora o modifica el recurso.
