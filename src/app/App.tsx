import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter } from 'react-router'

import { createQueryClient } from '@/shared/query-client'
import { routes } from '@/routes/routes'

const router = createBrowserRouter(routes)

export const App = (): React.JSX.Element => {
  // El cliente se crea una sola vez por montaje. Crearlo en el cuerpo del
  // componente sin `useState` produciria una instancia nueva en cada render y
  // vaciaria la cache en cada actualizacion.
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
