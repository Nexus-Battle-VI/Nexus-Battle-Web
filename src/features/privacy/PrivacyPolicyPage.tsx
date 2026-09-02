import { Link } from 'react-router'

import { Card } from '@/components/ui/Card'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

/**
 * Politica de Privacidad y Tratamiento de Datos Personales (EN-011, CA-01).
 *
 * Ruta publica, alcanzable con o sin sesion: no vive dentro de `RequireSession`
 * (excluiria a quien todavia no tiene cuenta, que es justo quien mas necesita
 * leerla antes de registrarse) ni dentro de `PublicOnlyRoute` (una persona ya
 * autenticada tambien puede querer consultarla).
 *
 * La Politica es un DOCUMENTO ESTATICO, no una entidad funcional del juego: el
 * texto vive aqui mismo, en JSX, tal como lo haria cualquier pagina de
 * contenido fijo. No existe ningun modelo de datos, catalogo ni version
 * "aplicable" gestionada en runtime -esa idea se evaluo y se descarto a
 * proposito-. La mencion a "version 0.3" mas abajo es solo el texto que trae
 * el documento fuente; no participa en ninguna logica ni se envia a Account.
 *
 * Fuente: Nexus-Battle-Infrastructure, docs/privacy/privacy-policy-v0.3.md
 * (2026-08-24). Actualizar este texto cuando cambie la fuente es una decision
 * editorial de quien mantenga el contenido, no una funcionalidad.
 */
