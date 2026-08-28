import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { routes } from '@/routes/routes'
import { RegistrationPage } from './RegistrationPage'
import { SECURITY_QUESTIONS, THEME_STORAGE_KEY } from './constants'
import { MESSAGES, NICKNAME_MAX_LENGTH } from './validation'
import type { RegistrationValues } from './validation'

/**
 * `applyAccept: false` reproduce a quien elige "todos los archivos" en el
 * dialogo del sistema: `accept` es una sugerencia, no una validacion, y la
 * pantalla tiene que comprobar el tipo de todos modos.
 */
const setup = () => userEvent.setup({ applyAccept: false })

const imageOfSize = (bytes: number, type = 'image/png', name = 'avatar.png'): File => {
  const file = new File(['x'], name, { type })

  // `File` no permite fabricar un tamano arbitrario sin reservar esa memoria:
  // se redefine para poder ejercitar el limite de 500 MB sin construir medio
  // gigabyte en la prueba.
  Object.defineProperty(file, 'size', { value: bytes })

  return file
}

/**
 * Texto del error **asociado al campo**, buscado por el identificador al que
 * apunta `aria-describedby`. El mismo mensaje aparece tambien en el resumen del
 * formulario, y lo que se verifica aqui es justamente la asociacion.
 */
const fieldError = (fieldId: string): string =>
  globalThis.document.getElementById(`${fieldId}-error`)?.textContent ?? ''

const renderPage = (onSubmit?: (values: RegistrationValues) => Promise<void>): void => {
  renderWithProviders(
    onSubmit === undefined ? <RegistrationPage /> : <RegistrationPage onSubmit={onSubmit} />,
    { route: '/register' },
  )
}

const fillValidForm = async (user: ReturnType<typeof setup>): Promise<void> => {
  await user.type(screen.getByLabelText('Nombres'), 'Ana')
  await user.type(screen.getByLabelText('Apellidos'), 'Restrepo')
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@nexus.test')
  await user.type(screen.getByLabelText('Contraseña'), 'Nexus#2026')
  await user.type(screen.getByLabelText('Apodo'), 'ana-guerrera')
  await user.upload(screen.getByLabelText('Sube tu avatar (obligatorio)'), imageOfSize(4096))

  for (const question of SECURITY_QUESTIONS) {
    await user.type(screen.getByLabelText(question.label), 'respuesta')
  }

  await user.click(screen.getByRole('checkbox'))
}

