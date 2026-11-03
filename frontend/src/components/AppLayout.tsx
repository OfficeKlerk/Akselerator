import { FlaskConical, LogOut, Plus } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useLogout, useMe } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { MOCKS_ENABLED } from '@/mocks'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'

export function AppLayout() {
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  const onLogout = () =>
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
      onError: (e) => toast.error(e.message),
    })

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        Перейти к содержимому
      </a>

      {MOCKS_ENABLED && (
        <div className="flex items-center justify-center gap-2 bg-slate-900 px-4 py-1.5 text-xs text-slate-100 print:hidden">
          <FlaskConical aria-hidden className="size-3.5" />
          Демо-режим: данные условные, бэкенд не подключён
        </div>
      )}

      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur print:static print:border-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/checks" className="rounded-md focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>

          <nav aria-label="Основная навигация" className="hidden sm:block print:hidden">
            <NavLink
              to="/checks"
              end
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'text-primary',
                )
              }
            >
              Мои проверки
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2 print:hidden">
            <Button asChild size="sm" className="h-9">
              <Link to="/checks/new">
                <Plus aria-hidden />
                <span className="hidden sm:inline">Новая проверка</span>
                <span className="sm:hidden">Проверить</span>
              </Link>
            </Button>
            {me && (
              <div className="flex items-center gap-1 border-l pl-3">
                <div className="hidden text-right leading-tight md:block">
                  <div className="text-sm font-medium">{me.full_name}</div>
                  <div className="text-xs text-muted-foreground">{me.company ?? me.email}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  onClick={onLogout}
                  disabled={logout.isPending}
                  aria-label="Выйти"
                  title="Выйти"
                >
                  <LogOut aria-hidden />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        <Outlet />
      </main>

      <footer className="border-t print:hidden">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted-foreground sm:px-6">
          ПРАВОЗОР — первичная проверка рисков земельных участков. Отчёты носят рекомендательный
          характер и не заменяют юридическое заключение.
        </div>
      </footer>
    </div>
  )
}
