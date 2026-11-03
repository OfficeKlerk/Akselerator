import { ArrowLeft, RotateCcw } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useCheck } from '@/api/checks'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PURPOSES } from '@/lib/dictionaries'
import { formatDateTime } from '@/lib/format'
import { useTitle } from '@/lib/use-title'
import { CheckProgress } from './CheckProgress'
import { ReportView } from './ReportView'

export function CheckPage() {
  const { id = '' } = useParams()
  const { data: check, isPending, isError, error } = useCheck(id)
  useTitle(check ? `Участок ${check.cadastral_number}` : 'Проверка')

  return (
    <div className="space-y-6">
      <Link
        to="/checks"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none print:hidden"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Мои проверки
      </Link>

      {isPending && (
        <div className="space-y-4" aria-busy="true" aria-label="Загрузка проверки">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Не удалось открыть проверку</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {check && (
        <>
          <header className="space-y-1">
            <h1 className="text-3xl font-semibold">
              Участок <span className="font-mono text-[0.85em] tabular-nums">{check.cadastral_number}</span>
            </h1>
            <p className="text-muted-foreground">
              Цель: {PURPOSES[check.purpose].label} · запрос от {formatDateTime(check.created_at)}
            </p>
          </header>

          {check.status === 'failed' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>Проверка не выполнена</AlertTitle>
                <AlertDescription>{check.error ?? 'Произошла ошибка при формировании отчёта.'}</AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="h-11 px-4">
                <Link to={`/checks/new?cadastral=${encodeURIComponent(check.cadastral_number)}`}>
                  <RotateCcw aria-hidden />
                  Проверить другой номер
                </Link>
              </Button>
            </div>
          )}

          {check.status !== 'failed' && check.status !== 'done' && <CheckProgress check={check} />}

          {check.status === 'done' && check.report && <ReportView check={check} report={check.report} />}
        </>
      )}
    </div>
  )
}
