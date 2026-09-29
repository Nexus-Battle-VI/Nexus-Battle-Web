import { useTranslation } from 'react-i18next'

import { fullCredits } from '@/app/creditsFormat'
import { formatMoney } from '@/lib/format'
import { Coins } from '@/components/ui/icons'
import type { ShowcaseProduct } from './api'

export const ProductPrice = ({
  product,
}: {
  readonly product: ShowcaseProduct
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-1 text-sm tabular-nums">
      <p className="flex items-center gap-1 font-semibold text-ink">
        <Coins aria-hidden="true" className="size-3.5 shrink-0 text-accent-gold" />
        {t('commerce:price.credits', {
          count: product.creditsPrice,
          value: fullCredits(product.creditsPrice),
        })}
      </p>
      {product.realMoneyPrice !== null && (
        <p className="font-semibold text-brand">
          {formatMoney(product.realMoneyPrice.amount, product.realMoneyPrice.currency)}{' '}
          {product.realMoneyPrice.currency}
        </p>
      )}
    </div>
  )
}
