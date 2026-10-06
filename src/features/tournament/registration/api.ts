import { httpClient } from '@/lib/http'

export const TOURNAMENT_CONTRACT_VERSION = 'torneos-hu77-84-78-hu83-v2.0.0'
export interface TeamAvatar {
  readonly kind: 'ACCOUNT_AVATAR'
  readonly subject: string
}
export type PaidMethod =
  | { readonly method: 'CREDITS'; readonly amount: number }
  | {
      readonly method: 'SIMULATED_MONEY'
      readonly amountMinor: number
      readonly currency: string
      readonly minorUnit: number
    }
export type EntryPolicy =
  | { readonly version: 1; readonly free: true; readonly methods: readonly [] }
  | { readonly version: 1; readonly free: false; readonly methods: readonly PaidMethod[] }
export interface EntryTournament {
  readonly id: string
  readonly name: string
  readonly entryPolicy: EntryPolicy
  readonly entryFee: number | null
  readonly open: boolean
  readonly opensAt: string
  readonly closesAt: string
  readonly startsAt: string
  readonly bracketPublished: boolean
}
export interface RegistrationReceipt {
  readonly id: string
  readonly kind: 'TEAM_REGISTRATION'
  readonly tournamentId: string
  readonly teamId: string
  readonly memberIds: readonly [string, string]
  readonly registeredAt: string
  readonly status: 'REGISTERED'
}
export type EntryPayment = { readonly payerId: string; readonly realMoneyMoved: false } & (
  | { readonly method: 'FREE'; readonly amount: 0; readonly chargeId: null }
  | { readonly method: 'CREDITS'; readonly amount: number; readonly chargeId: string }
  | {
      readonly method: 'SIMULATED_MONEY'
      readonly amountMinor: number
      readonly currency: string
      readonly minorUnit: number
      readonly chargeId: string
      readonly reference: string
      readonly maskedCard: string
      readonly simulated: true
    }
)
export interface EntryReceipt {
  readonly id: string
  readonly kind: 'ENTRY_CONFIRMATION'
  readonly tournamentId: string
  readonly teamId: string
  readonly slot: number
  readonly confirmedAt: string
  readonly payment: EntryPayment
}
export interface EntryTeam {
  readonly id: string
  readonly tournamentId: string
  readonly name: string
  readonly avatar: TeamAvatar
  readonly ownerId: string
  readonly companionId: string
  readonly status:
    | 'AWAITING_CONSENT'
    | 'PENDING_PAYMENT'
    | 'PAYMENT_PENDING'
    | 'COMPENSATING'
    | 'CONFIRMED'
    | 'CANCELLED'
  readonly createdAt: string
  readonly consentAt: string | null
  readonly consentVersion: string | null
  readonly confirmedAt: string | null
  readonly slot: number | null
  readonly registrationReceipt: RegistrationReceipt
  readonly entryReceipt: EntryReceipt | null
  readonly failure: { readonly code: string; readonly message: string } | null
}
export interface EntryView {
  readonly tournament: EntryTournament
  readonly capacity: {
    readonly confirmed: number
    readonly reserved: number
    readonly available: number
  }
  readonly teams: readonly EntryTeam[]
}
export interface SimulatedCard {
  readonly holder: string
  readonly number: string
  readonly expiry: string
  readonly securityCode: string
}
export interface RegistrationInput {
  readonly operationId: string
  readonly name: string
  readonly avatar: TeamAvatar
  readonly companionId: string
}
export interface EntryInput {
  readonly operationId: string
  readonly method?: PaidMethod['method']
  readonly card?: SimulatedCard
}
export interface CreateTournamentInput {
  readonly operationId: string
  readonly name: string
  readonly entryPolicy: EntryPolicy
  readonly opensAt: string
  readonly closesAt: string
  readonly startsAt: string
}
export interface RegistrationApi {
  create: (input: CreateTournamentInput) => Promise<EntryTournament>
  list: () => Promise<readonly EntryTournament[]>
  view: (id: string) => Promise<EntryView>
  register: (id: string, input: RegistrationInput) => Promise<EntryTeam>
  consent: (id: string, teamId: string, operationId: string, accept: boolean) => Promise<EntryTeam>
  cancel: (id: string, teamId: string, operationId: string) => Promise<EntryTeam>
  enter: (id: string, teamId: string, input: EntryInput) => Promise<EntryTeam>
}
const path = (id: string, teamId: string) =>
  `/v1/tournaments/${encodeURIComponent(id)}/teams/${encodeURIComponent(teamId)}`
export const registrationApi: RegistrationApi = {
  create: (input) => httpClient.post('/v1/tournaments/admin', input),
  list: () => httpClient.get('/v1/tournaments'),
  view: (id) => httpClient.get(`/v1/tournaments/${encodeURIComponent(id)}/registration`),
  register: (id, input) =>
    httpClient.post(`/v1/tournaments/${encodeURIComponent(id)}/teams`, input),
  consent: (id, teamId, operationId, accept) =>
    httpClient.post(`${path(id, teamId)}/consent`, { operationId, accept }),
  cancel: (id, teamId, operationId) =>
    httpClient.post(`${path(id, teamId)}/cancel`, { operationId }),
  enter: (id, teamId, input) => httpClient.post(`${path(id, teamId)}/entry`, input),
}