describe('RegistrationPage', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  afterEach(() => {
    globalThis.localStorage.clear()
  })

  it('muestra la identidad del producto y el titulo de la pantalla', () => {
    renderPage()

    expect(screen.getByText('UPB-COMPANY presenta')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Crear cuenta' })).toBeInTheDocument()
  })

  it('muestra el logotipo del producto con un texto alternativo descriptivo', () => {
    renderPage()

    // jsdom no dispara `error` sobre un `<img>` sin backend real de red, asi
    // que en pruebas siempre se ve la imagen (no su alternativa textual). Lo
    // que se verifica aqui es que, se vea la imagen o su fallback, la
    // identidad del producto sigue siendo accesible por texto.
    expect(screen.getByAltText('The Nexus Battles VI — Return of the Warriors')).toBeInTheDocument()
  })

  it('/register se sirve sin la navegacion principal de la aplicacion', async () => {
    // Se monta el enrutador real, no el componente suelto: lo que se verifica
    // es que la ruta NO cuelga de `AppLayout`.
    const router = createMemoryRouter(routes, { initialEntries: ['/register'] })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Crear cuenta' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument()

    for (const label of ['Catalogo', 'Inventario', 'Comunidad', 'Pedidos', 'Notificaciones']) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
    }
  })

  it('la raiz publica ya no sirve el formulario de registro directamente', async () => {
    // Hasta esta correccion, `/` renderizaba `RegistrationPage`. Ahora `/` es
    // el menu publico de Nexus (`LandingPage`) y HU-01 real vive unicamente
    // en `/register`; ver `routes.test.tsx` para el contenido esperado de `/`.
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    await screen.findByRole('link', { name: 'Crear cuenta' })

    expect(
      screen.queryByRole('heading', { level: 1, name: 'Crear cuenta' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nombres')).not.toBeInTheDocument()
  })

  it('renderiza todos los campos obligatorios con su etiqueta asociada', () => {
    renderPage()

    for (const label of [
      'Nombres',
      'Apellidos',
      'Correo electrónico',
      'Contraseña',
      'Apodo',
      'Sube tu avatar (obligatorio)',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }

    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute(
      'placeholder',
      'Mínimo 9 caracteres',
    )
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completar registro' })).toBeInTheDocument()
  })

  it('muestra las cuatro preguntas de seguridad, cada una con su respuesta', () => {
    renderPage()

    expect(SECURITY_QUESTIONS).toHaveLength(4)

    for (const question of SECURITY_QUESTIONS) {
      expect(screen.getByLabelText(question.label)).toBeInTheDocument()
    }
  })

  it('no muestra errores antes de cualquier interaccion', () => {
    renderPage()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombres')).toHaveAttribute('aria-invalid', 'false')
    expect(fieldError('first-name')).toBe('')
  })

  it('al enviar vacio exige nombres, apellidos, avatar, las cuatro respuestas y los terminos', async () => {
    const onSubmit = vi.fn<(values: RegistrationValues) => Promise<void>>()
    const user = setup()

    renderPage(onSubmit)
    await user.click(screen.getByRole('button', { name: 'Completar registro' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa los siguientes campos')
    expect(fieldError('first-name')).toContain(MESSAGES.required)
    expect(fieldError('last-name')).toContain(MESSAGES.required)
    expect(fieldError('avatar')).toContain(MESSAGES.avatarMissing)
    expect(fieldError('terms')).toContain(MESSAGES.terms)

    for (const question of SECURITY_QUESTIONS) {
      expect(fieldError(`security-${question.id}`)).toContain(MESSAGES.securityAnswer)
    }

    expect(screen.getByLabelText('Nombres')).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rechaza un correo con formato invalido y lo asocia al campo', async () => {
    const user = setup()

    renderPage(vi.fn())
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana')
    await user.tab()

    const email = screen.getByLabelText('Correo electrónico')

    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email.getAttribute('aria-describedby') ?? '').toContain('email-error')
    expect(fieldError('email')).toContain(MESSAGES.email)
  })

  it('rechaza una contrasena de 8 caracteres y acepta la de 9 con la composicion exigida', async () => {
    const user = setup()

    renderPage(vi.fn())

    const password = screen.getByLabelText('Contraseña')

    await user.type(password, 'Nexus#12')
    await user.tab()

    expect(fieldError('password')).toContain(MESSAGES.password)

    await user.type(password, '3')

    await waitFor(() => {
      expect(fieldError('password')).toBe('')
    })
  })

  it('rechaza una contrasena larga sin la composicion exigida', async () => {
    const user = setup()

    renderPage(vi.fn())
    await user.type(screen.getByLabelText('Contraseña'), 'nexusbattles')
    await user.tab()

    expect(fieldError('password')).toContain(MESSAGES.password)
  })

  it('impide escribir mas de 32 caracteres en el apodo y muestra el contador', async () => {
    const user = setup()

    renderPage(vi.fn())

    const nickname = screen.getByLabelText('Apodo')

    await user.type(nickname, 'a'.repeat(NICKNAME_MAX_LENGTH + 1))

    expect(nickname).toHaveValue('a'.repeat(NICKNAME_MAX_LENGTH))
    expect(screen.getByText('32 / 32 caracteres')).toBeInTheDocument()
  })

  it('rechaza un avatar que no es una imagen', async () => {
    const user = setup()

    renderPage(vi.fn())
    await user.upload(
      screen.getByLabelText('Sube tu avatar (obligatorio)'),
      new File(['x'], 'contrato.pdf', { type: 'application/pdf' }),
    )

    await waitFor(() => {
      expect(fieldError('avatar')).toContain(MESSAGES.avatarType)
    })
  })

  it('rechaza un avatar de mas de 500 MB', async () => {
    const user = setup()

    renderPage(vi.fn())
    await user.upload(
      screen.getByLabelText('Sube tu avatar (obligatorio)'),
      imageOfSize(500 * 1024 * 1024 + 1),
    )

    await waitFor(() => {
      expect(fieldError('avatar')).toContain(MESSAGES.avatarSize)
    })
  })

  it('no permite completar el registro sin aceptar los terminos', async () => {
    const onSubmit = vi.fn<(values: RegistrationValues) => Promise<void>>()
    const user = setup()

    renderPage(onSubmit)
    await fillValidForm(user)
    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('checkbox')).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Completar registro' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(fieldError('terms')).toContain(MESSAGES.terms)
  })

  it('envia una sola vez y deshabilita el boton mientras procesa', async () => {
    const onSubmit = vi.fn<(values: RegistrationValues) => Promise<void>>()
    const user = setup()

    let release: () => void = () => undefined

    onSubmit.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )

    renderPage(onSubmit)
    await fillValidForm(user)

    const button = screen.getByRole('button', { name: 'Completar registro' })

    await user.click(button)
    await user.click(button)
    await user.click(button)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    const values = onSubmit.mock.calls[0]?.[0]

    expect(values?.email).toBe('ana@nexus.test')
    expect(values?.avatar?.type).toBe('image/png')

    release()

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Cuenta creada/u)
    })
    expect(screen.getByRole('button', { name: 'Completar registro' })).toBeDisabled()
  })

  it('muestra confirmacion cuando el servicio acepta el registro', async () => {
    const user = setup()
    const onSubmit = vi.fn<(values: RegistrationValues) => Promise<void>>().mockResolvedValue()

    renderPage(onSubmit)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Completar registro' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/Cuenta creada/u)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('muestra el mensaje del servicio cuando el registro falla', async () => {
    const user = setup()
    const onSubmit = vi
      .fn<(values: RegistrationValues) => Promise<void>>()
      .mockRejectedValue(
        new Error('Ya existe una cuenta registrada con el correo "ana@nexus.test".'),
      )

    renderPage(onSubmit)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Completar registro' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Ya existe una cuenta/u)
    expect(screen.queryByText(/Cuenta creada/u)).not.toBeInTheDocument()
  })

  it('ofrece los documentos legales como acciones y declara que faltan', async () => {
    const user = setup()

    renderPage(vi.fn())
    await user.click(screen.getByRole('button', { name: 'Términos y Condiciones' }))

    expect(screen.getByRole('button', { name: 'Política de Privacidad' })).toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent(/todavía no está publicado/u)
  })

  it('Cancelar navega a la raiz publica de la aplicacion', async () => {
    // La raiz es hoy la unica pantalla publica de entrada, y tambien sirve el
    // registro: navegar ahi desde /register vuelve, en efecto, a un
    // formulario limpio. Lo que importa es que el boton navega de verdad
    // (cambia la URL) y no que sea un enlace roto.
    const user = setup()
    const router = createMemoryRouter(routes, { initialEntries: ['/register'] })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    expect(router.state.location.pathname).toBe('/register')

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/')
    })
  })

  it('cambia el tema desde la propia pantalla y persiste solo esa preferencia', async () => {
    const user = setup()

    renderPage(vi.fn())

    const dark = screen.getByRole('button', { name: 'Dark' })

    await user.click(dark)

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false')
    expect(globalThis.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    await user.click(screen.getByRole('button', { name: 'Light' }))

    expect(globalThis.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('recupera el tema elegido al volver a abrir la pantalla', () => {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    renderPage()

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('no guarda datos del formulario en el almacenamiento del navegador', async () => {
    const user = setup()

    renderPage(vi.fn())
    await fillValidForm(user)

    expect(globalThis.sessionStorage.length).toBe(0)
    expect(globalThis.localStorage.getItem('nexus-battles.register-theme')).toBeNull()
    expect(globalThis.localStorage.length).toBe(0)
  })

  it('se puede recorrer con el teclado desde el primer campo hasta el envio', async () => {
    const user = setup()

    renderPage(vi.fn())

    await user.click(screen.getByLabelText('Nombres'))
    await user.tab()

    expect(screen.getByLabelText('Apellidos')).toHaveFocus()

    await user.tab()

    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus()
  })
})
