'use client'

import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function LocationEvents({ lat, lng, disabled, onChange }: LocationProps) {
  const map = useMap()
  useMapEvents({ click(event) { if (!disabled) onChange(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6))) } })
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  useEffect(() => {
    if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) map.panTo([lat, lng])
  }, [lat, lng, map])
  return lat !== null && lng !== null ? <CircleMarker center={[lat, lng]} radius={9} pathOptions={{ color: '#006c77', fillColor: '#44d4e3', fillOpacity: 1 }} /> : null
}

type LocationProps = { disabled: boolean; lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void }

export default function CmsProjectLocationMap(props: LocationProps) {
  return <MapContainer center={props.lat !== null && props.lng !== null ? [props.lat, props.lng] : [13.7563, 100.5018]} zoom={props.lat !== null ? 12 : 6} scrollWheelZoom={false} className="cms-project-location-map">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <LocationEvents {...props} />
  </MapContainer>
}
