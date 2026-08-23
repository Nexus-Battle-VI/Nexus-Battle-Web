# Inventario de activos

Fuente de verdad versionada de los activos visuales y multimedia externos utilizados por
`Nexus-Battle-Web`.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#245`
Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#246`
Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#248`
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

`EN-021.4` (`Refs Nexus-Battle-VI/Nexus-Battle-Management#248`) consolidó la página `05 — Assets`
del Design System como biblioteca controlada, incluyendo un catálogo de 71 Icon Masters de `Lucide`
organizados en 7 familias semánticas y la corrección de su estado documental para distinguir
`Design System: IMPLEMENTED / IN REVIEW` de `Nexus-Battle-Web: NOT IMPLEMENTED`. Esa consolidación
no incorpora ningún recurso nuevo al código de `Nexus-Battle-Web`: `Inter` y `Lucide` continúan sin
uso real en el producto, por lo que ninguno de los dos genera todavía una entrada en este
inventario. El equipo confirmó que todo el frontend de `Nexus Battles VI` se implementa
exclusivamente en este repositorio; cuando `Inter`, `Lucide` u otro recurso de `05 — Assets` se
incorpore realmente al código, deberá registrarse en el mismo incremento o Pull Request que realice
dicha incorporación, mediante una Task separada dentro del Enabler `EN-021`.

## Inventario

| id  | nombre | tipo | fuente_origen | autor_proveedor | licencia_o_autorizacion | url_referencia | requiere_atribucion | texto_atribucion | estado_verificacion | evidencia | bounded_context_o_feature | fecha_registro | observaciones |
| --- | ------ | ---- | ------------- | --------------- | ----------------------- | -------------- | ------------------- | ---------------- | ------------------- | --------- | ------------------------- | -------------- | ------------- |

Sin registros. Cada nuevo recurso externo incorporado al producto debe añadirse a esta tabla
siguiendo el modelo de datos y el procedimiento descritos en `docs/assets/README.md`, en el mismo
Pull Request que incorpora o modifica el recurso.
