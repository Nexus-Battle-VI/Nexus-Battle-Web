import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useTheme } from '@/shared/theme'

/** Control persistente y exclusivo de los previews para hacer explícito el tema evaluado. */
export const AuctionThemeDevToolbar = (): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)

  return (
    <aside
      aria-label="Controles visuales de desarrollo"
      className="fixed top-3 right-3 z-[100] flex items-center gap-3 rounded-xl border border-border bg-surface-raised/95 px-3 py-2 shadow-lg backdrop-blur max-sm:left-3 max-sm:justify-between"
    >
      <span className="text-xs font-semibold text-muted" aria-live="polite">
        Tema DEV: {theme === 'light' ? 'Light' : 'Dark'}
      </span>
      <ThemeToggle />
    </aside>
  )
}
