import { describe, expect, it, vi } from 'vitest'

import {
  ACCOUNT_QUESTION_IDS,
  confirmRegistration,
  registerAccount,
  toRegistrationFormData,
} from './api'
import { SECURITY_QUESTIONS } from './constants'
import type { RegistrationValues } from './validation'

const validValues = (): RegistrationValues => ({
  firstName: 'Ana',
  lastName: 'Ramirez',
  email: 'ana@nexus.test',
  password: 'Abcdefg1!',
  nickname: 'Ana Ramirez',
  avatar: new File(['png'], 'a.png', { type: 'image/png' }),
  securityAnswers: {
    'first-pet': 'luna',
    'birth-city': 'bogota',
    'childhood-nickname': 'nana',
    'parents-city': 'medellin',
  },
  acceptedTerms: true,
})

describe('toRegistrationFormData', () => {
  it('mapea campos e IDs del catalogo de Account', () => {
    const form = toRegistrationFormData(validValues())

    expect(form.get('firstNames')).toBe('Ana')
    expect(form.get('lastNames')).toBe('Ramirez')
    expect(form.get('email')).toBe('ana@nexus.test')
    // SI se envia: con el alta server-side (ADR-004) Account la entrega a
    // Cognito por `signUp` y no la persiste. Se afirma su PRESENCIA con el valor
    // exacto, no solo que la clave exista.
    expect(form.get('password')).toBe('Abcdefg1!')
    expect(form.get('nickname')).toBe('Ana Ramirez')
    expect(form.get('termsAccepted')).toBe('true')

    const rawAnswers = form.get('securityAnswers')
    expect(typeof rawAnswers).toBe('string')

    const answers = JSON.parse(rawAnswers as string) as {
      questionId: string
      answer: string
    }[]

    expect(answers).toEqual([
      { questionId: 'sq-01', answer: 'luna' },
      { questionId: 'sq-02', answer: 'bogota' },
      { questionId: 'sq-03', answer: 'nana' },
      { questionId: 'sq-04', answer: 'medellin' },
    ])
    expect(SECURITY_QUESTIONS.map((question) => ACCOUNT_QUESTION_IDS[question.id])).toEqual([
      'sq-01',
      'sq-02',
      'sq-03',
      'sq-04',
    ])

    const avatar = form.get('avatar')

    expect(avatar).toBeInstanceOf(File)
    expect((avatar as File).name).toBe('a.png')
  })

  it('rechaza un registro sin avatar', () => {
    expect(() => toRegistrationFormData({ ...validValues(), avatar: null })).toThrow(
      /avatar es obligatorio/,
    )
  })
})

describe('registerAccount', () => {
  it('envia FormData a POST /accounts', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'acc-1', email: 'ana@nexus.test' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchImpl)

    try {
      await registerAccount(validValues())
    } finally {
      vi.unstubAllGlobals()
    }

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts',
      expect.objectContaining({ method: 'POST' }),
    )

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit

    expect(init.body).toBeInstanceOf(FormData)
    expect((init.headers as Record<string, string> | undefined)?.['content-type']).toBeUndefined()
  })
})

describe('confirmRegistration', () => {
  it('envia identifier y codigo como JSON a POST /accounts/confirmation', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'acc-1', status: 'ACTIVE' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchImpl)

    try {
      await confirmRegistration('ana@nexus.test', '123456')
    } finally {
      vi.unstubAllGlobals()
    }

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts/confirmation',
      expect.objectContaining({ method: 'POST' }),
    )

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit

    expect((init.headers as Record<string, string> | undefined)?.['content-type']).toBe(
      'application/json',
    )
    expect(JSON.parse(init.body as string)).toEqual({
      identifier: 'ana@nexus.test',
      code: '123456',
    })
  })
})
