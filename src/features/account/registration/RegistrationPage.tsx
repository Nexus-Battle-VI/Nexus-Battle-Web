import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import clsx from 'clsx'

import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/ui/PasswordField'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LEGAL_DOCUMENTS, SECURITY_QUESTIONS } from './constants'
import { confirmRegistration, registerAccount } from './api'
import {
  EMPTY_VALUES,
  FIELD,
  MESSAGES,
  NICKNAME_MAX_LENGTH,
  hasErrors,
  securityFieldId,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationValues,
} from './validation'

/**
 * El tema lo gobierna la fuente unica global (`@/shared/theme`) a traves de
 * `ThemeToggle`. Aqui no se persiste nada del formulario: ni la contrasena, ni
 * el avatar, ni las respuestas de seguridad tocan el almacenamiento del
 * navegador.
 */
const REGISTER_FAILED = 'No se pudo completar el registro.'
const CONFIRM_FAILED = 'No se pudo confirmar la cuenta.'

const CONTROL_CLASS =
  'block w-full min-w-0 rounded-md border bg-[var(--nb-field)] px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand'

/**
 * Logotipo grafico de "THE NEXUS BATTLES VI — RETURN OF THE WARRIORS".
 *
 * Servido desde `public/assets/logo.png`. El `<img>` conserva un `onError`
 * que cae de vuelta al lockup textual si el archivo llegara a faltar: la
 * pantalla nunca depende de que exista para seguir siendo legible.
 */
const LOGO_SRC = '/assets/logo.png'

interface SectionProps {
  readonly title: string
  readonly description?: string
  readonly children: ReactNode
}

/**
 * Agrupacion visual local a esta pantalla.
 *
 * No reutiliza `Card` (`src/components/ui/Card.tsx`) a proposito: ese
 * componente es compartido por las cinco pantallas de marcador de posicion, y
 * compactar su padding aqui las habria afectado a todas. Esta version vive
 * solo en HU-01 y usa los mismos tokens del Design System.
 */
const Section = ({ title, description, children }: SectionProps): React.JSX.Element => (
  <section className="rounded-lg border border-border bg-surface-raised p-5">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">{title}</h2>
    {description !== undefined && <p className="mt-1 text-xs text-muted">{description}</p>}
    <div className="mt-3">{children}</div>
  </section>
)

/** Fila de dos campos que se apila en una sola columna cuando falta espacio. */
const FieldRow = ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
)

interface FieldProps {
  readonly id: string
  readonly label: string
  readonly hint?: string
  readonly counter?: string
  readonly error?: string
  readonly children: (props: {
    readonly id: string
    readonly 'aria-invalid': boolean
    readonly 'aria-describedby': string | undefined
    readonly 'aria-required': true
    readonly className: string
  }) => ReactNode
}

/**
 * Campo con su etiqueta, su texto auxiliar y su error asociado.
 *
 * El cableado accesible (`aria-invalid`, `aria-describedby`) se entrega al
 * control en lugar de repetirse en cada uno: asi ningun campo se queda sin el
 * justo cuando es el que falla.
 */
