'use client'

import { useMemo, useEffect, useRef } from 'react'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
import type { LocationRecord } from '@/lib/types'
import L, { LatLngExpression } from 'leaflet'

interface ServiceRouteMapProps {
  employeeId: string
  serviceId: string
}

export default function ServiceRouteMap({ employeeId, serviceId }: ServiceRouteMapProps) {
  const firestore = useFirestore()
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

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

  useEffect(() => {
    // Only initialize map if container exists and map isn't already initialized
    if (mapContainerRef.current && !mapRef.current && routePositions.length > 0) {
      const map = L.map(mapContainerRef.current).setView(routePositions[0], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      mapRef.current = map;
    }
    
    // Update layers if map instance exists
    if (mapRef.current && routePositions.length > 0) {
        // Clear previous layers (markers, polylines)
        mapRef.current.eachLayer(layer => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                mapRef.current?.removeLayer(layer);
            }
        });
        
        // Add new layers
        L.polyline(routePositions, { color: 'blue' }).addTo(mapRef.current);

        const startPosition = routePositions[0];
        const endPosition = routePositions[routePositions.length - 1];

        if (startPosition) {
            L.marker(startPosition).addTo(mapRef.current).bindPopup("Punt d'inici");
        }
        if (endPosition) {
             L.marker(endPosition).addTo(mapRef.current).bindPopup("Punt final");
        }

        // Adjust view to fit the whole route
        if (routePositions.length > 1) {
            mapRef.current.fitBounds(routePositions, { padding: [25, 25] });
        }
    }

    // Cleanup function to destroy the map instance when the component unmounts
    return () => {
        if (mapRef.current) {
            mapRef.current.remove(); // This properly cleans up the map instance
            mapRef.current = null;
        }
    };
  }, [routePositions]); // Rerun effect if routePositions change


  if (isLoading) {
    return <p>Carregant la ruta...</p>
  }

  if (!locations || locations.length === 0) {
    return <p>No hi ha dades de localització per a aquest servei.</p>
  }
  
  // The div is now just a container. The map is managed by the useEffect hook.
  return <div ref={mapContainerRef} className="h-[400px] w-full rounded-md overflow-hidden border" />;
}
