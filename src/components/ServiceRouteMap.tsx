'use client'

import { useMemo, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
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
    // Evita a reinicialização do mapa
    if (mapContainerRef.current && !mapRef.current) {
        // Se o container existe mas o mapa não foi criado, inicializa-o
        if (routePositions.length > 0) {
            const map = L.map(mapContainerRef.current).setView(routePositions[0], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            mapRef.current = map;
        }
    }
    
    // Atualiza a rota quando os dados mudam
    if (mapRef.current && routePositions.length > 0) {
        // Limpa camadas antigas
        mapRef.current.eachLayer(layer => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                mapRef.current?.removeLayer(layer);
            }
        });
        
        // Adiciona novas camadas
        L.polyline(routePositions, { color: 'blue' }).addTo(mapRef.current);
        const startPosition = routePositions[0];
        const endPosition = routePositions[routePositions.length - 1];

        if (startPosition) {
            L.marker(startPosition).addTo(mapRef.current).bindPopup("Punt d'inici");
        }
        if (endPosition) {
             L.marker(endPosition).addTo(mapRef.current).bindPopup("Punt final");
        }

        // Ajusta a vista para incluir toda a rota
        if (routePositions.length > 1) {
            mapRef.current.fitBounds(routePositions);
        }
    }

    // Função de limpeza para destruir o mapa quando o componente é desmontado
    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };

  }, [routePositions]);


  if (isLoading) {
    return <p>Carregant la ruta...</p>
  }

  if (!locations || locations.length === 0) {
    return <p>No hi ha dades de localització per a aquest servei.</p>
  }
  
  // O div agora é apenas um container. O mapa é gerido pelo useEffect.
  return <div ref={mapContainerRef} className="h-[400px] w-full rounded-md overflow-hidden border" />;
}
