import { useEffect, useMemo } from 'react'
import L, { type LeafletMouseEvent, type PathOptions } from 'leaflet'
import { AttributionControl, CircleMarker, GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Parcel, RiskLevel, Zone } from '@/api/types'
import { RISK_HEX } from '@/lib/dictionaries'
import { cn } from '@/lib/utils'

const MOSCOW: [number, number] = [55.75, 37.62]
const PARCEL_COLOR = '#1E3A8A'
const NEUTRAL_ZONE = '#64748B'

interface ParcelMapProps {
  parcel?: Parcel | null
  zones?: Zone[]
  /** Уровень риска по зоне — красит зону цветом светофора */
  zoneLevels?: Record<string, RiskLevel>
  highlightZoneId?: string | null
  /** Клик по карте (выбор участка) */
  onPick?: (lat: number, lng: number) => void
  pickedPoint?: [number, number] | null
  className?: string
  /** Подпись для скринридеров: что изображено на карте */
  label: string
}

function FitToParcel({ parcel }: { parcel?: Parcel | null }) {
  const map = useMap()
  useEffect(() => {
    if (!parcel) return
    const bounds = L.geoJSON(parcel.geometry).getBounds()
    map.flyToBounds(bounds, { padding: [64, 64], maxZoom: 16, duration: 0.6 })
  }, [map, parcel])
  return null
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e: LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function zoneStyle(zone: Zone, level: RiskLevel | undefined, highlighted: boolean): PathOptions {
  const color = level ? RISK_HEX[level] : NEUTRAL_ZONE
  const territorial = zone.kind === 'territorial'
  return {
    color,
    weight: highlighted ? 3 : territorial ? 1.5 : 2,
    dashArray: territorial ? '6 6' : undefined,
    fillColor: color,
    fillOpacity: highlighted ? 0.35 : territorial ? 0.04 : 0.18,
  }
}

export function ParcelMap({
  parcel,
  zones = [],
  zoneLevels = {},
  highlightZoneId = null,
  onPick,
  pickedPoint,
  className,
  label,
}: ParcelMapProps) {
  // территориальные зоны рисуем первыми — они крупнее и лежат под ЗОУИТ
  const orderedZones = useMemo(
    () => [...zones].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'territorial' ? -1 : 1)),
    [zones],
  )

  return (
    <div role="region" aria-label={label} className={cn('overflow-hidden rounded-xl border bg-muted', className)}>
      <MapContainer
        center={MOSCOW}
        zoom={9}
        scrollWheelZoom={false}
        className={cn('h-full w-full', onPick && 'cursor-crosshair')}
        attributionControl={false}
      >
        <AttributionControl prefix='<a href="https://leafletjs.com">Leaflet</a>' />
        <TileLayer
          attribution='&copy; участники <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {orderedZones.map((z) => (
          <GeoJSON
            key={`${z.id}-${highlightZoneId === z.id}`}
            data={z.geometry}
            style={zoneStyle(z, zoneLevels[z.id], highlightZoneId === z.id)}
            onEachFeature={(_, layer) => layer.bindTooltip(`${z.type_label}: ${z.name}`, { sticky: true })}
          />
        ))}
        {parcel && (
          <GeoJSON
            key={parcel.cadastral_number}
            data={parcel.geometry}
            style={{ color: PARCEL_COLOR, weight: 3, fillColor: PARCEL_COLOR, fillOpacity: 0.12 }}
            onEachFeature={(_, layer) =>
              layer.bindTooltip(`Участок ${parcel.cadastral_number}`, { sticky: true })
            }
          />
        )}
        {pickedPoint && !parcel && (
          <CircleMarker center={pickedPoint} radius={6} pathOptions={{ color: PARCEL_COLOR, weight: 2 }} />
        )}
        <FitToParcel parcel={parcel} />
        {onPick && <ClickHandler onPick={onPick} />}
      </MapContainer>
    </div>
  )
}
