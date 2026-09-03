import { RouterProvider, createBrowserRouter } from 'react-router'

import { useSession } from '@/shared/session'
import { routes } from '@/routes/routes'
import { SessionQueryProvider } from './SessionQueryProvider'

const router = createBrowserRouter(routes)

export const App = (): React.JSX.Element => {
  const subject = useSession((state) => state.subject)

  return (
    <SessionQueryProvider key={subject ?? 'signed-out'}>
      <RouterProvider router={router} />
    </SessionQueryProvider>
  )
}
