# Inventario de activos y licencias

Este documento define el proceso, el modelo de datos y las reglas de evidencia para registrar los
activos visuales y multimedia externos utilizados por `Nexus-Battle-Web`.

Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#245`
Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#203`

## Propósito

`EN-021 — Propiedad intelectual y licenciamiento de recursos` (`Nexus-Battle-VI/Nexus-Battle-Management#203`)
exige un mecanismo verificable para seleccionar, registrar y utilizar recursos externos únicamente
cuando sean propios, libres, autorizados o tengan una licencia compatible con el proyecto, y para
conservar evidencia de procedencia, licencia o autorización y atribución cuando corresponda.

`EN-021.1 — Definir y versionar el inventario de activos y licencias`
(`Nexus-Battle-VI/Nexus-Battle-Management#245`) es la Task que deja disponible ese mecanismo en
`Nexus-Battle-Web`: un inventario versionado en el que cada recurso visual o multimedia externo
queda registrado antes de considerarse apto para su uso en el producto.

Este documento también da soporte a `RNF-21`, el requisito no funcional de trazabilidad de
propiedad intelectual del que `EN-021` se deriva.

## Alcance

Debe registrarse en el inventario todo recurso externo de los siguientes tipos que se incorpore al
producto:

- imagen
- icono
- tipografía
- logo
- ilustración
- sonido
- otro recurso visual o multimedia externo

Se considera "externo" un recurso que no fue creado directamente como código o como texto por el
equipo del proyecto: un archivo binario incorporado al repositorio, una fuente descargada o servida
desde un proveedor externo, o un recurso proporcionado por un tercero (incluido el Design System).

No requiere una entrada en el inventario:

- Colores u otros tokens de diseño declarados como valores CSS propios (por ejemplo, los definidos
  en `src/index.css` mediante `@theme`), porque son valores numéricos generados por el equipo y no
  tienen una procedencia externa que licenciar.
- Fuentes del sistema operativo referenciadas por nombre en `font-family` (por ejemplo `system-ui`),
  porque no se descargan ni se redistribuyen: las provee el dispositivo de quien usa la aplicación.
- Elementos generados únicamente con CSS o código (formas, gradientes, transiciones) sin un archivo
  ni una fuente externa de origen.

Los activos visuales o multimedia propios del proyecto que existan como recursos identificables y
reutilizables —por ejemplo imágenes, logos, ilustraciones, iconos u otros archivos equivalentes— sí
deben registrarse en el inventario cuando corresponda, aunque su autoría sea interna. Para dichos
activos debe registrarse su procedencia real, la autoría interna y la evidencia que demuestre que el
proyecto tiene derecho a utilizarlos.

## Principio de evidencia

Una disponibilidad pública no equivale a una autorización de uso. El hecho de que un recurso pueda
descargarse o copiarse libremente desde internet no implica que su licencia permita su uso en
`Nexus Battles VI`.

Nunca se asigna una licencia por suposición. Si no existe evidencia documental concluyente sobre la
licencia o autorización de un recurso, dicho recurso permanece con `estado_verificacion` en
`pendiente_de_verificacion` hasta que la evidencia exista.

Una licencia desconocida no se convierte en una licencia inventada. El estado de licenciamiento
declarado a nivel de repositorio, `Licensing pending project governance`, no autoriza a asignar
MIT, Apache, GPL, Creative Commons ni ninguna otra licencia por cuenta propia a un activo concreto.

## Fuente de verdad

`docs/assets/inventario-activos.md` es la fuente de verdad versionada del inventario de activos de
`Nexus-Battle-Web`. Cualquier recurso externo incorporado al producto debe tener una entrada en ese
documento antes de considerarse registrado.

## Modelo de datos

Campos aprobados para cada entrada del inventario:

### `id`

- Obligatorio.
- Identificador único, estable y en formato kebab-case.
- No se reutiliza para otro activo, ni siquiera después de retirar el original.

### `nombre`

- Obligatorio.
- Nombre legible que identifica el recurso para una persona que revise el inventario.

### `tipo`

- Obligatorio.
- Valor controlado. Ver "Valores controlados".

### `fuente_origen`

- Obligatorio.
- Identifica dónde se obtuvo el recurso (proveedor, repositorio, banco de recursos, autor directo).

### `autor_proveedor`