const Field = ({ id, label, hint, counter, error, children }: FieldProps): React.JSX.Element => {
  const describedBy = [
    hint === undefined ? null : `${id}-hint`,
    counter === undefined ? null : `${id}-counter`,
    error === undefined ? null : `${id}-error`,
  ]
    .filter((value) => value !== null)
    .join(' ')

  return (
    <div className="w-full min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>

      <div className="mt-1">
        {children({
          id,
          'aria-invalid': error !== undefined,
          'aria-describedby': describedBy === '' ? undefined : describedBy,
          'aria-required': true,
          className: clsx(CONTROL_CLASS, error === undefined ? 'border-border' : 'border-danger'),
        })}
      </div>

      {(hint !== undefined || counter !== undefined) && (
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          {hint !== undefined && (
            <p id={`${id}-hint`} className="text-xs text-muted">
              {hint}
            </p>
          )}
          {counter !== undefined && (
            <p id={`${id}-counter`} className="text-xs tabular-nums text-muted">
              {counter}
            </p>
          )}
        </div>
      )}

      {error !== undefined && (
        // El error no se senala solo con color: lleva tambien una marca
        // textual, porque quien no distingue el rojo necesita otra pista.
        <p id={`${id}-error`} className="mt-1 flex items-start gap-1.5 text-sm text-danger">
          <span aria-hidden="true" className="font-bold leading-5">
            !
          </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

interface ConfirmationStepProps {
  readonly email: string
  readonly code: string
  readonly onCodeChange: (value: string) => void
  readonly onConfirm: () => void
  readonly confirming: boolean
  readonly confirmed: boolean
  readonly failure: string | null
  readonly onGoToLogin: () => void
}

/**
 * Segundo paso del alta: confirmar el correo con el codigo que el proveedor
 * envio al buzon.
 *
 * Es una pantalla distinta, no un aviso al pie del formulario: el registro ya se
 * acepto y lo unico que queda es el codigo. Mostrar de nuevo el formulario
 * entero invitaria a reenviarlo, que crearia un segundo intento con el mismo
 * correo -y ese choca contra la identidad ya creada-.
 */
const ConfirmationStep = ({
  email,
  code,
  onCodeChange,
  onConfirm,
  confirming,
  confirmed,
  failure,
  onGoToLogin,
}: ConfirmationStepProps): React.JSX.Element => (
  <div className="mx-auto max-w-md">
    {confirmed ? (
      <div className="space-y-5 text-center">
        <h1 className="text-xl font-semibold text-ink">Cuenta activada</h1>
        <p
          role="status"
          className="rounded-lg border border-brand bg-brand/10 p-4 text-sm text-ink"
        >
          Tu cuenta quedó activada. Ya puedes iniciar sesión con tu correo y tu contraseña.
        </p>
        <div className="flex justify-center">
          <Button onClick={onGoToLogin}>Ir a iniciar sesión</Button>
        </div>
      </div>
    ) : (
      <>
        <h1 className="text-center text-xl font-semibold text-ink">Confirma tu correo</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-center text-sm text-muted">
          Enviamos un código de confirmación a <span className="font-medium text-ink">{email}</span>
          . Escríbelo para activar tu cuenta.
        </p>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            onConfirm()
          }}
          className="mt-6 space-y-4"
        >
          {failure !== null && (
            <p
              role="alert"
              className="rounded-lg border border-danger bg-danger/10 p-4 text-sm text-danger"
            >
              {failure}
            </p>
          )}

          <Field
            id="confirmation-code"
            label="Código de confirmación"
            hint="Revisa tu bandeja de entrada y la carpeta de spam."
          >
            {(field) => (
              <input
                {...field}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => {
                  onCodeChange(event.target.value)
                }}
              />
            )}
          </Field>

          <div className="flex justify-end">
            <Button type="submit" loading={confirming}>
              Confirmar cuenta
            </Button>
          </div>
        </form>
      </>
    )}
  </div>
)

export interface RegistrationPageProps {
  /** Transporte del registro. Se inyecta para poder ejercitar el envio sin red. */
  readonly onSubmit?: (values: RegistrationValues) => Promise<void>
  /**
   * Transporte de la confirmacion por codigo (segundo paso del alta). Se inyecta
   * igual que `onSubmit` para ejercitar la pantalla sin red.
   */
  readonly onConfirm?: (identifier: string, code: string) => Promise<void>
}

/**
 * HU-01 — Registro de cuenta de jugador.
 *
 * Es una pantalla **publica** y se monta fuera de `AppLayout`: quien todavia no
 * tiene cuenta no puede tener catalogo, inventario ni pedidos, y mostrarle esa
 * navegacion seria ofrecerle destinos que no le corresponden.
 *
 * Los errores no aparecen mientras se escribe por primera vez: un campo vacio
 * que aun no se ha tocado no esta mal, esta sin empezar.
 */
export const RegistrationPage = ({
  onSubmit = registerAccount,
  onConfirm = confirmRegistration,
}: RegistrationPageProps = {}): React.JSX.Element => {
  const navigate = useNavigate()

  const [values, setValues] = useState<RegistrationValues>(EMPTY_VALUES)
  const [touched, setTouched] = useState<Readonly<Record<string, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [unavailableDocument, setUnavailableDocument] = useState<string | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)

  // Segundo paso del alta. `pendingEmail` distinto de null significa que el
  // registro fue aceptado y la cuenta espera el codigo que el proveedor envio al
  // correo; `confirmed` significa que ya se activo.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmFailure, setConfirmFailure] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const summaryRef = useRef<HTMLDivElement>(null)
  const [focusSummaryToken, setFocusSummaryToken] = useState(0)

  const errors = useMemo(() => validateRegistration(values), [values])

  const visible: RegistrationErrors = useMemo(
    () =>
      attempted
        ? errors
        : Object.fromEntries(Object.entries(errors).filter(([field]) => touched[field] === true)),
    [errors, touched, attempted],
  )

  const markTouched = (field: string): void => {
    setTouched((previous) => ({ ...previous, [field]: true }))
  }

  const setValue = <K extends keyof RegistrationValues>(
    key: K,
    value: RegistrationValues[K],
  ): void => {
    setValues((previous) => ({ ...previous, [key]: value }))
  }

  const handleSubmit = async (): Promise<void> => {
    // Un segundo envio mientras el primero esta en curso crearia dos cuentas
    // con el mismo correo. La guarda va antes que cualquier otra cosa.
    if (sending) {
      return
    }

    setAttempted(true)
    setFailure(null)

    if (hasErrors(errors)) {
      // En un formulario largo el error puede quedar fuera de la vista: se le
      // lleva el foco al resumen para que el envio fallido no parezca no haber
      // hecho nada. En el primer intento invalido el resumen todavia no existe
      // en el DOM en este punto (el estado que lo monta aun no se ha
      // confirmado), asi que enfocarlo aqui directamente no haria nada: se
      // difiere a un efecto que se dispara despues de que React confirme el
      // render.
      setFocusSummaryToken((token) => token + 1)
      return
    }

    setSending(true)

    try {
      await onSubmit(values)
      // El alta quedo aceptada pero PENDIENTE: el proveedor envio un codigo al
      // correo y la cuenta no se activa hasta confirmarlo. La pantalla pasa al
      // segundo paso en lugar de anunciar un exito que aun no lo es.
      setPendingEmail(values.email)
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : REGISTER_FAILED)
    } finally {
      setSending(false)
    }
  }

  const handleConfirm = async (): Promise<void> => {
    if (confirming || pendingEmail === null) {
      return
    }

    setConfirmFailure(null)

    if (code.trim() === '') {
      setConfirmFailure('Escribe el código que enviamos a tu correo.')
      return
    }

    setConfirming(true)

    try {
      await onConfirm(pendingEmail, code.trim())
      setConfirmed(true)
    } catch (error: unknown) {
      setConfirmFailure(error instanceof Error ? error.message : CONFIRM_FAILED)
    } finally {
      setConfirming(false)
    }
  }

  const issues = attempted ? Object.entries(errors) : []

  // Se dispara solo cuando `focusSummaryToken` cambia (cada envio invalido),
  // ya con el resumen confirmado en el DOM: aqui `summaryRef.current` ya
  // apunta al elemento, a diferencia del momento en que se solicito el foco.
  useEffect(() => {
    if (focusSummaryToken > 0) {
      summaryRef.current?.focus()
    }
  }, [focusSummaryToken])

  return (
    <div className="min-h-dvh text-ink">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-sm font-medium text-muted hover:text-ink">
            ← Volver al menú
          </Link>

          <ThemeToggle />
        </div>

        <header className="mt-2 text-center">
          {logoFailed ? (
            <>
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted">
                UPB-COMPANY presenta
              </p>
              <p className="mt-1 text-xl font-semibold uppercase tracking-[0.16em] text-ink">
                The Nexus Battles VI
              </p>
              <p className="text-xs uppercase tracking-[0.3em] text-brand">
                Return of the Warriors
              </p>
              <span
                aria-hidden="true"
                className="mx-auto mt-2 block h-0.5 w-16 rounded-full bg-brand"
              />
            </>
          ) : (
            <>
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted">
                UPB-COMPANY presenta
              </p>
              <img
                src={LOGO_SRC}
                alt="The Nexus Battles VI — Return of the Warriors"
                width={1600}
                height={600}
                // El asset es un banner ancho (~2.67:1), no un icono: necesita
                // mas ancho que un logo cuadrado para que "RETURN OF THE
                // WARRIORS" siga siendo legible a este tamano.
                className="mx-auto mt-1 h-auto w-[280px] max-w-full sm:w-[420px]"
                onError={() => {
                  setLogoFailed(true)
                }}
              />
            </>
          )}
        </header>

        <main className="mt-6 pb-10">
          {pendingEmail !== null ? (
            <ConfirmationStep
              email={pendingEmail}
              code={code}
              onCodeChange={setCode}
              onConfirm={() => {
                void handleConfirm()
              }}
              confirming={confirming}
              confirmed={confirmed}
              failure={confirmFailure}
              onGoToLogin={() => {
                void navigate('/login')
              }}
            />
          ) : (
            <>
              <h1 className="text-center text-xl font-semibold text-ink">Crear cuenta</h1>
              <p className="mx-auto mt-1.5 max-w-lg text-center text-sm text-muted">
                Completa tus datos para unirte a Nexus Battles VI. Todos los campos son
                obligatorios.
              </p>

              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSubmit()
                }}
                className="mt-6 space-y-5"
              >
                {issues.length > 0 && (
                  <div
                    ref={summaryRef}
                    role="alert"
                    tabIndex={-1}
                    className="rounded-lg border border-danger bg-danger/10 p-4"
                  >
                    <p className="text-sm font-semibold text-danger">
                      Revisa los siguientes campos antes de completar el registro:
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-danger">
                      {issues.map(([field, message]) => (
                        <li key={field}>
                          <a href={`#${field}`} className="underline">
                            {message}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {failure !== null && (
                  <p
                    role="alert"
                    className="rounded-lg border border-danger bg-danger/10 p-4 text-sm text-danger"
                  >
                    {failure}
                  </p>
                )}

                <Section title="Datos personales">
                  <div className="space-y-4">
                    <FieldRow>
                      <Field
                        id={FIELD.firstName}
                        label="Nombres"
                        hint="Campo obligatorio."
                        {...(visible[FIELD.firstName] === undefined
                          ? {}
                          : { error: visible[FIELD.firstName] })}
                      >
                        {(field) => (
                          <input
                            {...field}
                            type="text"
                            autoComplete="given-name"
                            value={values.firstName}
                            onBlur={() => {
                              markTouched(FIELD.firstName)
                            }}
                            onChange={(event) => {
                              setValue('firstName', event.target.value)
                            }}
                          />
                        )}
                      </Field>

                      <Field
                        id={FIELD.lastName}
                        label="Apellidos"
                        hint="Campo obligatorio."
                        {...(visible[FIELD.lastName] === undefined
                          ? {}
                          : { error: visible[FIELD.lastName] })}
                      >
                        {(field) => (
                          <input
                            {...field}
                            type="text"
                            autoComplete="family-name"
                            value={values.lastName}
                            onBlur={() => {
                              markTouched(FIELD.lastName)
                            }}
                            onChange={(event) => {
                              setValue('lastName', event.target.value)
                            }}
                          />
                        )}
                      </Field>
                    </FieldRow>

                    <FieldRow>
                      <Field
                        id={FIELD.email}
                        label="Correo electrónico"
                        hint="Usaremos este correo para confirmar tu cuenta."
                        {...(visible[FIELD.email] === undefined
                          ? {}
                          : { error: visible[FIELD.email] })}
                      >
                        {(field) => (
                          <input
                            {...field}
                            type="email"
                            autoComplete="email"
                            value={values.email}
                            onBlur={() => {
                              markTouched(FIELD.email)
                            }}
                            onChange={(event) => {
                              setValue('email', event.target.value)
                            }}
                          />
                        )}
                      </Field>

                      <Field
                        id={FIELD.nickname}
                        label="Apodo"
                        hint="No se permiten palabras ofensivas ni nombres reservados."
                        counter={`${String(values.nickname.length)} / ${String(NICKNAME_MAX_LENGTH)} caracteres`}
                        {...(visible[FIELD.nickname] === undefined
                          ? {}
                          : { error: visible[FIELD.nickname] })}
                      >
                        {(field) => (
                          <input
                            {...field}
                            type="text"
                            autoComplete="nickname"
                            // Se impide al escribir y ademas se valida: `maxLength`
                            // no cubre un valor pegado por script.
                            maxLength={NICKNAME_MAX_LENGTH}
                            value={values.nickname}
                            onBlur={() => {
                              markTouched(FIELD.nickname)
                            }}
                            onChange={(event) => {
                              setValue('nickname', event.target.value)
                            }}
                          />
                        )}
                      </Field>
                    </FieldRow>

                    <Field
                      id={FIELD.password}
                      label="Contraseña"
                      hint="Más de 8 caracteres, con mayúscula, minúscula, número y símbolo."
                      {...(visible[FIELD.password] === undefined
                        ? {}
                        : { error: visible[FIELD.password] })}
                    >
                      {(field) => (
                        <PasswordField
                          {...field}
                          autoComplete="new-password"
                          value={values.password}
                          onBlur={() => {
                            markTouched(FIELD.password)
                          }}
                          onChange={(event) => {
                            setValue('password', event.target.value)
                          }}
                        />
                      )}
                    </Field>
                  </div>
                </Section>

                <Section title="Avatar">
                  <Field
                    id={FIELD.avatar}
                    label="Sube tu avatar (obligatorio)"
                    hint="Formato imagen · Tamaño máximo 500 MB"
                    {...(visible[FIELD.avatar] === undefined
                      ? {}
                      : { error: visible[FIELD.avatar] })}
                  >
                    {(field) => (
                      <input
                        {...field}
                        type="file"
                        // `accept` filtra el dialogo del sistema pero NO valida:
                        // el tipo se comprueba igualmente.
                        accept="image/*"
                        className={clsx(
                          field.className,
                          'file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-ink',
                        )}
                        onChange={(event) => {
                          markTouched(FIELD.avatar)
                          setValue('avatar', event.target.files?.[0] ?? null)
                        }}
                      />
                    )}
                  </Field>

                  {values.avatar !== null && (
                    <p className="mt-1.5 truncate text-xs text-muted">
                      Seleccionado: {values.avatar.name}
                    </p>
                  )}
                </Section>

                <Section
                  title="Preguntas de seguridad"
                  description="Se usarán para recuperar el acceso a tu cuenta. Responde las cuatro."
                >
                  {/*
                Una columna: con dos columnas, una pregunta que envuelve a dos
                lineas (la de los padres) empuja su input mas abajo que el de
                la columna vecina y el formulario se ve descuadrado.
              */}
                  <div className="space-y-5">
                    {SECURITY_QUESTIONS.map((question) => {
                      const id = securityFieldId(question.id)

                      return (
                        <Field
                          key={question.id}
                          id={id}
                          label={question.label}
                          {...(visible[id] === undefined ? {} : { error: visible[id] })}
                        >
                          {(field) => (
                            <input
                              {...field}
                              type="text"
                              autoComplete="off"
                              value={values.securityAnswers[question.id] ?? ''}
                              onBlur={() => {
                                markTouched(id)
                              }}
                              onChange={(event) => {
                                setValues((previous) => ({
                                  ...previous,
                                  securityAnswers: {
                                    ...previous.securityAnswers,
                                    [question.id]: event.target.value,
                                  },
                                }))
                              }}
                            />
                          )}
                        </Field>
                      )
                    })}
                  </div>
                </Section>

                <div>
                  <div className="flex items-start gap-3">
                    <input
                      id={FIELD.terms}
                      type="checkbox"
                      checked={values.acceptedTerms}
                      aria-required
                      aria-invalid={visible[FIELD.terms] !== undefined}
                      aria-describedby={
                        visible[FIELD.terms] === undefined ? undefined : `${FIELD.terms}-error`
                      }
                      onChange={(event) => {
                        markTouched(FIELD.terms)
                        setValue('acceptedTerms', event.target.checked)
                      }}
                      className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    />
                    <label htmlFor={FIELD.terms} className="text-sm text-ink">
                      He leído y acepto los Términos y Condiciones y la Política de Privacidad de
                      Nexus Battles VI.
                    </label>
                  </div>

                  {/*
                Los documentos van fuera de la etiqueta: una `label` no puede
                contener otro control sin dejar ambiguo que activa cada clic.
                Mientras un documento no exista, su control lo dice en lugar de
                abrir un destino inventado.
              */}
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-7 text-sm">
                    {LEGAL_DOCUMENTS.map((document) =>
                      document.href === null ? (
                        <button
                          key={document.id}
                          type="button"
                          className="font-medium text-brand underline"
                          onClick={() => {
                            setUnavailableDocument(document.label)
                          }}
                        >
                          {document.label}
                        </button>
                      ) : (
                        <a
                          key={document.id}
                          href={document.href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-brand underline"
                        >
                          {document.label}
                        </a>
                      ),
                    )}
                  </p>

                  {unavailableDocument !== null && (
                    <p role="status" className="mt-2 pl-7 text-xs text-muted">
                      {unavailableDocument}: el documento todavía no está publicado en la
                      aplicación.
                    </p>
                  )}

                  {visible[FIELD.terms] !== undefined && (
                    <p
                      id={`${FIELD.terms}-error`}
                      className="mt-2 flex items-start gap-1.5 pl-7 text-sm text-danger"
                    >
                      <span aria-hidden="true" className="font-bold leading-5">
                        !
                      </span>
                      <span>{MESSAGES.terms}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void navigate('/')
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={sending}>
                    Completar registro
                  </Button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
