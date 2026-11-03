import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Parcel } from './types'

/** Предпросмотр участка по кадастровому номеру (данные НСПД, без расчёта рисков) */
export function useParcel(cadastralNumber: string | null) {
  return useQuery({
    queryKey: ['parcel', cadastralNumber],
    queryFn: () =>
      apiFetch<Parcel>(`/parcels?cadastral_number=${encodeURIComponent(cadastralNumber!)}`),
    enabled: cadastralNumber !== null,
    staleTime: 10 * 60_000,
    retry: false,
  })
}

/** Участок под точкой на карте (выбор участка кликом) */
export function fetchParcelAtPoint(lat: number, lng: number) {
  return apiFetch<Parcel>(`/parcels/at-point?lat=${lat}&lng=${lng}`)
}
