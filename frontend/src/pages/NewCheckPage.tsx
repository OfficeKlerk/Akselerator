import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Home, Loader2, MousePointerClick, Search, Warehouse, type LucideIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { useCreateCheck } from '@/api/checks'
import { fetchParcelAtPoint, useParcel } from '@/api/parcels'
import type { Parcel, Purpose } from '@/api/types'
import { ParcelMap } from '@/components/ParcelMap'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DEMO_CADASTRAL_NUMBERS } from '@/mocks'
import { cadastralSchema, isValidCadastral, normalizeCadastral } from '@/lib/cadastral'
import { PURPOSE_ORDER, PURPOSES } from '@/lib/dictionaries'
import { formatArea } from '@/lib/format'
import { useTitle } from '@/lib/use-title'
import { cn } from '@/lib/utils'

const schema = z.object({
  cadastral_number: cadastralSchema,
  purpose: z.enum(['warehouse', 'izhs', 'mkd'], { error: 'Выберите цель покупки' }),
})
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

const PURPOSE_ICONS: Record<Purpose, LucideIcon> = { warehouse: Warehouse, izhs: Home, mkd: Building2 }

function ParcelPreview({ parcel }: { parcel: Parcel }) {
  const rows: [string, string][] = [
    ['Адрес', parcel.address ?? '—'],
    ['Площадь', formatArea(parcel.area_m2)],
    ['Категория земель', parcel.land_category ?? '—'],
    ['Вид разрешённого использования', parcel.permitted_use ?? '—'],
  ]
  return (
    <dl className="grid gap-3 rounded-lg bg-muted/60 p-4 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className={cn(k === 'Адрес' && 'sm:col-span-2')}>
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function NewCheckPage() {
  useTitle('Новая проверка')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const initial = params.get('cadastral') ?? ''

  const [lookup, setLookup] = useState<string | null>(isValidCadastral(initial) ? normalizeCadastral(initial) : null)
  const [picked, setPicked] = useState<[number, number] | null>(null)

  const parcel = useParcel(lookup)
  const createCheck = useCreateCheck()

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { cadastral_number: initial, purpose: undefined },
  })
  const purpose = useWatch({ control, name: 'purpose' })

  const pickOnMap = useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => fetchParcelAtPoint(lat, lng),
    onSuccess: (p) => {
      qc.setQueryData(['parcel', p.cadastral_number], p)
      setValue('cadastral_number', p.cadastral_number, { shouldValidate: true })
      setLookup(p.cadastral_number)
    },
  })

  const findParcel = async () => {
    if (await trigger('cadastral_number')) {
      pickOnMap.reset()
      setPicked(null)
      setLookup(normalizeCadastral(getValues('cadastral_number')))
    }
  }

  const choose = (num: string) => {
    setValue('cadastral_number', num, { shouldValidate: true })
    pickOnMap.reset()
    setPicked(null)
    setLookup(num)
  }

  const onSubmit = (v: FormOutput) =>
    createCheck.mutate(v, { onSuccess: ({ id }) => navigate(`/checks/${id}`) })

  const shownParcel = parcel.data ?? null
  const lookupError = pickOnMap.error ?? parcel.error

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">Новая проверка</h1>
        <p className="text-muted-foreground">
          Укажите участок и цель покупки — отчёт о рисках будет готов через пару минут
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8 rounded-2xl border bg-card p-5 sm:p-6">
          {/* Шаг 1 — участок */}
          <section aria-labelledby="step-parcel" className="space-y-4">
            <h2 id="step-parcel" className="flex items-center gap-3 text-xl font-semibold">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary font-sans text-sm text-primary-foreground">
                1
              </span>
              Участок
            </h2>

            <Field data-invalid={Boolean(errors.cadastral_number)}>
              <FieldLabel htmlFor="cadastral_number">Кадастровый номер</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="cadastral_number"
                  placeholder="50:10:0010317:1234"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.cadastral_number)}
                  aria-describedby="cadastral-desc cadastral-error"
                  className="h-11 font-mono text-base tabular-nums sm:h-10 sm:text-sm"
                  {...register('cadastral_number', {
                    onChange: () => {
                      setLookup(null)
                      pickOnMap.reset()
                    },
                  })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void findParcel()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 px-4 sm:h-10"
                  onClick={findParcel}
                  disabled={parcel.isFetching}
                >
                  {parcel.isFetching ? <Loader2 aria-hidden className="animate-spin" /> : <Search aria-hidden />}
                  Найти
                </Button>
              </div>
              <FieldDescription id="cadastral-desc" className="flex items-center gap-1.5">
                <MousePointerClick aria-hidden className="size-4 shrink-0" />
                Или кликните по участку на карте
              </FieldDescription>
              <FieldError id="cadastral-error" errors={[errors.cadastral_number]} />
            </Field>

            {DEMO_CADASTRAL_NUMBERS.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Демо-участки:</span>
                {DEMO_CADASTRAL_NUMBERS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => choose(n)}
                    className="min-h-9 rounded-full border bg-background px-3 font-mono text-xs tabular-nums transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            <div aria-live="polite">
              {(parcel.isFetching || pickOnMap.isPending) && <Skeleton className="h-[124px] w-full rounded-lg" />}
              {!parcel.isFetching && !pickOnMap.isPending && lookupError && (
                <Alert>
                  <AlertDescription>
                    {lookupError.message}. Проверку всё равно можно запустить — бэкенд повторит запрос к НСПД.
                  </AlertDescription>
                </Alert>
              )}
              {!parcel.isFetching && !pickOnMap.isPending && !lookupError && shownParcel && (
                <ParcelPreview parcel={shownParcel} />
              )}
            </div>
          </section>

          {/* Шаг 2 — цель */}
          <section aria-labelledby="step-purpose" className="space-y-4">
            <h2 id="step-purpose" className="flex items-center gap-3 text-xl font-semibold">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary font-sans text-sm text-primary-foreground">
                2
              </span>
              Цель покупки
            </h2>
            <FieldSet data-invalid={Boolean(errors.purpose)}>
              <FieldLegend className="sr-only">Что планируете строить на участке</FieldLegend>
              <div className="grid gap-2" aria-describedby={errors.purpose ? 'purpose-error' : undefined}>
                {PURPOSE_ORDER.map((p) => {
                  const Icon = PURPOSE_ICONS[p]
                  const checked = purpose === p
                  return (
                    <label
                      key={p}
                      className={cn(
                        'flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border bg-background px-4 py-3 transition-colors hover:border-primary/50',
                        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                        checked && 'border-primary bg-accent',
                        errors.purpose && !checked && 'border-destructive/60',
                      )}
                    >
                      <input type="radio" value={p} className="sr-only" {...register('purpose')} />
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-lg',
                          checked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{PURPOSES[p].label}</span>
                        <span className="block text-sm text-muted-foreground">{PURPOSES[p].hint}</span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                          checked ? 'border-primary' : 'border-input',
                        )}
                      >
                        {checked && <span className="size-2.5 rounded-full bg-primary" />}
                      </span>
                    </label>
                  )
                })}
              </div>
              <FieldError id="purpose-error" errors={[errors.purpose]} />
            </FieldSet>
          </section>

          {createCheck.isError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{createCheck.error.message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="h-12 w-full text-base" disabled={createCheck.isPending}>
            {createCheck.isPending && <Loader2 aria-hidden className="animate-spin" />}
            Запустить проверку
          </Button>
        </form>

        <ParcelMap
          label="Карта для выбора участка"
          parcel={shownParcel}
          pickedPoint={picked}
          onPick={(lat, lng) => {
            setPicked([lat, lng])
            setLookup(null)
            pickOnMap.mutate({ lat, lng })
          }}
          className="h-[360px] lg:sticky lg:top-24 lg:h-[calc(100svh-8rem)] lg:max-h-[640px]"
        />
      </div>
    </div>
  )
}
