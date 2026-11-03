import type { CheckStatus, Purpose, RiskLevel, ZoneKind } from '@/api/types'

export const PURPOSES: Record<Purpose, { label: string; hint: string }> = {
  warehouse: { label: 'Склад', hint: 'Складской или логистический комплекс' },
  izhs: { label: 'ИЖС', hint: 'Индивидуальный жилой дом' },
  mkd: { label: 'МКД', hint: 'Многоквартирный жилой дом' },
}

export const PURPOSE_ORDER: Purpose[] = ['warehouse', 'izhs', 'mkd']

export const RISK_LEVELS: Record<RiskLevel, { label: string; short: string }> = {
  low: { label: 'Низкий риск', short: 'Низкий' },
  medium: { label: 'Средний риск', short: 'Средний' },
  high: { label: 'Высокий риск', short: 'Высокий' },
}

export const RISK_ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 }

/** Цвета светофора для карты (Leaflet не читает CSS-переменные) */
export const RISK_HEX: Record<RiskLevel, string> = {
  low: '#16A34A',
  medium: '#D97706',
  high: '#DC2626',
}

export const STATUS_LABELS: Record<CheckStatus, string> = {
  queued: 'В очереди',
  collecting: 'Сбор данных',
  analyzing: 'Анализ норм',
  done: 'Готово',
  failed: 'Ошибка',
}

/** Шаги, которые видит пользователь, пока отчёт считается */
export const PROGRESS_STEPS: { status: CheckStatus; title: string; text: string }[] = [
  { status: 'queued', title: 'Запрос принят', text: 'Проверка поставлена в очередь' },
  {
    status: 'collecting',
    title: 'Сбор данных',
    text: 'Сведения об участке из НСПД и пересечение с зонами',
  },
  {
    status: 'analyzing',
    title: 'Анализ норм',
    text: 'Поиск фрагментов ПЗЗ и законов, формирование выводов',
  },
  { status: 'done', title: 'Отчёт готов', text: 'Светофор рисков, основания и пути решения' },
]

export const ZONE_KIND_LABELS: Record<ZoneKind, string> = {
  zouit: 'ЗОУИТ',
  territorial: 'Территориальная зона',
}
