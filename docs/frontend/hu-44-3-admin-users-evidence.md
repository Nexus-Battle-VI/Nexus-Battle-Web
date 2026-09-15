# HU-44.3 / HU-44.5 — Evidencia del panel administrativo de usuarios

Trazabilidad:

- HU: `Nexus-Battle-VI/Nexus-Battle-Management#38`
- Implementación Web: `Nexus-Battle-VI/Nexus-Battle-Management#121`
- Verificación relacionada: `Nexus-Battle-VI/Nexus-Battle-Management#127`

## Alcance verificado

El panel productivo conserva una sola fuente de criterios aplicados para la consulta y la
exportación. Los filtros de fecha de registro e historial de sanciones están habilitados y se
combinan con búsqueda, rol y estado.

Contrato enviado a Account:

```text
GET /api/accounts
GET /api/accounts/export

search field: id | email | firstNames | nickname
role
status
hasSanctionHistory=true|false
registeredFrom=YYYY-MM-DDT00:00:00.000Z
registeredTo=YYYY-MM-DDT23:59:59.999Z
```

Los límites de fecha son inclusivos, opcionales y llevan zona UTC explícita. Si `Desde > Hasta`,
Web muestra `La fecha Desde no puede ser posterior a la fecha Hasta.` y no inicia una nueva
consulta. `Cualquiera` omite `hasSanctionHistory`; las otras dos opciones envían los booleanos
`true` y `false` respectivamente.

## Evidencia automatizada reproducible

```bash
npm run test -- src/features/account/admin-users/AdminUsersSection.test.tsx \
  src/features/account/admin-users/api.test.ts
npm run test
npm run test:coverage
```

Las pruebas específicas ejercitan controles habilitados, límites `Desde`/`Hasta` por separado y
juntos, rango invertido, los tres estados del filtro de sanciones, combinación simultánea con los
filtros existentes, limpieza, estado vacío, errores seguros y paridad entre consulta y exportación.
Las pruebas de `AccountPage` y de las guardas verifican acceso para `ADMINISTRATOR` y
`SUPER_ADMINISTRATOR`, y denegación para roles no autorizados sin consultar el endpoint
administrativo.

Resultado de esta ejecución (2026-09-09):

| Verificación                       | Resultado    |
| ---------------------------------- | ------------ |
| Pruebas específicas de admin-users | 21/21 PASS   |
| Suite completa                     | 843/843 PASS |
| Statements                         | 87.17 %      |
| Branches                           | 81.55 %      |
| Functions                          | 85.68 %      |
| Lines                              | 87.38 %      |
| `npm run lint`                     | PASS         |
| `npm run format:check`             | PASS         |
| `npm run typecheck`                | PASS         |
| `npm run build`                    | PASS         |
| `git diff --check`                 | PASS         |

## Evidencia de interfaz reproducible

La evidencia de interfaz de HU-44 se basa en pruebas automatizadas de componentes y rutas. No
requiere capturas de pantalla ni declara inspección manual en navegador.

```bash
npm run test -- src/features/account/admin-users/AdminUsersSection.test.tsx
npm run test -- src/features/account/AccountPage.test.tsx \
  src/app/RequireAdministrator.test.tsx
```

`AdminUsersSection.test.tsx` renderiza el componente productivo mediante React Testing Library y
verifica su comportamiento observable usando roles, etiquetas y mensajes accesibles:

- `Desde`, `Hasta` e `Historial de sanciones` existen y están habilitados;
- fecha inicial, fecha final y ambas fechas generan los límites UTC aprobados;
- un rango invertido muestra un error accesible y no ejecuta otra consulta;
- `Con sanciones`, `Sin sanciones` y `Cualquiera` producen `true`, `false` y omisión;
- fecha y sanciones se combinan con búsqueda, rol y estado en una única petición;
- limpiar filtros restaura los controles y vuelve a aplicar criterios vacíos;
- la exportación recibe exactamente el mismo objeto de criterios aplicado a la consulta visible;
- loading, contenido, ausencia de resultados y errores seguros son estados diferenciados.

`api.test.ts` verifica la serialización determinista y codificada de la query para
`/api/accounts` y `/api/accounts/export`. Las pruebas de `AccountPage` y
`RequireAdministrator` verifican que Administrator y Super Administrator acceden al panel, mientras
Player y Moderator no obtienen la funcionalidad administrativa ni provocan la consulta protegida.

Esta evidencia ejercita la interfaz real en jsdom y el límite real de `fetch`; no sustituye el
cliente API por un mock y, por tanto, incluye la construcción observable de las URLs.

Si el texto literal de Management exigiera una captura como artefacto obligatorio, esa captura
quedaría pendiente exclusivamente como requisito documental externo. No sería un defecto funcional
de Web ni invalidaría las pruebas automatizadas registradas aquí.

## Matriz CA-01 a CA-06

El entorno no pudo leer el texto literal de las Issues privadas de Management (no hay `gh` ni
credenciales disponibles). La siguiente matriz conserva los identificadores solicitados y relaciona
los ejes funcionales descritos en el encargo; antes de cerrar la HU, el Developer debe cotejar los
nombres literales de cada CA en Management.

| CA    | Evidencia automatizada disponible en Web                                                                                  | Estado técnico Web |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| CA-01 | Búsqueda por los campos soportados; prueba de query real y separación draft/applied                                       | PASS               |
| CA-02 | Rol, estado, fecha inclusiva UTC e historial de sanciones combinables mediante AND                                        | PASS               |
| CA-03 | Estadísticas devueltas por Account, sin recalcularlas en Web                                                              | PASS               |
| CA-04 | Exportación con el mismo objeto `appliedCriteria` y la misma serialización                                                | PASS               |
| CA-05 | Estados loading, contenido, vacío y error seguro verificados con pruebas de componente                                    | PASS               |
| CA-06 | Administrator y Super Administrator admitidos; Player y Moderator denegados en la ruta Web; Account conserva la autoridad | PASS               |

CA-01 a CA-06 quedan cubiertos por pruebas automatizadas del frontend. La matriz no atribuye a Web
la autorización definitiva: Account continúa siendo la autoridad y valida el testimonio en cada
operación protegida.

## Veredicto

La implementación, la evidencia automatizada y los gates técnicos de Web están completos. No existe
un defecto funcional conocido ni una necesidad técnica de incorporar capturas al repositorio.

No fue posible consultar el texto literal de las Issues privadas de Management desde este entorno.
Si allí se exige expresamente una captura como artefacto obligatorio, quedaría pendiente documental
externo; con los requisitos proporcionados para esta validación, no existe esa condición.

**Veredicto A: HU-44 lista para PR final sin capturas.**
