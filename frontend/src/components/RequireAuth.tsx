import { Navigate, Outlet, useLocation } from 'react-router'
import { useMe } from '@/api/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

/** Пускает в кабинет только с активной сессией; иначе — на вход с возвратом обратно */
export function RequireAuth() {
  const { data: me, isPending, isError, error } = useMe()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10" aria-busy="true" aria-label="Загрузка">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <Alert variant="destructive">
          <AlertTitle>Не удалось загрузить кабинет</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!me) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <Outlet />
}

/** Обратная защита: залогиненного пользователя со страниц входа уводим в кабинет */
export function GuestOnly() {
  const { data: me, isPending } = useMe()
  if (isPending) return null
  return me ? <Navigate to="/checks" replace /> : <Outlet />
}
