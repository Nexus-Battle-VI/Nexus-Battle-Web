/**
 * Contenido de la Politica de Privacidad y Tratamiento de Datos Personales.
 *
 * Fuente: Nexus-Battle-Infrastructure, docs/privacy/privacy-policy-v0.3.md
 * (version 0.3, 2026-08-24). Es una materializacion estatica del documento
 * para que el producto desplegado no dependa de GitHub en runtime -
 * Infrastructure no es un servicio-. Actualizar el texto cuando cambie la
 * fuente es una decision editorial, no una funcionalidad: no existe aqui
 * ninguna nocion de "version aplicable" ni logica que la gestione.
 */

export interface PolicySubsection {
  readonly heading: string
  readonly paragraphs: readonly string[]
}

export interface PolicySection {
  readonly id: string
  readonly heading: string
  readonly paragraphs: readonly string[]
  readonly list?: readonly string[]
  readonly subsections?: readonly PolicySubsection[]
}

export const POLICY_META = {
  product: 'THE NEXUS BATTLES VI — RETURN OF THE WARRIORS',
  organization: 'CLOUDNEX',
  version: '0.3',
  sourceDate: '24 de agosto de 2026',
} as const

export const POLICY_SECTIONS: readonly PolicySection[] = [
  {
    id: 'aspectos-generales',
    heading: '1. Aspectos generales',
    paragraphs: [
      'CLOUDNEX, organización responsable del desarrollo, administración técnica y mantenimiento documental del producto THE NEXUS BATTLES VI — RETURN OF THE WARRIORS, que para efectos de la presente Política se denominará LA COMPAÑÍA, establece las condiciones bajo las cuales se recolecta, utiliza, almacena, consulta, protege, conserva, exporta y elimina la información personal asociada a los usuarios de la plataforma.',
      'La presente Política se aplica al tratamiento de datos personales realizado dentro de los módulos y servicios que conforman THE NEXUS BATTLES VI, incluyendo, cuando corresponda, registro y autenticación, Mi Cuenta, héroes e inventario, administración de usuarios y comentarios, comercio electrónico simulado, chatbot, correo electrónico, subastas, misiones, torneos y demás funcionalidades formalmente incorporadas al producto.',
      'Para efectos del producto, el tratamiento deberá realizarse de conformidad con la normativa colombiana aplicable en materia de protección de datos personales y con las reglas funcionales y de seguridad vigentes del sistema. Ninguna funcionalidad podrá ampliar por sí sola las categorías de datos, finalidades o tiempos de conservación definidos en esta Política sin que exista una actualización formal del documento.',
    ],
  },
  {
    id: 'objeto-y-finalidad',
    heading: '2. Objeto y finalidad de la Política',
    paragraphs: [
      'La presente Política tiene por objeto informar de manera clara al usuario sobre el tratamiento de sus datos personales dentro de THE NEXUS BATTLES VI y establecer las reglas generales que deberán observar los componentes de la plataforma durante el ciclo de vida de dicha información.',
      'La Política también sirve como soporte del mecanismo de consentimiento explícito requerido para la creación de una cuenta. Su aceptación permite acreditar que el usuario ha tenido acceso a las condiciones de tratamiento aplicables al producto, sin perjuicio de las autorizaciones adicionales que puedan exigirse cuando una funcionalidad futura incorpore una finalidad materialmente diferente.',
    ],
  },
  {
    id: 'definiciones',
    heading: '3. Definiciones aplicables',
    paragraphs: [],
    list: [
      'Titular. Persona a quien corresponde la información personal tratada por la plataforma y que utiliza o mantiene una cuenta en THE NEXUS BATTLES VI.',
      'Dato personal. Información asociada o razonablemente vinculable a un usuario o a una cuenta dentro del producto.',
      'Tratamiento. Cualquier operación realizada sobre datos personales, incluida su recolección, registro, almacenamiento, consulta, utilización, actualización, circulación técnica, exportación, anonimización, conservación o eliminación.',
      'Consentimiento explícito. Manifestación afirmativa mediante la cual el usuario declara haber leído y aceptado esta Política antes de completar el registro de su cuenta.',
      'Portal de privacidad. Funcionalidad mediante la cual un usuario autenticado puede consultar y ejercer las capacidades de acceso, portabilidad y eliminación previstas para su información.',
      'Anonimización. Tratamiento orientado a impedir que los datos empleados para análisis estadísticos permitan identificar directamente al titular.',
    ],
  },
  {
    id: 'informacion-tratada',
    heading: '4. Información objeto de tratamiento',
    paragraphs: [
      'LA COMPAÑÍA tratará únicamente la información requerida por las funcionalidades vigentes del producto. Las categorías siguientes describen el alcance funcional actualmente previsto:',
    ],
    list: [
      'Datos de registro y cuenta: nombres, apellidos, correo electrónico, contraseña o credencial asociada, apodo y avatar, además de la información necesaria para mantener el perfil y las configuraciones habilitadas de Mi Cuenta.',
      'Datos de recuperación y seguridad: preguntas y respuestas de seguridad previamente configuradas, códigos de un solo uso cuando corresponda, eventos de autenticación, roles y permisos, e información necesaria para proteger el acceso a la cuenta.',
      'Datos de actividad del juego: héroes, inventario, equipamiento, estadísticas, logros, progreso y demás registros funcionales generados por la participación del usuario en el ecosistema de juego.',
      'Datos de comunidad y moderación: comentarios, calificaciones, reportes, advertencias, sanciones, apelaciones y demás registros necesarios para operar las funcionalidades de comunidad y aplicar las reglas de uso.',
      'Datos de transacciones: historial de compras y operaciones realizadas dentro de los módulos económicos del producto, incluidas las transacciones asociadas al comercio electrónico simulado y a los demás módulos que generen registros de actividad económica.',
      'Datos del chatbot: historial de conversaciones cuando la funcionalidad lo permita, contexto de consulta, preferencias de interacción y retroalimentación proporcionada por el usuario sobre la utilidad de las respuestas.',
      'Datos de comunicaciones: correo electrónico registrado y la información mínima necesaria para generar confirmaciones, avisos y notificaciones autorizadas por las funcionalidades del producto.',
      'Datos de auditoría administrativa: fecha y hora de la acción, administrador que la ejecutó, tipo de acción, usuario o comentario afectado, valores anteriores y nuevos cuando existan modificaciones, motivo o justificación y dirección IP desde la cual se realizó la acción.',
    ],
    subsections: [
      {
        heading: 'Datos no incorporados como requisito general de registro',
        paragraphs: [
          'La presente Política no amplía por sí misma el proceso de registro para exigir números telefónicos, datos biométricos, documentos de identidad, ubicación geográfica u otras categorías no definidas para la creación ordinaria de una cuenta. La incorporación futura de nuevas categorías deberá estar respaldada por una necesidad funcional aprobada y por la actualización correspondiente de esta Política.',
        ],
      },
    ],
  },
  {
    id: 'finalidades',
    heading: '5. Finalidades del tratamiento',
    paragraphs: [
      'Los datos personales serán tratados exclusivamente para finalidades relacionadas con la prestación, seguridad, administración y mejora autorizada de THE NEXUS BATTLES VI. En particular, podrán utilizarse para:',
    ],
    list: [
      'Crear, validar, mantener y administrar cuentas de usuario y perfiles.',
      'Autenticar usuarios, aplicar roles y permisos, recuperar el acceso y proteger las sesiones y credenciales.',
      'Gestionar héroes, inventario, equipamiento, estadísticas, progreso y demás funcionalidades propias del juego.',
      'Permitir la publicación y consulta de comentarios y calificaciones, gestionar reportes, moderación, advertencias, suspensiones, baneos y procesos de apelación según las reglas vigentes.',
      'Procesar operaciones de comercio electrónico simulado y conservar el historial de transacciones requerido por el producto.',
      'Prestar servicios de chatbot, conservar el contexto autorizado de conversación, registrar retroalimentación y apoyar la mejora del servicio conforme a las reglas de privacidad aplicables.',
      'Enviar comunicaciones de cuenta, recuperación, compra, sanciones, misiones, subastas, cambios de políticas de uso y demás eventos expresamente previstos por el sistema. Los mensajes publicitarios solo podrán utilizar los canales y condiciones autorizados para el producto.',
      'Permitir que el titular consulte, descargue y solicite la eliminación de su información mediante el Portal de privacidad.',
      'Mantener registros de auditoría de las acciones administrativas y generar evidencia de trazabilidad.',
      'Realizar análisis estadísticos mediante mecanismos de anonimización cuando corresponda.',
    ],
  },
  {
    id: 'autorizacion-y-consentimiento',
    heading: '6. Autorización y consentimiento',
    paragraphs: [
      'El usuario, en calidad de titular de la información, deberá otorgar una manifestación previa, expresa e informada de aceptación de esta Política antes de completar la creación de su cuenta. La ausencia de dicha aceptación impedirá finalizar el registro cuando el tratamiento de datos resulte indispensable para prestar el servicio.',
      'La plataforma deberá mantener evidencia verificable de la aceptación, incluyendo como mínimo la versión de la Política aceptada y el momento en que se produjo la manifestación. La forma técnica de conservar dicha evidencia deberá respetar los controles de seguridad y auditoría aplicables.',
      'El consentimiento otorgado cubre únicamente las finalidades descritas en esta Política y las funcionalidades vigentes relacionadas con ellas. Una modificación material en el tratamiento deberá ser informada y reflejada en una nueva versión antes de utilizarse como fundamento para una finalidad distinta.',
    ],
  },
  {
    id: 'tratamiento-por-funcionalidad',
    heading: '7. Tratamiento de datos por funcionalidades del producto',
    paragraphs: [],
    subsections: [
      {
        heading: '7.1 Cuenta, autenticación y recuperación',
        paragraphs: [
          'Los datos de registro se utilizarán para crear y mantener la cuenta, validar la identidad dentro de la plataforma, aplicar las reglas de apodo y habilitar las capacidades correspondientes al rol del usuario. Las preguntas de seguridad y los códigos de recuperación se utilizarán únicamente en los procesos autorizados de recuperación de acceso.',
          'Las credenciales y demás información sensible deberán protegerse mediante las medidas de seguridad establecidas para el producto. Los usuarios con funciones administrativas están sujetos a controles adicionales de autenticación y autorización.',
        ],
      },
      {
        heading: '7.2 Comunidad, comentarios y moderación',
        paragraphs: [
          'Los comentarios, calificaciones, reportes y registros de moderación podrán ser tratados para permitir la interacción comunitaria, proteger a los usuarios y aplicar las reglas de conducta y sanción. Las acciones administrativas sobre comentarios o usuarios deberán quedar asociadas a registros de auditoría cuando así lo establezca el sistema.',
          'La eliminación u ocultamiento de contenido comunitario no autoriza a modificar o eliminar registros de auditoría que deban conservarse conforme a las reglas de trazabilidad y retención aplicables.',
        ],
      },
      {
        heading: '7.3 Héroes, inventario y actividad de juego',
        paragraphs: [
          'La plataforma podrá generar y conservar información sobre héroes, equipamiento, inventario, estadísticas, logros y progreso en la medida necesaria para prestar las funcionalidades del juego y mantener la continuidad de la cuenta. Esta información podrá formar parte de las consultas y exportaciones disponibles en el Portal de privacidad.',
        ],
      },
      {
        heading: '7.4 Comercio electrónico y pago simulado',
        paragraphs: [
          'El módulo de comercio electrónico utiliza una pasarela de pago simulada. Los datos ingresados en los formularios de simulación se utilizarán exclusivamente para ejecutar el flujo académico definido por el producto y no deberán convertirse, por esa sola circunstancia, en datos permanentes del perfil del usuario. El historial de la transacción y de los productos adquiridos sí podrá conservarse como parte de la actividad de la cuenta y de las obligaciones de trazabilidad o portabilidad que resulten aplicables.',
        ],
      },
      {
        heading: '7.5 Chatbot',
        paragraphs: [
          'El chatbot podrá conservar historial y contexto de conversaciones cuando dicha funcionalidad se encuentre habilitada, con el fin de prestar respuestas contextuales y apoyar la mejora del servicio. Las conversaciones deberán protegerse durante su transmisión y almacenamiento. El chatbot no deberá almacenar contraseñas ni datos de pago.',
          'El usuario deberá disponer de una opción para eliminar el historial de conversaciones conforme al alcance funcional del módulo. Cuando se solicite la eliminación completa de la cuenta, dicho historial quedará sujeto al régimen general de eliminación y a las excepciones de conservación que correspondan.',
        ],
      },
      {
        heading: '7.6 Correo electrónico y comunicaciones',
        paragraphs: [
          'El correo electrónico registrado podrá utilizarse para confirmar la creación de cuentas, recuperar contraseñas, enviar confirmaciones de compra, comunicar sanciones, informar eventos de misiones y subastas, notificar cambios de políticas de uso que afecten al usuario y remitir las demás comunicaciones autorizadas por los módulos del producto. Los mensajes deberán utilizar plantillas coherentes con las políticas de LA COMPAÑÍA y emplear únicamente la información necesaria para el evento que origina la comunicación.',
        ],
      },
    ],
  },
  {
    id: 'derechos-y-portal',
    heading: '8. Derechos del titular y Portal de privacidad',
    paragraphs: [
      'El titular podrá ejercer, dentro de las capacidades previstas por la plataforma y la normativa aplicable, sus derechos de conocimiento, acceso, actualización, rectificación, consulta, portabilidad, supresión y demás facultades que correspondan sobre sus datos personales.',
      'THE NEXUS BATTLES VI dispondrá de un Portal de privacidad para que el usuario autenticado consulte la información almacenada sobre su propia cuenta. El portal deberá impedir que un titular visualice o exporte datos pertenecientes a otra persona.',
      'Las solicitudes relacionadas con datos personales deberán someterse a la verificación de identidad definida para la cuenta antes de ejecutar operaciones sensibles, especialmente cuando impliquen descarga o eliminación de información.',
    ],
  },
  {
    id: 'acceso-y-portabilidad',
    heading: '9. Acceso y portabilidad de datos',
    paragraphs: [
      'El titular autenticado podrá obtener una copia de los datos personales definidos para el Portal de privacidad en formato estructurado JSON o XML. Adicionalmente, podrá generar un reporte completo en formato PDF con la información prevista para inventario, estadísticas, comentarios e historial de transacciones.',
      'Los archivos generados deberán corresponder al estado de la información registrada para la cuenta al momento de la solicitud y no podrán contener datos pertenecientes a otros usuarios. La generación y descarga deberá realizarse únicamente después de validar la identidad del titular autenticado.',
      'El alcance de cada exportación se limitará a la información efectivamente almacenada y habilitada por las funcionalidades vigentes del producto. La Política no autoriza la inclusión de datos de terceros ni la creación artificial de información que no exista en los sistemas de origen.',
    ],
  },
  {
    id: 'eliminacion-de-cuenta',
    heading: '10. Derecho de eliminación de cuenta y datos asociados',
    paragraphs: [
      'El titular podrá solicitar la eliminación completa de su cuenta y de los datos personales asociados mediante el mecanismo habilitado por la plataforma. Antes de ejecutar la solicitud, el sistema deberá verificar la identidad del solicitante y emitir una confirmación de recepción.',
      'La solicitud válida de eliminación deberá completarse dentro de un plazo máximo de treinta (30) días. Una vez finalizado el proceso, el usuario deberá recibir la notificación de cierre correspondiente.',
      'La eliminación no comprenderá los registros que deban conservarse por razones legales, financieras o de auditoría, ni aquellos cuya conservación esté expresamente vinculada a obligaciones de seguridad y trazabilidad del producto. Dichos registros deberán mantenerse separados del uso ordinario de la cuenta y no podrán utilizarse para finalidades incompatibles con su conservación.',
      'Parágrafo. Los registros relacionados con sanciones definitivas y con la auditoría administrativa se someterán al régimen de conservación y eliminación que resulte aplicable a dichas obligaciones. La eliminación de la cuenta no podrá utilizarse para alterar una bitácora de auditoría que deba permanecer inmutable.',
    ],
  },
  {
    id: 'conservacion-y-retencion',
    heading: '11. Conservación y retención de información',
    paragraphs: [
      'Los datos personales serán conservados durante el tiempo necesario para cumplir las finalidades previstas por el producto, mantener la continuidad de las funcionalidades contratadas o aceptadas por el usuario y atender las obligaciones de seguridad, auditoría y trazabilidad aplicables.',
      'Los registros de auditoría administrativa deberán ser inmutables, accesibles únicamente a los roles autorizados, exportables para análisis y reportes y conservados por un periodo mínimo de cinco (5) años. La información financiera y transaccional que deba mantenerse después de una solicitud de eliminación se conservará únicamente durante el periodo exigido por las obligaciones aplicables — la Política no fija un número de días o años específico para esa retención transaccional.',
      'Cuando finalice la necesidad de conservación y no exista una obligación que justifique su permanencia, los datos deberán ser eliminados, anonimizados o tratados de forma que dejen de utilizarse para la finalidad ordinaria que motivó su recolección.',
    ],
  },
  {
    id: 'seguridad',
    heading: '12. Seguridad, confidencialidad y control de acceso',
    paragraphs: [
      'LA COMPAÑÍA adoptará medidas técnicas y organizativas orientadas a proteger la confidencialidad, integridad, disponibilidad y acceso controlado a la información tratada por THE NEXUS BATTLES VI. Dentro del alcance definido por el producto, dichas medidas comprenden, entre otras:',
    ],
    list: [
      'Cifrado de información sensible almacenada y protección de las comunicaciones durante su transmisión.',
      'Anonimización de datos utilizados para análisis estadísticos cuando corresponda.',
      'Control de acceso basado en roles y permisos, con verificación también en los servicios protegidos.',
      'Autenticación reforzada para usuarios administrativos y controles adicionales para acciones críticas.',
      'Registro y trazabilidad de acciones administrativas relevantes.',
      'Separación de responsabilidades y acceso únicamente a la información necesaria para ejecutar la función autorizada.',
      'Protección específica del historial del chatbot y prohibición de almacenar allí contraseñas o datos de pago.',
    ],
  },
  {
    id: 'encargados-y-terceros',
    heading: '13. Encargados, servicios tecnológicos y circulación controlada',
    paragraphs: [
      'Para operar la plataforma, LA COMPAÑÍA podrá utilizar componentes de infraestructura, almacenamiento, correo electrónico, APIs y otros servicios tecnológicos necesarios para prestar las funcionalidades del producto. La participación de dichos componentes no amplía las finalidades de tratamiento definidas en esta Política.',
      'La información solo deberá circular entre módulos, servicios o proveedores cuando resulte necesaria para ejecutar una operación autorizada. La arquitectura deberá preservar las fronteras de responsabilidad de los servicios y evitar el acceso directo e indiscriminado a repositorios de datos que pertenezcan a otros componentes.',
    ],
  },
  {
    id: 'calidad-de-la-informacion',
    heading: '14. Calidad y responsabilidad sobre la información suministrada',
    paragraphs: [
      'El usuario se compromete a suministrar información veraz, completa y actualizada durante el registro y en las funcionalidades que permitan modificar datos de su cuenta. LA COMPAÑÍA podrá rechazar o impedir una operación cuando la información suministrada no satisfaga las validaciones aplicables al producto.',
      'El usuario es responsable de custodiar sus credenciales y de utilizar los mecanismos de seguridad habilitados para su cuenta. La plataforma no deberá exponer información de otros usuarios como consecuencia de una consulta, exportación o manipulación de identificadores.',
    ],
  },
  {
    id: 'nombres-y-lista-negra',
    heading: '15. Política de nombres y lista negra',
    paragraphs: [
      'El registro y las funcionalidades que permitan definir o modificar el apodo del usuario deberán validar el nombre contra una lista negra actualizable destinada a impedir términos ofensivos, nombres de celebridades o políticos, marcas registradas y demás términos prohibidos por las reglas del producto.',
      'La composición, mantenimiento, gobierno, criterios de actualización y procedimiento de revisión de dicha lista no forman parte sustantiva de esta Política de Privacidad. Esos elementos deberán documentarse en una Política de Nombres y Lista Negra independiente, vinculada al requisito funcional de registro y a las reglas de moderación correspondientes.',
    ],
  },
  {
    id: 'modificaciones',
    heading: '16. Modificaciones a la Política',
    paragraphs: [
      'LA COMPAÑÍA podrá modificar, actualizar o ajustar esta Política cuando cambien las funcionalidades, finalidades de tratamiento, categorías de datos, obligaciones de seguridad o reglas de conservación del producto. Cada versión deberá identificarse de manera inequívoca y mantenerse disponible para consulta.',
      'Cuando una modificación afecte de forma material las condiciones de tratamiento aplicables al usuario, el cambio deberá ser informado mediante los canales habilitados por la plataforma. Cuando corresponda, el sistema deberá obtener una nueva manifestación de aceptación antes de aplicar la finalidad modificada.',
    ],
  },
  {
    id: 'aceptacion',
    heading: '17. Aceptación de la Política',
    paragraphs: [
      'El acceso a la información de esta Política y su aceptación expresa forman parte del proceso de registro de la cuenta. Al seleccionar el mecanismo de aceptación y completar el registro, el usuario declara que conoce, comprende y acepta las condiciones aquí descritas para el tratamiento de sus datos personales dentro de THE NEXUS BATTLES VI.',
      'En caso de no aceptar la Política, el visitante deberá abstenerse de completar el proceso de creación de la cuenta cuando el tratamiento sea indispensable para prestar las funcionalidades del producto.',
    ],
  },
  {
    id: 'canales',
    heading: '18. Canales para el ejercicio de derechos',
    paragraphs: [
      'El canal principal para el ejercicio de derechos será el Portal de privacidad de THE NEXUS BATTLES VI, una vez la funcionalidad se encuentre disponible. Las solicitudes que no puedan ser resueltas directamente por el portal deberán dirigirse a través del canal institucional que LA COMPAÑÍA publique oficialmente para atención de privacidad.',
      'LA COMPAÑÍA no incorporará en esta Política direcciones de correo, teléfonos o domicilios que no hayan sido formalmente definidos como canales oficiales. El canal publicado deberá mantenerse visible y actualizado mientras esta Política se encuentre vigente.',
    ],
  },
  {
    id: 'vigencia',
    heading: '19. Vigencia y control documental',
    paragraphs: [
      'La presente Política corresponde a la versión 0.3 del documento de privacidad de THE NEXUS BATTLES VI y entra en vigencia para fines de revisión, aprobación e incorporación al repositorio del producto a partir del 24 de agosto de 2026. Su publicación definitiva como versión aplicable a usuarios deberá realizarse una vez completado el proceso interno de aprobación correspondiente.',
      'Las versiones anteriores deberán conservarse como evidencia documental del cambio de condiciones. La aplicación deberá poder identificar la versión presentada al usuario al momento de obtener su aceptación.',
    ],
  },
]
