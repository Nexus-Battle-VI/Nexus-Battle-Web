import { useEffect, useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import { createQueryClient } from '@/shared/query-client'

/** Una instancia por identidad; las respuestas tardias nunca llegan a la siguiente sesion. */
export const SessionQueryProvider = ({
  children,
}: {
  readonly children: ReactNode
}): React.JSX.Element => {
  const [queryClient] = useState(createQueryClient)

  useEffect(
    () => () => {
      void queryClient.cancelQueries()
      queryClient.clear()
    },
    [queryClient],
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