- Obligatorio.
- Autor o proveedor del recurso.
- Si no es determinable con evidencia, se declara como `desconocido`. Nunca se inventa un autor o
  proveedor para completar el campo.

### `licencia_o_autorizacion`

- Obligatorio conceptualmente: el campo siempre existe, aunque su valor pueda ser
  `pendiente_de_verificacion`.
- Solo se registra el nombre de una licencia o autorización concreta cuando existe evidencia
  documental que la respalde.
- No existe una enumeración cerrada de licencias válidas: ver "Regla de licencia y autorización".

### `url_referencia`

- Condicional.
- Se completa únicamente cuando existe una referencia real y verificable. Se deja vacío o como
  `no aplica` si no existe.

### `requiere_atribucion`

- Obligatorio.
- Valor controlado: `si`, `no`, `pendiente`.

### `texto_atribucion`

- Condicional.
- Obligatorio cuando `requiere_atribucion = si`. En cualquier otro caso puede quedar vacío.

### `estado_verificacion`

- Obligatorio.
- Valor controlado: `verificado`, `pendiente_de_verificacion`, `rechazado`.
- El valor por defecto al registrar una entrada sin evidencia concluyente es
  `pendiente_de_verificacion`.

### `evidencia`

- Obligatorio conceptualmente: el campo siempre existe, aunque su valor pueda ser `pendiente`
  mientras no exista evidencia concluyente.
- Referencia una fuente verificable de la licencia o autorización. No copia ni redistribuye el
  recurso ni el material protegido.

### `bounded_context_o_feature`

- Recomendado.
- Identifica en qué bounded context o feature de `Nexus-Battle-Web` se utiliza el activo (Account,
  Player-Inventory, Catalog, Community, Commerce, Notifications, o transversal).

### `fecha_registro`

- Recomendado.
- Formato ISO `YYYY-MM-DD`, correspondiente a la fecha en que se registra la entrada.

### `observaciones`

- Opcional.
- Restricciones de uso, vigencia, condiciones especiales o contexto adicional verificable.

## Valores controlados

`tipo`:

- `imagen`
- `icono`
- `tipografia`
- `logo`
- `ilustracion`
- `sonido`
- `otro`

`estado_verificacion`:

- `verificado`
- `pendiente_de_verificacion`
- `rechazado`

`requiere_atribucion`:

- `si`
- `no`
- `pendiente`

## Regla de licencia y autorización

No existe una enumeración cerrada de licencias específicas en este documento, porque el proyecto
declara actualmente `Licensing pending project governance` y porque la licencia aplicable a cada
activo depende de la evidencia real disponible para ese activo, no de una lista general.

El nombre real de una licencia o autorización se registra en `licencia_o_autorizacion` únicamente
cuando existe evidencia documental que lo respalda, referenciada desde el campo `evidencia`. Mientras
esa evidencia no exista, el campo permanece en `pendiente_de_verificacion`.

## Regla de atribución

`requiere_atribucion` documenta si el uso del recurso exige incluir una atribución visible:

- `si`: el recurso exige atribución. `texto_atribucion` es obligatorio y debe contener el texto de
  atribución exacto exigido por la licencia o autorización.
- `no`: el recurso no exige atribución, según evidencia verificada.
- `pendiente`: todavía no se ha verificado si el recurso exige atribución. Es el valor a utilizar
  mientras no exista evidencia concluyente sobre este punto.

## Evidencia

El campo `evidencia` debe guardar una referencia verificable a la licencia o autorización del
recurso, no necesariamente una copia del recurso protegido. Según el caso, puede representar:

- una URL pública estable que documente la licencia;
- una ruta a documentación permitida dentro de los repositorios del proyecto;
- una referencia a una autorización directa (por ejemplo, un identificador de correspondencia o de
  acuerdo con el autor o proveedor);
- una referencia documental equivalente;
- cualquier identificación verificable de la evidencia disponible.

El campo `evidencia` no debe almacenar:

- secretos, tokens ni credenciales;
- URLs privadas con parámetros de sesión u otra información sensible;
- contenido cuya licencia prohíba su redistribución.

## Procedimiento para registrar un activo

1. Detectar el activo que se incorporará o que ya está en uso sin registro.
2. Identificar su origen (`fuente_origen`).
3. Identificar su autor o proveedor (`autor_proveedor`), o declararlo `desconocido` si no es
   determinable.
