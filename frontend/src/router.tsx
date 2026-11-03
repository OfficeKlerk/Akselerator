import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { GuestOnly, RequireAuth } from '@/components/RequireAuth'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ChecksPage } from '@/pages/ChecksPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/checks" replace /> },
          { path: '/checks', element: <ChecksPage /> },
          // страницы с картой грузятся отдельно — Leaflet не нужен на входе и в списке
          {
            path: '/checks/new',
            lazy: () => import('@/pages/NewCheckPage').then((m) => ({ Component: m.NewCheckPage })),
          },
          {
            path: '/checks/:id',
            lazy: () => import('@/pages/check/CheckPage').then((m) => ({ Component: m.CheckPage })),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
