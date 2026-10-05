import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { readIntent, saveIntent } from './operationIntents'
import { useOperation } from './useOperation'
import { amountInMinorUnits } from './money'
import { priceLabel, matchStatus } from './presentation'

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})
describe('intenciones duraderas del cliente', () => {
  it('reutiliza operationId tras timeout y remontaje; impide cambiar método incierto', async () => {
    const command = vi.fn().mockRejectedValue(new TypeError('Respuesta perdida'))
    const first = renderHook(() => useOperation('A:T:team'))
    await act(async () => {
      await first.result.current.run('entry:CREDITS', 'PENDING_PAYMENT', command)
    })
    const id = command.mock.calls[0]?.[0]
    first.unmount()
    const next = renderHook(() => useOperation('A:T:team'))
    await act(async () => {
      await next.result.current.run('entry:SIMULATED_MONEY', 'PENDING_PAYMENT', command)
    })
    expect(command).toHaveBeenCalledTimes(1)
    await act(async () => {
      await next.result.current.run('entry:CREDITS', 'PENDING_PAYMENT', command)
    })
    expect(command.mock.calls[1]?.[0]).toBe(id)
    expect(next.result.current.intent?.phase).toBe('UNCERTAIN')
  })
  it('un rechazo conserva el ID; solo corregir explícitamente crea otro intento', async () => {
    const rejected = new HttpError(422, 'Saldo insuficiente', { code: 'INSUFFICIENT_BALANCE' })
    const command = vi.fn().mockRejectedValue(rejected)
    const { result } = renderHook(() => useOperation('payment-rejected'))
    await act(async () => {
      await result.current.run('entry:CREDITS', 'pending', command)
    })
    const id = command.mock.calls[0]?.[0]
    await act(async () => {
      await result.current.run('entry:CREDITS', 'pending', command)
    })
    expect(command.mock.calls[1]?.[0]).toBe(id)
    act(() => {
      result.current.resetRejected()
    })
    command.mockResolvedValue('confirmed')
    await act(async () => {
      await result.current.run('entry:CREDITS', 'pending', command)
    })
    expect(command.mock.calls[2]?.[0]).not.toBe(id)
    expect(readIntent('payment-rejected')).toBeNull()
  })
  it('conflictos, timeouts, límites y sesión no permiten abandonar la intención', async () => {
    for (const [status, code] of [
      [409, 'OPERATION_CONFLICT'],
      [409, 'CAPACITY_EXHAUSTED'],
      [408, 'REQUEST_TIMEOUT'],
      [429, 'RATE_LIMITED'],
      [503, 'UNAVAILABLE'],
      [401, 'UNAUTHORIZED'],
      [403, 'FORBIDDEN'],
    ] as const) {
      const { result, unmount } = renderHook(() => useOperation('uncertain-' + code))
      const command = vi
        .fn<(operationId: string) => Promise<never>>()
        .mockRejectedValue(new HttpError(status, code, { code }))
      await act(async () => {
        await result.current.run('entry:CREDITS', 'pending', command)
      })
      act(() => {
        result.current.resetRejected()
      })
      expect(result.current.intent?.phase).toBe('UNCERTAIN')
      await act(async () => {
        await result.current.run('entry:CREDITS', 'pending', command)
      })
      expect(command.mock.calls[1]?.[0]).toBe(command.mock.calls[0]?.[0])
      unmount()
    }
  })
  it('reservas/compensación conservan el intento y dos clics no duplican la petición', async () => {
    let resolve: (value: string) => void = () => undefined
    const command = vi.fn(
      () =>
        new Promise<string>((done) => {
          resolve = done
        }),
    )
    const { result } = renderHook(() => useOperation('pending-charge'))
    let completion: Promise<string | null> | undefined
    act(() => {
      completion = result.current.run('entry:CREDITS', 'pending', command, () => true)
    })
    await act(async () => {
      await result.current.run('entry:CREDITS', 'pending', command)
    })
    expect(command).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolve('PAYMENT_PENDING')
      await completion
    })
    expect(result.current.intent?.phase).toBe('UNCERTAIN')
  })
  it('aísla por actor y no persiste más que id/huella/fase', () => {
    saveIntent('A:T', {
      operationId: 'id-A',
      fingerprint: 'entry:SIMULATED_MONEY',
      phase: 'UNCERTAIN',
    })
    expect(readIntent('B:T')).toBeNull()
    expect(JSON.parse(sessionStorage.getItem('nexus:tournament:intent:v2:A:T')!)).toEqual({
      operationId: 'id-A',
      fingerprint: 'entry:SIMULATED_MONEY',
      phase: 'UNCERTAIN',
    })
  })
  it('si la escritura falla por cuota, recupera el mismo ID aunque la lectura siga disponible', async () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio', 'QuotaExceededError')
    })
    const command = vi
      .fn<(operationId: string) => Promise<string>>()
      .mockRejectedValueOnce(new TypeError('Respuesta perdida'))
      .mockResolvedValueOnce('CONFIRMED')
    const first = renderHook(() => useOperation('quota-recovery'))
    await act(async () => {
      await first.result.current.run('entry:CREDITS', 'pending', command)
    })
    expect(sessionStorage.getItem('nexus:tournament:intent:v2:quota-recovery')).toBeNull()
    first.unmount()
    write.mockRestore()
    const next = renderHook(() => useOperation('quota-recovery'))
    await act(async () => {
      await next.result.current.run('entry:CREDITS', 'pending', command)
    })
    expect(command.mock.calls[1]?.[0]).toBe(command.mock.calls[0]?.[0])
    expect(readIntent('quota-recovery')).toBeNull()
  })
})
describe('importes y estados sin suposiciones del cliente', () => {
  it('respeta moneda y precisión configuradas sin convertir créditos', () => {
    expect(
      priceLabel({ method: 'SIMULATED_MONEY', amountMinor: 12345, currency: 'USD', minorUnit: 3 }),
    ).toBe('12,345 USD · pago simulado')
    expect(priceLabel({ method: 'CREDITS', amount: 250 })).toBe('250 créditos')
    expect(amountInMinorUnits('12.345', 3)).toBe(12345)
    expect(amountInMinorUnits('12,34', 2)).toBe(1234)
    expect(amountInMinorUnits('12.345', 2)).toBeNull()
    expect(amountInMinorUnits('9007199254740992', 0)).toBeNull()
    expect(amountInMinorUnits('0', 2)).toBeNull()
  })
  it('mantiene IN_PROGRESS, preparación pendiente y READY con héroes', () => {
    const base = {
      tournamentId: 'T1',
      matchId: 'T1:E1',
      bracketLabel: 'E1',
      round: 1,
      startedAt: null,
      closedAt: null,
    } as const
    expect(matchStatus({ ...base, status: 'IN_PROGRESS' })).toBe('En curso')
    expect(
      matchStatus({ ...base, status: 'WAITING_PARTICIPANTS', preparationStatus: 'TEAMS_RESOLVED' }),
    ).toMatch(/preparación pendiente/u)
    expect(matchStatus({ ...base, status: 'READY' })).toMatch(/héroes definidos/u)
  })
  it('muestra todas las unidades del importe seguro máximo y respeta precisión cero', () => {
    expect(
      priceLabel({
        method: 'SIMULATED_MONEY',
        amountMinor: Number.MAX_SAFE_INTEGER,
        currency: 'COP',
        minorUnit: 6,
      }),
    ).toBe('9.007.199.254,740991 COP · pago simulado')
    expect(
      priceLabel({ method: 'SIMULATED_MONEY', amountMinor: 100, currency: 'JPY', minorUnit: 0 }),
    ).toBe('100 JPY · pago simulado')
  })
})
