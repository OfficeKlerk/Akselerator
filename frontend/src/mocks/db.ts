/**
 * «База» мок-бэкенда в localStorage: переживает перезагрузку страницы.
 * Сбросить демо-данные: localStorage.removeItem('pravozor-mock-db').
 */
import type { Check, CheckStatus, Purpose, Report, User } from '@/api/types'
import { PURPOSES, RISK_LEVELS } from '@/lib/dictionaries'
import { DEMO_USER } from './credentials'
import { findDemoParcel, worstLevel } from './demo-data'

const STORAGE_KEY = 'pravozor-mock-db'


interface StoredUser extends User {
  password: string
}

interface StoredCheck {
  id: string
  user_id: string
  cadastral_number: string
  purpose: Purpose
  created_at: string
}

interface Db {
  users: StoredUser[]
  checks: StoredCheck[]
  session_user_id: string | null
}

const seed = (): Db => ({
  users: [
    {
      id: 'u-demo',
      email: DEMO_USER.email,
      password: DEMO_USER.password,
      full_name: 'Демо Пользователь',
      company: 'ООО «Демо-Девелопмент»',
    },
  ],
  checks: [
    {
      id: 'chk-demo-1',
      user_id: 'u-demo',
      cadastral_number: '50:10:0010317:1234',
      purpose: 'warehouse',
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    },
    {
      id: 'chk-demo-2',
      user_id: 'u-demo',
      cadastral_number: '50:20:0040205:567',
      purpose: 'izhs',
      created_at: new Date(Date.now() - 86_400_000).toISOString(),
    },
  ],
  session_user_id: null,
})

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    /* повреждённые данные — пересоздаём */
  }
  const db = seed()
  save(db)
  return db
}

function save(db: Db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* приватный режим — работаем без сохранения */
  }
}

export function withDb<T>(fn: (db: Db) => T): T {
  const db = load()
  const result = fn(db)
  save(db)
  return result
}

export const publicUser = ({ password: _password, ...u }: StoredUser): User => u

/** Имитация фоновой задачи Celery: статус зависит от времени с момента создания */
function statusAt(createdAt: string): { status: CheckStatus; stage: string | null } {
  const elapsed = Date.now() - new Date(createdAt).getTime()
  if (elapsed < 1_500) return { status: 'queued', stage: 'Проверка в очереди' }
  if (elapsed < 3_500) return { status: 'collecting', stage: 'Запрашиваем сведения об участке в НСПД' }
  if (elapsed < 5_500) return { status: 'collecting', stage: 'Проверяем пересечение с зонами' }
  if (elapsed < 7_500) return { status: 'analyzing', stage: 'Ищем нормы ПЗЗ и законов' }
  if (elapsed < 9_500) return { status: 'analyzing', stage: 'Формируем выводы' }
  return { status: 'done', stage: null }
}

function buildReport(c: StoredCheck): Report | null {
  const demo = findDemoParcel(c.cadastral_number)
  if (!demo) return null
  const risks = demo.risks[c.purpose].map((r, i) => ({ ...r, id: `${c.id}-r${i}` }))
  const overall = worstLevel(risks.map((r) => r.level))
  const counts = (['high', 'medium', 'low'] as const)
    .map((l) => [l, risks.filter((r) => r.level === l).length] as const)
    .filter(([, n]) => n > 0)
    .map(([l, n]) => `${RISK_LEVELS[l].short.toLowerCase()} — ${n}`)
    .join(', ')
  const doneAt = new Date(new Date(c.created_at).getTime() + 9_500).toISOString()
  return {
    overall_level: overall,
    summary: `Цель: «${PURPOSES[c.purpose].label}». Найдено рисков: ${counts}. ${
      overall === 'high'
        ? 'Покупка под эту цель связана с существенными препятствиями.'
        : overall === 'medium'
          ? 'Цель достижима, но есть ограничения, которые нужно учесть.'
          : 'Существенных препятствий не выявлено.'
    }`,
    parcel: demo.parcel,
    zones: demo.zones,
    risks,
    data_sources: [
      { name: 'НСПД — сведения об участке и границе', fetched_at: doneAt },
      { name: 'НСПД — слои ЗОУИТ и территориальных зон', fetched_at: doneAt },
      { name: 'База ПЗЗ и нормативных актов ПРАВОЗОР', fetched_at: doneAt },
    ],
    disclaimer:
      'Отчёт носит рекомендательный характер и не является юридическим заключением. Выводы сформированы автоматически на основе открытых данных и требуют проверки юристом перед принятием решения о сделке.',
    generated_at: doneAt,
  }
}

export function toCheck(c: StoredCheck): Check {
  const known = Boolean(findDemoParcel(c.cadastral_number))
  let { status, stage } = statusAt(c.created_at)
  // неизвестный участок «падает» на этапе сбора данных
  const failed = !known && status !== 'queued' && status !== 'collecting'
  if (failed) status = 'failed'
  const report = status === 'done' ? buildReport(c) : null
  return {
    id: c.id,
    cadastral_number: c.cadastral_number,
    purpose: c.purpose,
    status,
    address: findDemoParcel(c.cadastral_number)?.parcel.address ?? null,
    overall_level: report?.overall_level ?? null,
    created_at: c.created_at,
    stage_message: failed ? null : stage,
    error: failed
      ? 'Участок с таким кадастровым номером не найден в НСПД. Проверьте номер или выберите участок на карте.'
      : null,
    report,
  }
}

export const newId = () => `chk-${Math.random().toString(36).slice(2, 10)}`
export type { StoredCheck }
