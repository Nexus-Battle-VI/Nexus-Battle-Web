import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
import { initTheme, useTheme } from '@/shared/theme'
import { RecoveryPage } from './RecoveryPage'

const QUESTIONS = [
  { id: 'sq-01', statement: '¿Cuál era el nombre de tu primera mascota?' },
  { id: 'sq-02', statement: '¿Cuál es el nombre de la ciudad donde naciste?' },
] as const

const resetTheme = (): void => {
  globalThis.localStorage.clear()
  delete globalThis.document.documentElement.dataset.theme
  initTheme()
}

beforeEach(resetTheme)
afterEach(resetTheme)

const renderRecovery = (
  overrides: {
    startRecoveryFn?: () => Promise<{ challengeToken: string; questions: typeof QUESTIONS }>
    verifyAnswersFn?: () => Promise<void>
    verifyCodeFn?: () => Promise<void>
    resetPasswordFn?: () => Promise<void>
  } = {},
) =>
  renderWithProviders(
    <RecoveryPage
      startRecoveryFn={
        overrides.startRecoveryFn ??
        (() => Promise.resolve({ challengeToken: 'tok-1', questions: QUESTIONS }))
      }
      {...(overrides.verifyAnswersFn === undefined
        ? {}
        : { verifyAnswersFn: overrides.verifyAnswersFn })}
      {...(overrides.verifyCodeFn === undefined ? {} : { verifyCodeFn: overrides.verifyCodeFn })}
      {...(overrides.resetPasswordFn === undefined
        ? {}
        : { resetPasswordFn: overrides.resetPasswordFn })}
    />,
    { route: '/recover' },
  )

describe('RecoveryPage', () => {
  it('usa el control global de tema y aplica la seleccion oscura al documento', async () => {
    const user = userEvent.setup()
    useTheme.getState().setTheme('light')
    renderRecovery()

    expect(screen.getByRole('group', { name: 'Tema de la interfaz' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(useTheme.getState().theme).toBe('dark')
    expect(globalThis.document.documentElement.dataset.theme).toBe('dark')
  })

  it('muestra el paso de identificacion y el enlace a login', () => {
    renderRecovery()

    expect(screen.getByRole('heading', { name: 'Recuperar contraseña' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(screen.getByText('1. Identificación')).toBeInTheDocument()
  })

  it('recorre los cuatro pasos cuando el servicio autoriza cada avance', async () => {
    const user = userEvent.setup()
    const verifyAnswersFn = vi.fn().mockResolvedValue(undefined)
    const verifyCodeFn = vi.fn().mockResolvedValue(undefined)
    const resetPasswordFn = vi.fn().mockResolvedValue(undefined)

    renderRecovery({ verifyAnswersFn, verifyCodeFn, resetPasswordFn })

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@nexus.test')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByText('¿Cuál era el nombre de tu primera mascota?'),
    ).toBeInTheDocument()

    const answerFields = screen.getAllByPlaceholderText('Escribe tu respuesta')
    await user.type(answerFields[0]!, 'luna')
    await user.type(answerFields[1]!, 'bogota')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByLabelText('Código de verificación')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Código de verificación'), '000000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByLabelText('Nueva contraseña')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave9!')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'NuevaClave9!')
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))

    expect(
      await screen.findByRole('heading', { name: 'Contraseña actualizada' }),
    ).toBeInTheDocument()
    expect(verifyAnswersFn).toHaveBeenCalled()
    expect(verifyCodeFn).toHaveBeenCalledWith('tok-1', '000000')
    expect(resetPasswordFn).toHaveBeenCalledWith('tok-1', 'NuevaClave9!')
  })

  it('no avanza si las respuestas son rechazadas', async () => {
    const user = userEvent.setup()
    renderRecovery({
      verifyAnswersFn: () => {
        throw new HttpError(400, 'No', { message: 'No' })
      },
    })

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@nexus.test')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('¿Cuál era el nombre de tu primera mascota?')

    const answerFields = screen.getAllByPlaceholderText('Escribe tu respuesta')
    await user.type(answerFields[0]!, 'mala')
    await user.type(answerFields[1]!, 'mala')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible continuar con la recuperación',
    )
    expect(screen.queryByLabelText('Código de verificación')).not.toBeInTheDocument()
  })

  it('deja visible el enunciado si una respuesta queda vacia', async () => {
    const user = userEvent.setup()
    const verifyAnswersFn = vi.fn()
    renderRecovery({ verifyAnswersFn })

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@nexus.test')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('¿Cuál era el nombre de tu primera mascota?')

    await user.type(screen.getAllByPlaceholderText('Escribe tu respuesta')[0]!, 'luna')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('¿Cuál era el nombre de tu primera mascota?')).toBeInTheDocument()
    expect(screen.getByText('¿Cuál es el nombre de la ciudad donde naciste?')).toBeInTheDocument()
    expect(screen.getAllByText('Responde esta pregunta.')).toHaveLength(1)
    expect(verifyAnswersFn).not.toHaveBeenCalled()
  })

  it('exige el correo antes de llamar al servicio', async () => {
    const user = userEvent.setup()
    const startRecoveryFn = vi.fn()
    renderRecovery({ startRecoveryFn })

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Ingresa el correo asociado a tu cuenta.')).toBeInTheDocument()
    expect(startRecoveryFn).not.toHaveBeenCalled()
  })
})
