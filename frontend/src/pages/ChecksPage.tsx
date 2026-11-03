import { ChevronRight, Loader2, MapPinned, Plus, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { isFinished, useChecks } from '@/api/checks'
import type { CheckSummary } from '@/api/types'
import { RiskBadge } from '@/components/RiskBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PURPOSES, STATUS_LABELS } from '@/lib/dictionaries'
import { formatDate } from '@/lib/format'
import { useTitle } from '@/lib/use-title'

function CheckResult({ check }: { check: CheckSummary }) {
  if (check.status === 'done' && check.overall_level) return <RiskBadge level={check.overall_level} />
  if (check.status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
        <TriangleAlert aria-hidden className="size-4" />
        {STATUS_LABELS.failed}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Loader2 aria-hidden className="size-4 animate-spin" />
      {STATUS_LABELS[check.status]}
    </span>
  )
}

function CheckRow({ check }: { check: CheckSummary }) {
  return (
    <li>
      <Link
        to={`/checks/${check.id}`}
        className="group grid gap-x-6 gap-y-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_7rem_10rem_auto] sm:items-center sm:p-5"
      >
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold tabular-nums">{check.cadastral_number}</div>
          <div className="truncate text-sm text-muted-foreground">{check.address ?? 'Адрес уточняется'}</div>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground sm:sr-only">Цель: </span>
          {PURPOSES[check.purpose].label}
        </div>
        <div>
          <CheckResult check={check} />
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground sm:justify-end">
          <time dateTime={check.created_at}>{formatDate(check.created_at)}</time>
          <ChevronRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </li>
  )
}

export function ChecksPage() {
  useTitle('Мои проверки')
  const { data, isPending, isError, error, refetch } = useChecks()
  const running = data?.filter((c) => !isFinished(c)).length ?? 0

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Мои проверки</h1>
          <p className="text-muted-foreground">Отчёты по участкам, которые вы проверяли</p>
        </div>
        <Button asChild className="h-11 px-4 text-base">
          <Link to="/checks/new">
            <Plus aria-hidden />
            Новая проверка
          </Link>
        </Button>
      </div>

      <p aria-live="polite" className="sr-only">
        {running > 0 ? `Выполняется проверок: ${running}` : ''}
      </p>

      {isPending && (
        <ul className="space-y-3" aria-busy="true" aria-label="Загрузка списка">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-[74px] w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Не удалось загрузить проверки</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {error.message}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {data && data.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
            <MapPinned aria-hidden className="size-7" />
          </span>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Проверок пока нет</h2>
            <p className="max-w-sm text-muted-foreground">
              Введите кадастровый номер участка и цель покупки — система соберёт данные и покажет риски.
            </p>
          </div>
          <Button asChild className="h-11 px-5 text-base">
            <Link to="/checks/new">Проверить первый участок</Link>
          </Button>
        </div>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </ul>
      )}
    </div>
  )
}
