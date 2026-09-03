import { formatMoney } from '@/lib/format'
import type { ShowcaseProduct } from './api'

export const ProductPrice = ({
  product,
}: {
  readonly product: ShowcaseProduct
}): React.JSX.Element => (
  <div className="flex flex-col gap-1 text-sm tabular-nums">
    <p className="font-semibold text-ink">
      {product.creditsPrice.toLocaleString('es-CO')} créditos
    </p>
    {product.realMoneyPrice !== null && (
      <p className="font-semibold text-brand">
        {formatMoney(product.realMoneyPrice.amount, product.realMoneyPrice.currency)}{' '}
        {product.realMoneyPrice.currency}
      </p>
    )}
  </div>
)
