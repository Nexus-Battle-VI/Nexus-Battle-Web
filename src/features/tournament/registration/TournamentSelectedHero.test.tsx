import { afterEach, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { httpClient } from '@/lib/http'
import { renderWithProviders } from '@/test/render'
import { TournamentSelectedHero } from './TournamentSelectedHero'
import { queryKeys } from '@/shared/query-keys'

afterEach(() => vi.restoreAllMocks())
it('actualizar la selección de Inventory refresca el héroe del torneo sin mezclar cuentas', async () => {
  const get = vi
    .spyOn(httpClient, 'get')
    .mockResolvedValue([
      {
        heroId: 'old',
        subtype: 'GUERRERO_ARMAS',
        name: 'Guerrero de Armas',
        selected: true,
        abilities: [],
      },
    ])
  const { queryClient } = renderWithProviders(<TournamentSelectedHero subject="Carlos" />)
  expect(await screen.findByText('Guerrero de Armas')).toBeVisible()
  get.mockResolvedValue([
    { heroId: 'new', subtype: 'MAGO_HIELO', name: 'Mago de Hielo', selected: true, abilities: [] },
  ])
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availableHeroes })
  })
  expect(await screen.findByText('Mago de Hielo')).toBeVisible()
  expect(screen.queryByText('Guerrero de Armas')).not.toBeInTheDocument()
  expect(
    queryClient.getQueryData([...queryKeys.inventory.availableHeroes, 'another-player']),
  ).toBeUndefined()
})
it('muestra solo el héroe seleccionado y las habilidades que devuelve el inventario del sujeto', async () => {
  const get = vi.spyOn(httpClient, 'get').mockResolvedValue([
    {
      heroId: 'unselected',
      subtype: 'MAGO_HIELO',
      name: 'Otro héroe',
      selected: false,
      abilities: [],
    },
    {
      heroId: 'own',
      subtype: 'GUERRERO_ARMAS',
      name: 'Guerrero de Armas',
      selected: true,
      abilities: [
        { reference: 'skill', name: 'Furia' },
        { reference: 'unresolved', name: null },
      ],
    },
  ])
  renderWithProviders(<TournamentSelectedHero subject="Carlos" />)
  expect(await screen.findByText('Guerrero de Armas')).toBeVisible()
  expect(screen.getByText('Furia')).toBeVisible()
  expect(screen.queryByText('Otro héroe')).not.toBeInTheDocument()
  expect(get).toHaveBeenCalledWith('/inventories/me/heroes', expect.any(AbortSignal))
})
it('un fallo de inventario muestra cómo revisarlo sin inventar héroe ni preparación', async () => {
  vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('Inventory unavailable'))
  renderWithProviders(<TournamentSelectedHero subject="Carlos" />)
  expect(await screen.findByText('No pudimos consultar tu héroe.')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Revisar en Inventario' })).toHaveAttribute(
    'href',
    '/inventory',
  )
  expect(screen.queryByText('Listo para combatir')).not.toBeInTheDocument()
})
