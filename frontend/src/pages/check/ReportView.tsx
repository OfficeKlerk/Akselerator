import { useMemo, useRef, useState } from 'react'
import { BookOpen, Database, Download, Info, Loader2, MapPin, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { downloadReportPdf } from '@/api/checks'
import type { Check, Report, Risk, RiskLevel, Zone } from '@/api/types'
import { ParcelMap } from '@/components/ParcelMap'
import { RISK_ICONS, RiskBadge, TrafficLight } from '@/components/RiskBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RISK_HEX, RISK_LEVELS, RISK_ORDER, ZONE_KIND_LABELS } from '@/lib/dictionaries'
import { formatArea, formatDateTime, formatPct, formatRub } from '@/lib/format'
import { cn } from '@/lib/utils'

const LEVEL_TEXT: Record<RiskLevel, string> = {
  low: 'text-risk-low',
  medium: 'text-risk-medium',
  high: 'text-risk-high',
}

/** Худший уровень риска по каждой зоне — им красим зону на карте */
function zoneLevels(risks: Risk[]): Record<string, RiskLevel> {
  const out: Record<string, RiskLevel> = {}
  for (const r of risks) {
    for (const z of r.zone_ids) {
      if (!out[z] || RISK_ORDER[r.level] < RISK_ORDER[out[z]]) out[z] = r.level
    }
  }
  return out
}

function Summary({ check, report }: { check: Check; report: Report }) {
  const [downloading, setDownloading] = useState(false)
  const counts = (['high', 'medium', 'low'] as const).map((l) => ({
    level: l,
    n: report.risks.filter((r) => r.level === l).length,
  }))

  const download = async () => {
    setDownloading(true)
    try {
      await downloadReportPdf(check.id, check.cadastral_number)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section aria-labelledby="summary-title" className="rounded-2xl border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 gap-5">
          <TrafficLight level={report.overall_level} className="shrink-0 self-start" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="summary-title" className="text-2xl font-semibold">
                Итог проверки
              </h2>
              <RiskBadge level={report.overall_level} className="h-7 px-3 text-sm" />
            </div>
            <p className="max-w-2xl leading-relaxed">{report.summary}</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Количество рисков по уровням">
              {counts.map(({ level, n }) => {
                const Icon = RISK_ICONS[level]
                return (
                  <li key={level} className={cn('inline-flex items-center gap-1.5', n === 0 ? 'text-muted-foreground' : LEVEL_TEXT[level])}>
                    <Icon aria-hidden className="size-4" />
                    {RISK_LEVELS[level].short}: <span className="font-semibold tabular-nums">{n}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <div className="flex gap-2 md:flex-col print:hidden">
          <Button onClick={download} disabled={downloading} className="h-11 flex-1 px-4 md:flex-none">
            {downloading ? <Loader2 aria-hidden className="animate-spin" /> : <Download aria-hidden />}
            Скачать PDF
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="h-11 px-4">
            <Printer aria-hidden />
            Печать
          </Button>
        </div>
      </div>
    </section>
  )
}

function ParcelFacts({ report }: { report: Report }) {
  const p = report.parcel
  const rows: [string, string][] = [
    ['Адрес', p.address ?? '—'],
    ['Площадь', formatArea(p.area_m2)],
    ['Категория земель', p.land_category ?? '—'],
    ['Вид разрешённого использования', p.permitted_use ?? '—'],
    ['Кадастровая стоимость', formatRub(p.cadastral_value_rub)],
  ]
  return (
    <section aria-labelledby="parcel-title" className="rounded-2xl border bg-card p-6">
      <h2 id="parcel-title" className="text-xl font-semibold">
        Сведения об участке
      </h2>
      <dl className="mt-4 divide-y text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-2.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ZoneList({
  zones,
  levels,
  onShow,
}: {
  zones: Zone[]
  levels: Record<string, RiskLevel>
  onShow: (id: string) => void
}) {
  return (
    <section aria-labelledby="zones-title" className="rounded-2xl border bg-card p-6">
      <h2 id="zones-title" className="text-xl font-semibold">
        Пересечения с зонами
      </h2>
      {zones.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Пересечений с зонами не найдено.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {zones.map((z) => {
            const level = levels[z.id]
            return (
              <li key={z.id}>
                <button
                  type="button"
                  onClick={() => onShow(z.id)}
                  className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className={cn('mt-1 size-3 shrink-0 rounded-sm border-2', z.kind === 'territorial' && 'border-dashed')}
                    style={{ borderColor: level ? RISK_HEX[level] : '#64748B' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{z.type_label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ZONE_KIND_LABELS[z.kind]} · {z.name}
                      {z.registry_number && ` · реестр. № ${z.registry_number}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm tabular-nums">
                    {formatPct(z.overlap_pct)}
                    <span className="block text-xs text-muted-foreground">{formatArea(z.overlap_area_m2)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function RiskCard({ risk, onShowZone }: { risk: Risk; onShowZone: (id: string) => void }) {
  return (
    <article aria-labelledby={`${risk.id}-title`} className="overflow-hidden rounded-2xl border bg-card break-inside-avoid">
      <header className="flex flex-wrap items-center gap-3 border-b px-6 py-4">
        <RiskBadge level={risk.level} />
        <h3 id={`${risk.id}-title`} className="text-lg font-semibold">
          {risk.title}
        </h3>
      </header>
      <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Что обнаружено</h4>
          <p className="leading-relaxed">{risk.finding}</p>
          {risk.zone_ids.length > 0 && (
            <Button
              variant="link"
              className="h-auto p-0 text-sm print:hidden"
              onClick={() => onShowZone(risk.zone_ids[0])}
            >
              <MapPin aria-hidden />
              Показать на карте
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Основание</h4>
          <ul className="space-y-2">
            {risk.basis.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug">
                <BookOpen aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noreferrer noopener" className="text-primary underline-offset-4 hover:underline">
                      {c.document}
                    </a>
                  ) : (
                    c.document
                  )}
                  {c.article && <span className="font-medium">, {c.article}</span>}
                  {c.quote && (
                    <blockquote className="mt-1 border-l-2 pl-3 text-muted-foreground italic">{c.quote}</blockquote>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-muted/60 px-6 py-4">
        <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Что делать</h4>
        <p className="mt-1 leading-relaxed">{risk.recommendation}</p>
      </div>
    </article>
  )
}

export function ReportView({ check, report }: { check: Check; report: Report }) {
  const [highlight, setHighlight] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const levels = useMemo(() => zoneLevels(report.risks), [report.risks])
  const risks = useMemo(
    () => [...report.risks].sort((a, b) => RISK_ORDER[a.level] - RISK_ORDER[b.level]),
    [report.risks],
  )

  const showZone = (id: string) => {
    setHighlight(id)
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="space-y-6">
      <Summary check={check} report={report} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-6">
          <ParcelFacts report={report} />
          <ZoneList zones={report.zones} levels={levels} onShow={showZone} />
        </div>
        <div ref={mapRef} className="space-y-3">
          <ParcelMap
            label={`Карта участка ${report.parcel.cadastral_number} и пересекающихся зон`}
            parcel={report.parcel}
            zones={report.zones}
            zoneLevels={levels}
            highlightZoneId={highlight}
            className="h-[380px] lg:h-[460px] print:h-[320px]"
          />
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground" aria-label="Легенда карты">
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-sm border-2 border-primary bg-primary/15" /> Участок
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-sm border-2 border-dashed border-slate-500" /> Территориальная зона
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-sm border-2 border-slate-500 bg-slate-500/20" /> ЗОУИТ
            </li>
            <li>Цвет зоны — уровень связанного риска</li>
          </ul>
        </div>
      </div>

      <section aria-labelledby="risks-title" className="space-y-4">
        <h2 id="risks-title" className="text-2xl font-semibold">
          Риски и пути решения <span className="font-sans text-lg text-muted-foreground tabular-nums">({risks.length})</span>
        </h2>
        {risks.map((r) => (
          <RiskCard key={r.id} risk={r} onShowZone={showZone} />
        ))}
      </section>

      <section aria-labelledby="sources-title" className="rounded-2xl border bg-card p-6">
        <h2 id="sources-title" className="flex items-center gap-2 text-xl font-semibold">
          <Database aria-hidden className="size-5 text-muted-foreground" />
          Источники данных
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {report.data_sources.map((s) => (
            <li key={s.name} className="flex flex-wrap justify-between gap-x-4">
              <span>{s.name}</span>
              <time dateTime={s.fetched_at} className="text-muted-foreground">
                {formatDateTime(s.fetched_at)}
              </time>
            </li>
          ))}
        </ul>
      </section>

      <Alert>
        <Info aria-hidden />
        <AlertTitle>Отчёт носит рекомендательный характер</AlertTitle>
        <AlertDescription>{report.disclaimer}</AlertDescription>
      </Alert>

      <p className="text-xs text-muted-foreground">Отчёт сформирован {formatDateTime(report.generated_at)}</p>
    </div>
  )
}