export const PrivacyPolicyPage = (): React.JSX.Element => (
  <div className="min-h-dvh text-ink">
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="text-sm font-medium text-muted hover:text-ink">
          ← Volver al menú
        </Link>

        <ThemeToggle />
      </div>

      <header className="mt-4">
        <h1 className="text-xl font-semibold text-ink">
          Política de Privacidad y Tratamiento de Datos Personales
        </h1>
        <p className="mt-1 text-sm text-muted">
          THE NEXUS BATTLES VI — RETURN OF THE WARRIORS · Organización responsable: CLOUDNEX ·
          Versión 0.3 · Documento fuente del 24 de agosto de 2026
        </p>
      </header>

      <main className="mt-6 space-y-4 pb-10 text-sm text-ink">
        <Card title="1. Aspectos generales">
          <div className="space-y-3">
            <p>
              CLOUDNEX, organización responsable del desarrollo, administración técnica y
              mantenimiento documental del producto THE NEXUS BATTLES VI — RETURN OF THE WARRIORS,
              que para efectos de la presente Política se denominará LA COMPAÑÍA, establece las
              condiciones bajo las cuales se recolecta, utiliza, almacena, consulta, protege,
              conserva, exporta y elimina la información personal asociada a los usuarios de la
              plataforma.
            </p>
            <p>
              La presente Política se aplica al tratamiento de datos personales realizado dentro de
              los módulos y servicios que conforman THE NEXUS BATTLES VI, incluyendo, cuando
              corresponda, registro y autenticación, Mi Cuenta, héroes e inventario, administración
              de usuarios y comentarios, comercio electrónico simulado, chatbot, correo electrónico,
              subastas, misiones, torneos y demás funcionalidades formalmente incorporadas al
              producto.
            </p>
            <p>
              Para efectos del producto, el tratamiento deberá realizarse de conformidad con la
              normativa colombiana aplicable en materia de protección de datos personales y con las
              reglas funcionales y de seguridad vigentes del sistema. Ninguna funcionalidad podrá
              ampliar por sí sola las categorías de datos, finalidades o tiempos de conservación
              definidos en esta Política sin que exista una actualización formal del documento.
            </p>
          </div>
        </Card>

        <Card title="2. Objeto y finalidad de la Política">
          <div className="space-y-3">
            <p>
              La presente Política tiene por objeto informar de manera clara al usuario sobre el
              tratamiento de sus datos personales dentro de THE NEXUS BATTLES VI y establecer las
              reglas generales que deberán observar los componentes de la plataforma durante el
              ciclo de vida de dicha información.
            </p>
            <p>
              La Política también sirve como soporte del mecanismo de consentimiento explícito
              requerido para la creación de una cuenta. Su aceptación permite acreditar que el
              usuario ha tenido acceso a las condiciones de tratamiento aplicables al producto, sin
              perjuicio de las autorizaciones adicionales que puedan exigirse cuando una
              funcionalidad futura incorpore una finalidad materialmente diferente.
            </p>
          </div>
        </Card>

        <Card title="3. Definiciones aplicables">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Titular.</strong> Persona a quien corresponde la información personal tratada
              por la plataforma y que utiliza o mantiene una cuenta en THE NEXUS BATTLES VI.
            </li>
            <li>
              <strong>Dato personal.</strong> Información asociada o razonablemente vinculable a un
              usuario o a una cuenta dentro del producto.
            </li>
            <li>
              <strong>Tratamiento.</strong> Cualquier operación realizada sobre datos personales,
              incluida su recolección, registro, almacenamiento, consulta, utilización,
              actualización, circulación técnica, exportación, anonimización, conservación o
              eliminación.
            </li>
            <li>
              <strong>Consentimiento explícito.</strong> Manifestación afirmativa mediante la cual
              el usuario declara haber leído y aceptado esta Política antes de completar el registro
              de su cuenta.
            </li>
            <li>
              <strong>Portal de privacidad.</strong> Funcionalidad mediante la cual un usuario
              autenticado puede consultar y ejercer las capacidades de acceso, portabilidad y
              eliminación previstas para su información.
            </li>
            <li>
              <strong>Anonimización.</strong> Tratamiento orientado a impedir que los datos
              empleados para análisis estadísticos permitan identificar directamente al titular.
            </li>
          </ul>
        </Card>

        <Card title="4. Información objeto de tratamiento">
          <div className="space-y-3">
            <p>
              LA COMPAÑÍA tratará únicamente la información requerida por las funcionalidades
              vigentes del producto. Las categorías siguientes describen el alcance funcional
              actualmente previsto:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Datos de registro y cuenta: nombres, apellidos, correo electrónico, contraseña o
                credencial asociada, apodo y avatar, además de la información necesaria para
                mantener el perfil y las configuraciones habilitadas de Mi Cuenta.
              </li>
              <li>
                Datos de recuperación y seguridad: preguntas y respuestas de seguridad previamente
                configuradas, códigos de un solo uso cuando corresponda, eventos de autenticación,
                roles y permisos, e información necesaria para proteger el acceso a la cuenta.
              </li>
              <li>
                Datos de actividad del juego: héroes, inventario, equipamiento, estadísticas,
                logros, progreso y demás registros funcionales generados por la participación del
                usuario en el ecosistema de juego.
              </li>
              <li>
                Datos de comunidad y moderación: comentarios, calificaciones, reportes,
                advertencias, sanciones, apelaciones y demás registros necesarios para operar las
                funcionalidades de comunidad y aplicar las reglas de uso.
              </li>
              <li>
                Datos de transacciones: historial de compras y operaciones realizadas dentro de los
                módulos económicos del producto.
              </li>
              <li>
                Datos del chatbot: historial de conversaciones cuando la funcionalidad lo permita,
                contexto de consulta, preferencias de interacción y retroalimentación proporcionada
                por el usuario.
              </li>
              <li>
                Datos de comunicaciones: correo electrónico registrado y la información mínima
                necesaria para generar confirmaciones, avisos y notificaciones autorizadas.
              </li>
              <li>
                Datos de auditoría administrativa: fecha y hora de la acción, administrador que la
                ejecutó, tipo de acción, usuario o comentario afectado, valores anteriores y nuevos
                cuando existan modificaciones, motivo o justificación y dirección IP desde la cual
                se realizó la acción.
              </li>
            </ul>
            <p>
              La presente Política no amplía por sí misma el proceso de registro para exigir números
              telefónicos, datos biométricos, documentos de identidad, ubicación geográfica u otras
              categorías no definidas para la creación ordinaria de una cuenta.
            </p>
          </div>
        </Card>

        <Card title="5. Finalidades del tratamiento">
          <div className="space-y-3">
            <p>
              Los datos personales serán tratados exclusivamente para finalidades relacionadas con
              la prestación, seguridad, administración y mejora autorizada de THE NEXUS BATTLES VI.
              En particular, podrán utilizarse para:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Crear, validar, mantener y administrar cuentas de usuario y perfiles.</li>
              <li>
                Autenticar usuarios, aplicar roles y permisos, recuperar el acceso y proteger las
                sesiones y credenciales.
              </li>
              <li>
                Gestionar héroes, inventario, equipamiento, estadísticas, progreso y demás
                funcionalidades propias del juego.
              </li>
              <li>
                Permitir la publicación y consulta de comentarios y calificaciones, gestionar
                reportes, moderación, advertencias, suspensiones, baneos y procesos de apelación.
              </li>
              <li>
                Procesar operaciones de comercio electrónico simulado y conservar el historial de
                transacciones requerido por el producto.
              </li>
              <li>
                Enviar comunicaciones de cuenta, recuperación, compra, sanciones, misiones, subastas
                y cambios de políticas de uso.
              </li>
              <li>
                Permitir que el titular consulte, descargue y solicite la eliminación de su
                información mediante el Portal de privacidad.
              </li>
              <li>
                Mantener registros de auditoría de las acciones administrativas y generar evidencia
                de trazabilidad.
              </li>
            </ul>
          </div>
        </Card>

        <Card title="6. Autorización y consentimiento">
          <div className="space-y-3">
            <p>
              El usuario, en calidad de titular de la información, deberá otorgar una manifestación
              previa, expresa e informada de aceptación de esta Política antes de completar la
              creación de su cuenta. La ausencia de dicha aceptación impedirá finalizar el registro
              cuando el tratamiento de datos resulte indispensable para prestar el servicio.
            </p>
            <p>
              El consentimiento otorgado cubre únicamente las finalidades descritas en esta Política
              y las funcionalidades vigentes relacionadas con ellas. Una modificación material en el
              tratamiento deberá ser informada y reflejada en una nueva versión antes de utilizarse
              como fundamento para una finalidad distinta.
            </p>
          </div>
        </Card>

        <Card title="7. Tratamiento de datos por funcionalidades del producto">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                7.1 Cuenta, autenticación y recuperación
              </h3>
              <p className="mt-1.5">
                Los datos de registro se utilizarán para crear y mantener la cuenta, validar la
                identidad dentro de la plataforma, aplicar las reglas de apodo y habilitar las
                capacidades correspondientes al rol del usuario. Las preguntas de seguridad y los
                códigos de recuperación se utilizarán únicamente en los procesos autorizados de
                recuperación de acceso.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">
                7.2 Comunidad, comentarios y moderación
              </h3>
              <p className="mt-1.5">
                Los comentarios, calificaciones, reportes y registros de moderación podrán ser
                tratados para permitir la interacción comunitaria, proteger a los usuarios y aplicar
                las reglas de conducta y sanción.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">
                7.3 Héroes, inventario y actividad de juego
              </h3>
              <p className="mt-1.5">
                La plataforma podrá generar y conservar información sobre héroes, equipamiento,
                inventario, estadísticas, logros y progreso en la medida necesaria para prestar las
                funcionalidades del juego.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">
                7.4 Comercio electrónico y pago simulado
              </h3>
              <p className="mt-1.5">
                El módulo de comercio electrónico utiliza una pasarela de pago simulada. Los datos
                ingresados en los formularios de simulación se utilizarán exclusivamente para
                ejecutar el flujo académico definido por el producto.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">7.5 Chatbot</h3>
              <p className="mt-1.5">
                El chatbot podrá conservar historial y contexto de conversaciones cuando dicha
                funcionalidad se encuentre habilitada. El chatbot no deberá almacenar contraseñas ni
                datos de pago.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">
                7.6 Correo electrónico y comunicaciones
              </h3>
              <p className="mt-1.5">
                El correo electrónico registrado podrá utilizarse para confirmar la creación de
                cuentas, recuperar contraseñas, enviar confirmaciones de compra, comunicar
                sanciones, informar eventos de misiones y subastas, y notificar cambios de políticas
                de uso que afecten al usuario.
              </p>
            </div>
          </div>
        </Card>

        <Card title="8. Derechos del titular y Portal de privacidad">
          <div className="space-y-3">
            <p>
              El titular podrá ejercer, dentro de las capacidades previstas por la plataforma y la
              normativa aplicable, sus derechos de conocimiento, acceso, actualización,
              rectificación, consulta, portabilidad, supresión y demás facultades que correspondan
              sobre sus datos personales.
            </p>
            <p>
              THE NEXUS BATTLES VI dispondrá de un Portal de privacidad para que el usuario
              autenticado consulte la información almacenada sobre su propia cuenta. El portal
              deberá impedir que un titular visualice o exporte datos pertenecientes a otra persona.
            </p>
          </div>
        </Card>

        <Card title="9. Acceso y portabilidad de datos">
          <p>
            El titular autenticado podrá obtener una copia de los datos personales definidos para el
            Portal de privacidad en formato estructurado JSON o XML. Adicionalmente, podrá generar
            un reporte completo en formato PDF con la información prevista para inventario,
            estadísticas, comentarios e historial de transacciones.
          </p>
        </Card>

        <Card title="10. Derecho de eliminación de cuenta y datos asociados">
          <div className="space-y-3">
            <p>
              El titular podrá solicitar la eliminación completa de su cuenta y de los datos
              personales asociados mediante el mecanismo habilitado por la plataforma. Antes de
              ejecutar la solicitud, el sistema deberá verificar la identidad del solicitante y
              emitir una confirmación de recepción.
            </p>
            <p>
              La solicitud válida de eliminación deberá completarse dentro de un plazo máximo de
              treinta (30) días. Una vez finalizado el proceso, el usuario deberá recibir la
              notificación de cierre correspondiente.
            </p>
            <p>
              La eliminación no comprenderá los registros que deban conservarse por razones legales,
              financieras o de auditoría, ni aquellos cuya conservación esté expresamente vinculada
              a obligaciones de seguridad y trazabilidad del producto.
            </p>
          </div>
        </Card>

        <Card title="11. Conservación y retención de información">
          <div className="space-y-3">
            <p>
              Los datos personales serán conservados durante el tiempo necesario para cumplir las
              finalidades previstas por el producto, mantener la continuidad de las funcionalidades
              contratadas o aceptadas por el usuario y atender las obligaciones de seguridad,
              auditoría y trazabilidad aplicables.
            </p>
            <p>
              Los registros de auditoría administrativa deberán ser inmutables, accesibles
              únicamente a los roles autorizados, exportables para análisis y reportes y conservados
              por un periodo mínimo de cinco (5) años.
            </p>
          </div>
        </Card>

        <Card title="12. Seguridad, confidencialidad y control de acceso">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Cifrado de información sensible almacenada y protección de las comunicaciones durante
              su transmisión.
            </li>
            <li>
              Anonimización de datos utilizados para análisis estadísticos cuando corresponda.
            </li>
            <li>
              Control de acceso basado en roles y permisos, con verificación también en los
              servicios protegidos.
            </li>
            <li>
              Autenticación reforzada para usuarios administrativos y controles adicionales para
              acciones críticas.
            </li>
            <li>
              Protección específica del historial del chatbot y prohibición de almacenar allí
              contraseñas o datos de pago.
            </li>
          </ul>
        </Card>

        <Card title="13. Encargados, servicios tecnológicos y circulación controlada">
          <p>
            Para operar la plataforma, LA COMPAÑÍA podrá utilizar componentes de infraestructura,
            almacenamiento, correo electrónico, APIs y otros servicios tecnológicos necesarios para
            prestar las funcionalidades del producto. La participación de dichos componentes no
            amplía las finalidades de tratamiento definidas en esta Política.
          </p>
        </Card>

        <Card title="14. Calidad y responsabilidad sobre la información suministrada">
          <p>
            El usuario se compromete a suministrar información veraz, completa y actualizada durante
            el registro y en las funcionalidades que permitan modificar datos de su cuenta. El
            usuario es responsable de custodiar sus credenciales y de utilizar los mecanismos de
            seguridad habilitados para su cuenta.
          </p>
        </Card>

        <Card title="15. Política de nombres y lista negra">
          <p>
            El registro y las funcionalidades que permitan definir o modificar el apodo del usuario
            deberán validar el nombre contra una lista negra actualizable destinada a impedir
            términos ofensivos, nombres de celebridades o políticos, marcas registradas y demás
            términos prohibidos por las reglas del producto.
          </p>
        </Card>

        <Card title="16. Modificaciones a la Política">
          <p>
            LA COMPAÑÍA podrá modificar, actualizar o ajustar esta Política cuando cambien las
            funcionalidades, finalidades de tratamiento, categorías de datos, obligaciones de
            seguridad o reglas de conservación del producto. Cuando una modificación afecte de forma
            material las condiciones de tratamiento aplicables al usuario, el cambio deberá ser
            informado mediante los canales habilitados por la plataforma.
          </p>
        </Card>

        <Card title="17. Aceptación de la Política">
          <p>
            El acceso a la información de esta Política y su aceptación expresa forman parte del
            proceso de registro de la cuenta. En caso de no aceptar la Política, el visitante deberá
            abstenerse de completar el proceso de creación de la cuenta cuando el tratamiento sea
            indispensable para prestar las funcionalidades del producto.
          </p>
        </Card>

        <Card title="18. Canales para el ejercicio de derechos">
          <p>
            El canal principal para el ejercicio de derechos será el Portal de privacidad de THE
            NEXUS BATTLES VI, una vez la funcionalidad se encuentre disponible. Las solicitudes que
            no puedan ser resueltas directamente por el portal deberán dirigirse a través del canal
            institucional que LA COMPAÑÍA publique oficialmente para atención de privacidad.
          </p>
        </Card>

        <Card title="19. Vigencia y control documental">
          <p>
            La presente Política corresponde a la versión 0.3 del documento de privacidad de THE
            NEXUS BATTLES VI y entra en vigencia para fines de revisión, aprobación e incorporación
            al repositorio del producto a partir del 24 de agosto de 2026. Su publicación definitiva
            como versión aplicable a usuarios deberá realizarse una vez completado el proceso
            interno de aprobación correspondiente.
          </p>
        </Card>
      </main>
    </div>
  </div>
)
