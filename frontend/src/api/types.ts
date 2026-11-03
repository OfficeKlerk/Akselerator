/**
 * Контракт API между фронтендом и бэкендом (FastAPI).
 * Поля в snake_case — так их отдаёт Pydantic по умолчанию.
 * Подробное описание эндпоинтов — в README.md фронтенда.
 */
import type { MultiPolygon, Polygon } from 'geojson'

export type Purpose = 'warehouse' | 'izhs' | 'mkd'

export type RiskLevel = 'low' | 'medium' | 'high'

/** queued → collecting (НСПД/ЕГРН, геобаза) → analyzing (поиск норм + ИИ) → done | failed */
export type CheckStatus = 'queued' | 'collecting' | 'analyzing' | 'done' | 'failed'

export type ParcelGeometry = Polygon | MultiPolygon

export interface User {
  id: string
  email: string
  full_name: string
  company: string | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  full_name: string
  email: string
  password: string
  company: string | null
  /** Согласие на обработку персональных данных (152-ФЗ), должно быть true */
  pd_consent: true
}

/** Сведения об участке из НСПД */
export interface Parcel {
  cadastral_number: string
  address: string | null
  area_m2: number | null
  land_category: string | null
  permitted_use: string | null
  cadastral_value_rub: number | null
  geometry: ParcelGeometry
}

export type ZoneKind = 'zouit' | 'territorial'

/** Зона, с которой пересекается участок (результат ST_Intersects в PostGIS) */
export interface Zone {
  id: string
  kind: ZoneKind
  /** Тип зоны, например «Охранная зона ЛЭП» или «Территориальная зона П-1» */
  type_label: string
  name: string
  registry_number: string | null
  overlap_area_m2: number
  /** Доля площади участка внутри зоны, 0–100 */
  overlap_pct: number
  geometry: ParcelGeometry
}

/** Ссылка на норму, на которой основан вывод */
export interface Citation {
  document: string
  article: string | null
  /** Найденный фрагмент нормы (RAG) */
  quote: string | null
  url: string | null
}

export interface Risk {
  id: string
  level: RiskLevel
  title: string
  finding: string
  basis: Citation[]
  recommendation: string
  zone_ids: string[]
}

export interface DataSource {
  name: string
  fetched_at: string
}

export interface Report {
  overall_level: RiskLevel
  summary: string
  parcel: Parcel
  zones: Zone[]
  risks: Risk[]
  data_sources: DataSource[]
  disclaimer: string
  generated_at: string
}

export interface CheckSummary {
  id: string
  cadastral_number: string
  purpose: Purpose
  status: CheckStatus
  address: string | null
  overall_level: RiskLevel | null
  created_at: string
}

export interface Check extends CheckSummary {
  /** Текущий шаг для пользователя, например «Запрашиваем данные НСПД» */
  stage_message: string | null
  error: string | null
  report: Report | null
}

export interface CreateCheckPayload {
  cadastral_number: string
  purpose: Purpose
}

/** Ответ 202 Accepted: расчёт запущен в фоне (Celery) */
export interface CreateCheckResponse {
  id: string
  status: CheckStatus
}
