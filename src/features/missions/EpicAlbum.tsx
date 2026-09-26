import clsx from 'clsx'
import { Link } from 'react-router'

import { Card } from '@/components/ui/Card'

import { heroTypeLabel } from './missionPresentation'
import type { MissionEpicAlbumEntry } from './missionReportApi'
import { useTranslation } from 'react-i18next'

/**
 * Álbum de épicas (diseño «misiones jugables», P-J3): cada épica que se puede ganar
 * en las misiones, con el Máster que la entrega y dónde aparece. Es la meta a largo
 * plazo del módulo: completar la colección. Missions dice cuáles ya se tienen.
 */
export const EpicAlbum = ({
  entries,
}: {
  readonly entries: readonly MissionEpicAlbumEntry[]
}): React.JSX.Element | null => {
  const { t } = useTranslation()
  if (entries.length === 0) return null
  const owned = entries.filter((entry) => entry.obtained).length

  return (
    <Card
      title={t('missions:album.title')}
      description={t('missions:album.description', {
        owned: String(owned),
        total: String(entries.length),
      })}
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <li
            key={entry.epicRef}
            className={clsx(
              'flex flex-col gap-1 rounded-lg border p-3 text-sm',
              entry.obtained ? 'border-success/60 bg-success/10' : 'border-dashed border-border',
            )}
          >
            <p className="flex items-center justify-between gap-2 font-semibold text-ink">
              <span>{entry.name}</span>
              <span className="text-xs font-medium">
                {entry.obtained ? t('missions:album.obtained') : t('missions:album.pending')}
              </span>
            </p>
            <p className="text-muted">
              {t('missions:album.boosts', { hero: heroTypeLabel(entry.heroType) })}
            </p>
            {entry.generalEffect !== null && <p className="text-ink">{entry.generalEffect}</p>}
            {entry.epicEffect !== null && <p className="text-ink">{entry.epicEffect}</p>}
            <p className="text-muted">
              {t('missions:album.master', { name: entry.masterName })} ·{' '}
              <Link
                to={`/missions/${encodeURIComponent(entry.missionId)}`}
                className="text-brand hover:underline"
              >
                {entry.missionName}
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
