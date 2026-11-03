import { Check as CheckIcon, Loader2 } from 'lucide-react'
import type { Check } from '@/api/types'
import { PROGRESS_STEPS } from '@/lib/dictionaries'
import { cn } from '@/lib/utils'

/** Пошаговый прогресс расчёта: сайт сразу ответил «принято», страница опрашивает статус */
export function CheckProgress({ check }: { check: Check }) {
  const current = PROGRESS_STEPS.findIndex((s) => s.status === check.status)

  return (
    <section aria-labelledby="progress-title" className="rounded-2xl border bg-card p-6 sm:p-8">
      <h2 id="progress-title" className="text-2xl font-semibold">
        Готовим отчёт
      </h2>
      <p className="mt-1 text-muted-foreground">
        Обычно это занимает до минуты. Страницу можно закрыть — отчёт сохранится в «Моих проверках».
      </p>

      <ol className="mt-8 space-y-0">
        {PROGRESS_STEPS.map((step, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'pending'
          const last = i === PROGRESS_STEPS.length - 1
          return (
            <li key={step.status} className="relative flex gap-4 pb-7 last:pb-0" aria-current={state === 'current' ? 'step' : undefined}>
              {!last && (
                <span
                  aria-hidden
                  className={cn('absolute top-9 left-[17px] h-[calc(100%-2.5rem)] w-0.5', i < current ? 'bg-primary' : 'bg-border')}
                />
              )}
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                  state === 'done' && 'border-primary bg-primary text-primary-foreground',
                  state === 'current' && 'border-primary bg-accent text-primary',
                  state === 'pending' && 'border-border bg-background text-muted-foreground',
                )}
              >
                {state === 'done' ? (
                  <CheckIcon aria-hidden className="size-4" />
                ) : state === 'current' && !last ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="pt-1.5">
                <div className={cn('font-medium', state === 'pending' && 'text-muted-foreground')}>
                  {step.title}
                  <span className="sr-only">
                    {state === 'done' ? ' — выполнено' : state === 'current' ? ' — выполняется' : ' — ожидает'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {state === 'current' && check.stage_message ? check.stage_message : step.text}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <p aria-live="polite" className="sr-only">
        {check.stage_message ?? ''}
      </p>
    </section>
  )
}
