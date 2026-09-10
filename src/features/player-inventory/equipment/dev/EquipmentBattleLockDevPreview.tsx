import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { queryKeys } from '@/shared/query-keys'
import type { EquipmentSlotId, HeroEquipment } from '../api'
import { HeroConfigurator } from '../HeroConfigurator'

type Scenario = 'battle-active' | 'battle-finished'

const SWORD = {
  slot: 'WEAPON_1' as const,
  itemId: 'espada-de-fuego',
  productId: 'pid-espada-de-fuego',
  name: 'Espada de Fuego',
  imageUrl: '',
  type: 'ARMA',
  lifecycleStatus: 'ACTIVE',
}

const ICE_SWORD = {
  slot: 'WEAPON_2' as const,
  itemId: 'espada-de-hielo',
  productId: 'pid-espada-de-hielo',
  name: 'Espada de Hielo',
  imageUrl: '',
  type: 'ARMA',
  lifecycleStatus: 'ACTIVE',
}

const BEFORE: HeroEquipment = {
  hero: {
    heroId: 'pid-guerrero-tanque',
    reference: 'guerrero-tanque',
    subtype: 'GUERRERO_TANQUE',
    name: 'Guerrero Tanque',
    imageUrl: '',
  },
  equipment: { weapons: [SWORD], armor: {}, items: [] },
  baseStats: {
    power: 10,
    health: 120,
    defense: 30,
    attack: 30,
    damage: { mode: 'DICE', count: 1, sides: 6 },
    healing: null,
  },
  effectiveStats: {
    power: 10,
    health: 120,
    defense: 30,
    attack: 32,
    damage: { mode: 'DICE', count: 1, sides: 6 },
    healing: null,
  },
  deltas: [{ statistic: 'ATTACK', base: 30, effective: 32, delta: 2 }],
  activeEffects: [],
}

const AFTER: HeroEquipment = {
  ...BEFORE,
  equipment: { ...BEFORE.equipment, weapons: [SWORD, ICE_SWORD] },
  effectiveStats: { ...BEFORE.effectiveStats, attack: 34 },
  deltas: [{ statistic: 'ATTACK', base: 30, effective: 34, delta: 4 }],
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const requestUrl = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

const requestMethod = (input: RequestInfo | URL, init?: RequestInit): string =>
  init?.method ?? (input instanceof Request ? input.method : 'GET')

/**
 * Evidencia interactiva de HU-29. Monta el configurador de produccion y solo
 * reemplaza su frontera HTTP con dos respuestas predeterminadas: rechazo del
 * backend durante batalla y exito despues del fin. No simula el lifecycle de
 * combate ni reproduce la regla de bloqueo en React.
 */
export const EquipmentBattleLockDevPreview = (): React.JSX.Element => {
  const [scenario, setScenario] = useState<Scenario>('battle-active')
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlotId | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const previousFetch = globalThis.fetch

    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = requestUrl(input)
      const method = requestMethod(input, init)

      if (url.endsWith('/inventories/me/heroes/guerrero-tanque/equipment') && method === 'GET') {
        return Promise.resolve(jsonResponse(BEFORE))
      }

      if (url.endsWith('/equipment/WEAPON_2') && method === 'PUT') {
        return Promise.resolve(
          scenario === 'battle-active'
            ? jsonResponse(
                {
                  reason: 'battle_lock',
                  message:
                    'No se puede modificar el equipamiento porque el héroe participa en una batalla activa.',
                },
                409,
              )
            : jsonResponse(AFTER),
        )
      }

      return Promise.resolve(
        jsonResponse({ message: `Petición fuera del escenario: ${method} ${url}` }, 404),
      )
    }

    return () => {
      globalThis.fetch = previousFetch
    }
  }, [scenario])

  const chooseScenario = (next: Scenario): void => {
    queryClient.removeQueries({ queryKey: queryKeys.inventory.heroEquipment('guerrero-tanque') })
    setSelectedSlot(null)
    setScenario(next)
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <Card
        title="HU29 · Equipamiento protegido"
        description="Prueba el mismo intento con una batalla activa y después de finalizarla."
      >
        <div className="flex flex-wrap gap-2" aria-label="Escenario de batalla">
          <Button
            variant={scenario === 'battle-active' ? 'primary' : 'secondary'}
            aria-pressed={scenario === 'battle-active'}
            onClick={() => {
              chooseScenario('battle-active')
            }}
          >
            Batalla activa
          </Button>
          <Button
            variant={scenario === 'battle-finished' ? 'primary' : 'secondary'}
            aria-pressed={scenario === 'battle-finished'}
            onClick={() => {
              chooseScenario('battle-finished')
            }}
          >
            Batalla finalizada
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Selecciona Guerrero Tanque, elige Arma 2 e intenta equipar Espada de Hielo. El escenario
          activo devuelve el contrato real 409 + battle_lock; el finalizado devuelve el nuevo
          loadout de HU28.
        </p>
      </Card>

      <div className="w-full max-w-sm">
        <HeroConfigurator
          key={scenario}
          ownedHeroes={[{ reference: 'guerrero-tanque', name: 'Guerrero Tanque' }]}
          selectedProductReference="espada-de-hielo"
          selectedProductType="ARMA"
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
      </div>
    </main>
  )
}
