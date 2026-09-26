import { useTranslation } from 'react-i18next'

import { fullCredits } from '@/app/creditsFormat'
import { formatMoney } from '@/lib/format'
import type { ShowcaseProduct } from './api'

export const ProductPrice = ({
  product,
}: {
  readonly product: ShowcaseProduct
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-1 text-sm tabular-nums">
      <p className="font-semibold text-ink">
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
