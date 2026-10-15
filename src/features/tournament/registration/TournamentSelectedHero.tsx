import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Shield, Sparkles } from 'lucide-react'
import { httpClient } from '@/lib/http'
import { queryKeys } from '@/shared/query-keys'
import { HeroSprite } from '@/shared/visual-library/heroes'
import { tournamentHeroIdentity } from '../tournamentHeroIdentity'

interface OwnedHero {
  readonly heroId: string
  readonly subtype: string
  readonly name: string
  readonly selected: boolean
  readonly abilities: readonly { readonly reference: string; readonly name: string | null }[]
}

/** Inventory owns selection; no hero or readiness is inferred from a tournament slot. */
export const TournamentSelectedHero = ({ subject }: { readonly subject: string }) => {
  const view = useQuery({
    queryKey: [...queryKeys.inventory.availableHeroes, subject],
    queryFn: ({ signal }) => httpClient.get<readonly OwnedHero[]>('/inventories/me/heroes', signal),
    staleTime: 15000,
    retry: false,
  })
  const hero = view.data?.find((candidate) => candidate.selected)
  const visual = hero
    ? tournamentHeroIdentity({ heroName: hero.name, heroSubtype: hero.subtype })
    : null
  return (
    <div className="tournament-loadout">
      <span className="tournament-battle-team-caption">HÉROE SELECCIONADO</span>
      {hero ? (
        <div className="tournament-loadout-presentation">
          <div className="tournament-loadout-portrait">
            {visual?.modelId ? (
              <HeroSprite heroId={visual.modelId} />
            ) : (
              <Shield size={36} aria-hidden="true" />
            )}
          </div>
          <div>
            <strong className="tournament-loadout-name">{hero.name}</strong>
            <div className="tournament-ability-list" aria-label="Habilidades de tu héroe">
              {hero.abilities
                .filter((ability) => ability.name !== null)
                .map((ability) => (
                  <span key={ability.reference} title={ability.name ?? undefined}>
                    <Sparkles size={15} aria-hidden="true" />
                    {ability.name}
                  </span>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="tournament-loadout-empty">
          <Shield size={28} aria-hidden="true" />
          <p>
            {view.isPending
              ? 'Consultando tu héroe…'
              : view.isError
                ? 'No pudimos consultar tu héroe.'
                : 'Todavía no has seleccionado un héroe.'}
          </p>
          <Link to="/inventory">Revisar en Inventario</Link>
        </div>
      )}
    </div>
  )
}
