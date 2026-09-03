import { CreateProductPage } from '../CreateProductPage'
import type { CreateProductRequest, CreatedProduct } from '../contract'

/**
 * Vista previa de desarrollo del alta de producto (HU-33).
 *
 * Existe por la misma razon que la de "Mi cuenta": la pantalla real vive tras
 * `RequireSession` y una guarda de rol administrativo, y el entorno local no
 * puede establecer una sesion de verdad. Sin esto, revisar la maqueta obligaria
 * a desplegar.
 *
 * NO ES UNA PUERTA TRASERA. Solo existe con `import.meta.env.DEV` -Vite elimina
 * la rama entera en produccion-, no monta la ruta productiva y NO llama a
 * Catalog: el envio se resuelve aqui mismo. Que no toque la red es lo que
 * garantiza que nadie cree un producto real desde esta pantalla.
 */
const stubCreate = (request: CreateProductRequest): Promise<CreatedProduct> =>
  Promise.resolve({
    productId: '00000000-0000-4000-8000-000000000000',
    name: request.name,
    type: request.type,
    printRun: request.printRun,
    printRunMode:
      request.printRun === -1 ? 'INFINITE' : request.printRun === 1 ? 'UNIQUE' : 'LIMITED',
    lifecycleStatus: 'ACTIVE',
    creditsPrice: request.creditsPrice,
    premium: request.premium,
  })

export const CreateProductDevPreview = (): React.JSX.Element => (
  <div className="mx-auto max-w-6xl p-6">
    <p className="mb-4 rounded-md border border-border bg-surface/40 px-4 py-2 text-xs text-muted">
      Vista previa de desarrollo. El envío no llega a Catalog: se resuelve aquí mismo.
    </p>
    <CreateProductPage onCreate={stubCreate} />
  </div>
)
