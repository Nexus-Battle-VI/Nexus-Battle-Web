# HU-13 — Chat del lobby y de la sala (interfaz)

Trazabilidad: `RF-13` → Management `#22` → `ChatPanel`.

La HU pide chat «en el lobby y en la sala de batalla activa», entregado en tiempo real, sin mezclar
salas, procesado una sola vez y sin pérdida. Este documento describe la parte de interfaz. Las reglas
(quién puede leer y escribir, longitud, frecuencia, retención) son de **Combat**; el protocolo está en
[`docs/contracts/hu-13-chat-v1.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Infrastructure/blob/develop/docs/contracts/hu-13-chat-v1.md)
de Infrastructure y el detalle del servidor en
[`docs/hu-13-chat.md`](https://github.com/Nexus-Battle-VI/Nexus-Battle-Combat/blob/develop/docs/hu-13-chat.md)
de Combat.

## Qué hay

| Pieza              | Dónde                                                   | Qué hace                                                                                                  |
| ------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `ChatPanel`        | `src/features/battle-rooms/ChatPanel.tsx`               | Panel accesible: registro de mensajes, campo, envío, estados y errores                                    |
| `useChat`          | `src/features/battle-rooms/useChat.ts`                  | Abre una sesión mientras el panel está montado y la cierra al desmontarlo o al cambiar de canal           |
| `ChatSession`      | `src/features/battle-rooms/ChatSession.ts`              | Estado y ciclo de vida de la suscripción de UN canal, sobre la conexión compartida de HU-17               |
| `chatState`        | `src/features/battle-rooms/chatState.ts`                | Reductor puro: orden por `seq`, duplicados, huecos, pendientes, rechazos y expulsión                      |
| `chatProtocol`     | `src/features/battle-rooms/chatProtocol.ts`             | Valida lo que llega del servidor y arma lo que se envía                                                   |
| `chatDescriptions` | `src/features/battle-rooms/chatDescriptions.ts`         | Traduce los códigos de rechazo a castellano                                                               |
| `BattleWithChat`   | `src/features/battle-rooms/BattleWithChat.tsx`          | Compone la ruta de batalla (HU-17) con el chat de su sala, sin tocar `BattlePage`                         |
| Vista previa       | `src/features/battle-rooms/dev/ChatPanelDevPreview.tsx` | Solo desarrollo, en `/__dev/hu13/chat`: el panel real contra un servidor **falso** que habla el protocolo |

## Dónde aparece el chat

- **Lobby** (`/play`): un canal global, para quien tenga sesión.
- **Sala de espera** (`/play/rooms/:roomId`): para los participantes de esa sala.
- **Batalla** (`/play/rooms/:roomId/battle`): cuando la sala se llena, HU-17 lleva a la persona a la
  pantalla de batalla; el chat de la sala sigue debajo (Combat lo mantiene abierto en `PREPARING` e
  `IN_BATTLE`).

Los ficheros del chat viven **planos** en `features/battle-rooms`, con prefijo `chat` los de nombre
genérico: el linter del repositorio no admite imports entre carpetas hermanas y una feature no importa
de otra feature.

## Principios

- **La interfaz no decide el acceso.** Combat dice quién es participante y si la sala admite chat; el
  panel solo explica lo que el servidor responde (sala cancelada, no participante, sesión vencida).
- **No maneja credenciales.** La conexión es la compartida de HU-17 (`openRealtimeConnection`): pide un
  ticket de un solo uso por HTTP, lo envía como primer mensaje del socket y espera `auth.ok`. El chat
  se suscribe solo entonces. El JWT y el ticket nunca llegan a la URL ni a la pantalla (hay una prueba).
- **El texto se pinta como texto.** Nunca como HTML: Combat lo guarda y lo envía sin escapar.
- **Un mensaje se envía una sola vez.** Cada envío lleva un `commandId`; «Reintentar» reenvía con el
  **mismo** `commandId` y Combat deduplica. Tras una caída, lo pendiente se reenvía igual.
- **Recuperación sin huecos.** El cliente recuerda el último `seq` aplicado; al reconectar o ante un
  salto pide el historial desde ahí. Aplica solo `seq` mayor que el último; uno repetido se ignora.

## Estados que se ven

Conectando · reconectando · sin sesión («Inicia sesión para usar el chat») · sin mensajes · con
mensajes · mensaje pendiente («Enviando…») · rechazo con «Reintentar» y «Descartar» (frecuencia,
longitud, caracteres no admitidos, chat no disponible) · canal cerrado por el servidor.

La longitud de 500 caracteres del campo es una **pista**: el límite autoritativo es el de Combat.

## Accesibilidad

- El registro de mensajes es un `role="log"` con `aria-live="polite"` y nombre propio por canal.
- El campo tiene etiqueta y `autocomplete="off"`; «Enviar» y el campo se deshabilitan sin sesión o con
  el canal cerrado, y «Enviar» también con el campo vacío o solo con espacios.
- Los rechazos se anuncian en un `role="alert"`; los estados de conexión, en un `role="status"`.

## Limitaciones conocidas

- **Dos conexiones por pantalla de sala:** la de la batalla y la del chat, cada una con su ticket.
- **El panel se vuelve a montar** cuando la sala pasa de espera a batalla (cambia de ruta): recupera el
  historial reciente del servidor.
- **La marca «(tú)» solo existe para lo enviado desde esta pestaña:** tras recargar, los propios mensajes
  se ven sin la marca (el servidor no envía el identificador de cuenta del remitente).
- **Orden de despliegue: Combat primero.** Una Web con chat contra un Combat sin él recibe un cierre
  `4400` tras cada suscripción y reintenta cada ~1 s, pidiendo un ticket cada vez.
- **Sin verificar contra un Combat real** ni en un navegador contra Combat: las pruebas usan un socket
  falso y la vista previa un servidor falso. No es evidencia de extremo a extremo.
