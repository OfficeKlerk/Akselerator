import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch, json } from './client'
import type { LoginPayload, RegisterPayload, User } from './types'

export const meQueryKey = ['me'] as const

/** Текущий пользователь или null, если сессии нет (401) */
async function fetchMe(): Promise<User | null> {
  try {
    return await apiFetch<User>('/auth/me')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

export function useMe() {
  return useQuery({ queryKey: meQueryKey, queryFn: fetchMe, staleTime: 5 * 60_000 })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      apiFetch<User>('/auth/login', { method: 'POST', ...json(payload) }),
    onSuccess: (user) => qc.setQueryData(meQueryKey, user),
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      apiFetch<User>('/auth/register', { method: 'POST', ...json(payload) }),
    onSuccess: (user) => qc.setQueryData(meQueryKey, user),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.clear()
      qc.setQueryData(meQueryKey, null)
    },
  })
}
