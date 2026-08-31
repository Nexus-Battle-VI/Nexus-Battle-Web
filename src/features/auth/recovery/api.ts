import { httpClient } from '@/lib/http'

export interface RecoveryQuestion {
  readonly id: string
  readonly statement: string
}

export interface RecoveryStartResult {
  readonly challengeToken: string
  readonly questions: readonly RecoveryQuestion[]
}

export interface RecoveryAnswer {
  readonly questionId: string
  readonly answer: string
}

export const startRecovery = async (email: string): Promise<RecoveryStartResult> =>
  httpClient.post<RecoveryStartResult>('/accounts/recovery', { email })

export const verifyRecoveryAnswers = async (
  challengeToken: string,
  answers: readonly RecoveryAnswer[],
): Promise<void> => {
  await httpClient.post('/accounts/recovery/answers', { challengeToken, answers })
}

export const verifyRecoveryCode = async (challengeToken: string, code: string): Promise<void> => {
  await httpClient.post('/accounts/recovery/code', { challengeToken, code })
}

export const resetRecoveryPassword = async (
  challengeToken: string,
  password: string,
): Promise<void> => {
  await httpClient.post('/accounts/recovery/password', { challengeToken, password })
}
