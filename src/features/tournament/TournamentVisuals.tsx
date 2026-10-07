import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Card, type CardProps } from '@/components/ui/Card'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { useTheme } from '@/shared/theme'
import { Hero3D } from '@/shared/visual-library/heroes'
import { tournamentHeroIdentity } from './tournamentHeroIdentity'
import { tournamentIcons, useTournamentAssets, type TournamentIconName } from './tournamentAssets'
import './tournament-assets.css'

interface IconProps {
  readonly size?: number
  readonly className?: string
}
export const TournamentIcon = ({
  icon,
  size = 26,
  className,
}: IconProps & { readonly icon: TournamentIconName }): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  return (
    <img
      src={tournamentIcons[icon][theme]}
      alt=""
      aria-hidden="true"
      className={clsx('tournament-pixel-icon', className)}
      style={{ height: size, width: 'auto' }}
    />
  )
}
export const ArenaIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="arena" {...props} />
)
export const TeamIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="team" {...props} />
)
export const BracketIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="bracket" {...props} />
)
export const EncounterIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="encounters" {...props} />
)
export const PrizeIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="prize" {...props} />
)
export const TransmissionIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="transmission" {...props} />
)
export const CreateIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="create" {...props} />
)
export const CalendarIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="calendar" {...props} />
)
export const CreditIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="credits" {...props} />
)
export const ConfirmIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="confirm" {...props} />
)
export const NextIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="next" {...props} />
)
export const BackIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="back" {...props} />
)
export const SecurityIcon = (props: IconProps): React.JSX.Element => (
  <TournamentIcon icon="security" {...props} />
)

export const TournamentCard = (props: CardProps): React.JSX.Element => (
  <div className="tournament-assets" style={useTournamentAssets()}>
    <Card {...props} className={clsx('tournament-panel', props.className)} />
  </div>
)
export const TournamentButton = ({
  variant = 'primary',
  className,
  ...props
}: ButtonProps): React.JSX.Element => (
  <Button
    {...props}
    variant={variant}
    className={clsx('tournament-button', `tournament-button--${variant}`, className)}
  />
)
export const TournamentHeading = ({
  icon,
  children,
}: {
  readonly icon: TournamentIconName
  readonly children: ReactNode
}): React.JSX.Element => (
  <h2 className="tournament-section-heading">
    <TournamentIcon icon={icon} size={30} />
    {children}
  </h2>
)
export const TournamentEmptyState = ({
  children,
}: {
  readonly children: ReactNode
}): React.JSX.Element => (
  <div className="tournament-empty-state">
    <TournamentIcon icon="empty" size={44} />
    <p>{children}</p>
  </div>
)

export const TournamentHeroFigure = ({ hero }: { readonly hero: object }): React.JSX.Element => {
  const identity = tournamentHeroIdentity(hero)
  return (
    <div className="tournament-hero-figure">
      {identity.modelId ? (
        <Hero3D heroId={identity.modelId} />
      ) : (
        <div className="tournament-hero-unavailable" role="img" aria-label="Héroe por identificar">
          <TournamentIcon icon="team" size={44} />
        </div>
      )}
      <span>{identity.label}</span>
    </div>
  )
}