4. Localizar evidencia real de la licencia o autorización (`evidencia`).
5. Determinar la licencia o autorización aplicable (`licencia_o_autorizacion`) únicamente si la
   evidencia lo permite; en caso contrario, dejarla en `pendiente_de_verificacion`.
6. Evaluar si el recurso exige atribución (`requiere_atribucion`) y, si corresponde, redactar
   `texto_atribucion`.
7. Registrar el activo en `docs/assets/inventario-activos.md` con todos los campos del modelo de
   datos.
8. Revisar la información registrada antes de abrir el Pull Request.
9. Incluir la actualización del inventario en el mismo Pull Request que incorpora o modifica el
   recurso, cuando sea aplicable.

## Procedimiento cuando la licencia no pueda verificarse

Si no es posible verificar la licencia o autorización de un recurso:

- No se inventa una licencia ni una autorización.
- No se marca la entrada como `verificado`.
- Se utiliza `estado_verificacion = pendiente_de_verificacion`.
- El hecho de que un recurso figure registrado en el inventario no implica que esté aprobado para
  su uso: mientras su `estado_verificacion` sea `pendiente_de_verificacion`, su uso no debe
  interpretarse como autorizado.

## Recurso rechazado

`estado_verificacion = rechazado` indica que, tras la revisión, se determinó que el recurso no
cuenta con una licencia o autorización compatible con el proyecto. Un recurso en estado `rechazado`
no debe introducirse ni mantenerse como recurso autorizado del producto; si ya estaba en uso, su
sustitución o retiro queda fuera del alcance de `EN-021.1` y corresponde a la Task o al proceso que
gestione esa corrección.

## Actualización del inventario

El inventario debe actualizarse cuando ocurra cualquiera de los siguientes eventos sobre un activo
ya registrado o sobre uno nuevo:

- incorporación de un nuevo recurso externo;
- sustitución de un recurso existente por otro;
- cambio en la procedencia del recurso;
- cambio en la licencia o autorización aplicable;
- cambio en la necesidad o el texto de atribución;
- retiro del recurso del producto;
- una auditoría posterior que descubra información nueva sobre un recurso ya registrado.

## Trazabilidad

Toda modificación de este documento o de `docs/assets/inventario-activos.md` debe poder trazarse
hacia:

- Task: `Refs Nexus-Battle-VI/Nexus-Battle-Management#245`
- Enabler: `Refs Nexus-Battle-VI/Nexus-Battle-Management#203`

Se utiliza siempre el nombre completo del repositorio al referenciar estos números, porque
`Nexus-Battle-Web` no es la fuente de verdad de las Issues y una referencia corta como `#245`
apuntaría a una Issue local inexistente o equivocada.

## Relación con fuentes externas

El Design System de `Nexus Battles VI` se administra externamente en Figma y ya fue construido y
congelado para la fase actual. Este documento no incorpora información sobre qué activos utiliza ese
Design System ni sobre su licenciamiento, porque esa evidencia no está disponible en este
repositorio.

La evidencia procedente de Figma o de cualquier otra fuente externa al repositorio deberá
incorporarse al inventario únicamente cuando haya sido obtenida y verificada formalmente, siguiendo
el mismo procedimiento y el mismo modelo de datos descritos en este documento.

## Estado actual

Según la auditoría técnica realizada para `EN-021.1`, `Nexus-Battle-Web` no contiene actualmente
activos visuales o multimedia externos identificados que requieran una entrada en el inventario:

- `public/` contiene únicamente `robots.txt`.
- No existen imágenes, archivos SVG, logos, audio ni video en el repositorio.
- No hay tipografías web ni declaraciones `@font-face`; la tipografía actual utiliza fuentes del
  sistema operativo.
- No hay librerías de iconos entre las dependencias del proyecto.
- Los colores declarados en `src/index.css` son valores de código propios del proyecto, no activos
  externos.
- `.gitattributes` declara tipos binarios (`*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.ico`, `*.pdf`)
  para anticipar su incorporación futura, pero esa declaración no implica que dichos activos existan
  actualmente en el repositorio.

Esto describe el estado presente del repositorio. No significa que el inventario deba permanecer
vacío en el futuro: cualquier recurso externo que se incorpore a partir de ahora debe registrarse
siguiendo este procedimiento antes de considerarse apto para su uso.
