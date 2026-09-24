import { useEffect } from 'react'
import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'

import { httpClient } from '@/lib/http'

import { queryKeys } from './query-keys'
import { useSession } from './session'

/**
 * Saldo y progreso de cofre del jugador autenticado (HU-22/HU-23,
 * `GET /v1/wallet/me`). El servicio deduce el jugador del testimonio; Web
 * nunca envia un identificador.
 *
 * Vive en `shared` porque lo consumen varias superficies: la cabecera
 * (`CreditsBadge`), Jugar Online (apuesta, recompensa) y la subasta. Una
 * feature no importa de otra; todas importan de aqui.
 */
export interface WalletSnapshot {
  /** Saldo total. Una apuesta reservada NO lo reduce (HU-23 §4.1). */
  readonly balance: number
  /**
   * HU-23 (aditivo, contrato §6): suma de las apuestas `ACTIVE` del jugador.
   * Opcional para no romper contra un Wallet anterior a HU-23; cuando falta,
   * la UI no puede avisar de antemano y la validacion real queda en el backend.
   */
  readonly reserved?: number
  /** HU-23: `balance - reserved`, lo que el jugador puede gastar o apostar. */
  readonly available?: number
  readonly victoryProgress: number
  readonly weeklyChestCount: number
  readonly weeklyChestLimit: number
  readonly threshold: number
}

export const fetchWallet = (signal?: AbortSignal): Promise<WalletSnapshot> =>
  httpClient.get<WalletSnapshot>('/v1/wallet/me', signal)

/** Saldo del jugador autenticado; deshabilitado sin sesion. */
export const useWallet = (): UseQueryResult<WalletSnapshot> => {
  const subject = useSession((state) => state.subject)

  return useQuery({
    queryKey: queryKeys.wallet.me,
    queryFn: ({ signal }) => fetchWallet(signal),
    enabled: subject !== null,
  })
}

/** Creditos que el jugador puede usar: `available` (HU-23) o, en un Wallet anterior, `balance`. */
export const spendableCredits = (wallet: WalletSnapshot): number =>
  wallet.available ?? wallet.balance

/**
 * Marca el saldo como desactualizado: lo releen la cabecera y cualquier panel
 * que lo muestre, sin recargar la pagina. Se usa despues de TODO lo que Wallet
 * confirma que movio creditos (reserva o liberacion de una apuesta, su
 * liquidacion, una recompensa). Nunca calcula un saldo: solo pide el vigente.
 */
export const invalidateWallet = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.wallet.me })
}

/**
 * Relee el saldo cada vez que `signal` cambia a un valor no nulo: p. ej. el
 * estado terminal de una apuesta o la entrega confirmada de una recompensa.
 * Un mismo valor no vuelve a disparar la lectura (sin bucles).
 */
export const useRefreshWalletOn = (signal: string | null): void => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (signal !== null) {
      invalidateWallet(queryClient)
    }
  }, [signal, queryClient])
}
