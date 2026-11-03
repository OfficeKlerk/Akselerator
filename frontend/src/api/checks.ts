import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE, ApiError, apiFetch, json } from './client'
import type { Check, CheckSummary, CreateCheckPayload, CreateCheckResponse } from './types'

const POLL_INTERVAL_MS = 2000

export const isFinished = (c: Pick<Check, 'status'>) => c.status === 'done' || c.status === 'failed'

export function useChecks() {
  return useQuery({
    queryKey: ['checks'],
    queryFn: () => apiFetch<CheckSummary[]>('/checks'),
    // пока в списке есть незавершённые проверки — обновляем список
    refetchInterval: (q) =>
      q.state.data?.some((c) => !isFinished(c)) ? POLL_INTERVAL_MS * 2 : false,
  })
}

/** Отчёт считается в фоне: опрашиваем статус, пока он не станет done/failed */
export function useCheck(id: string) {
  return useQuery({
    queryKey: ['checks', id],
    queryFn: () => apiFetch<Check>(`/checks/${id}`),
    refetchInterval: (q) => (q.state.data && isFinished(q.state.data) ? false : POLL_INTERVAL_MS),
  })
}

export function useCreateCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCheckPayload) =>
      apiFetch<CreateCheckResponse>('/checks', { method: 'POST', ...json(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checks'], exact: true }),
  })
}

/** PDF рендерит бэкенд (Jinja2 + WeasyPrint) из того же шаблона, что и страница отчёта */
export async function downloadReportPdf(id: string, cadastralNumber: string) {
  const res = await fetch(`${API_BASE}/checks/${id}/report.pdf`, { credentials: 'include' })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(res.status, body?.detail ?? 'Не удалось скачать PDF')
  }
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = `pravozor-${cadastralNumber.replaceAll(':', '-')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
