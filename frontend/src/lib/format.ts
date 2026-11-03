const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const dtf = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' })
const df = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatArea = (m2: number | null) => {
  if (m2 === null) return '—'
  return m2 >= 10_000 ? `${nf.format(m2)} м² (${(m2 / 10_000).toFixed(2)} га)` : `${nf.format(m2)} м²`
}

export const formatRub = (v: number | null) => (v === null ? '—' : `${nf.format(v)} ₽`)

export const formatDateTime = (iso: string) => dtf.format(new Date(iso))

export const formatDate = (iso: string) => df.format(new Date(iso))

export const formatPct = (v: number) => `${v < 1 && v > 0 ? '<1' : nf.format(v)} %`
