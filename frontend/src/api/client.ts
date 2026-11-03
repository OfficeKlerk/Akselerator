/**
 * Тонкая обёртка над fetch. Авторизация — JWT в httpOnly-cookie,
 * поэтому токен в JS не хранится: достаточно credentials: 'include'.
 */

export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** FastAPI отдаёт ошибки как { detail: string } или { detail: [{ msg, loc }] } (ошибки валидации) */
function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const { detail } = body as { detail: unknown }
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d: { msg?: string }) => d.msg ?? '').filter(Boolean).join('; ')
    }
  }
  if (status === 429) return 'Слишком много запросов. Попробуйте через минуту.'
  if (status >= 500) return 'Сервер временно недоступен. Попробуйте позже.'
  return `Ошибка запроса (${status})`
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' })
  } catch {
    throw new ApiError(0, 'Нет связи с сервером. Проверьте подключение к интернету.')
  }

  if (res.status === 204) return undefined as T

  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, res.status))
  return body as T
}

export const json = (data: unknown): RequestInit => ({ body: JSON.stringify(data) })
