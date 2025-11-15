'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
import type { LocationRecord } from '@/lib/types'
import { LatLngExpression } from 'leaflet'

interface ServiceRouteMapProps {
  employeeId: string
  serviceId: string
}

export default function ServiceRouteMap({ employeeId, serviceId }: ServiceRouteMapProps) {
  const firestore = useFirestore()

  const locationsQuery = useMemoFirebase(() => {
    if (!employeeId || !serviceId) return null
    return query(
      collection(firestore, `employees/${employeeId}/serviceRecords/${serviceId}/locations`),
      orderBy('timestamp', 'asc')
    )
  }, [firestore, employeeId, serviceId])

  const { data: locations, isLoading } = useCollection<LocationRecord>(locationsQuery)

  const routePositions = useMemo(() => {
    if (!locations) return []
    return locations.map(loc => [loc.latitude, loc.longitude] as LatLngExpression)
  }, [locations])

  if (isLoading) {
    return <p>Carregant la ruta...</p>
  }

  if (!locations || locations.length === 0) {
    return <p>No hi ha dades de localització per a aquest servei.</p>
  }
  
  const startPosition = routePositions[0];
  const endPosition = routePositions[routePositions.length - 1];

  return (
    <div className="h-[400px] w-full rounded-md overflow-hidden border">
      <MapContainer center={startPosition} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline pathOptions={{ color: 'blue' }} positions={routePositions} />
        
        {startPosition && (
            <Marker position={startPosition}>
                <Popup>Punt d'inici</Popup>
            </Marker>
        )}
        {endPosition && (
             <Marker position={endPosition}>
                <Popup>Punt final</Popup>
            </Marker>
        )}
      </MapContainer>
    </div>
  )
}
