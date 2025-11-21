'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import "leaflet-defaulticon-compatibility";


interface MapViewProps {
    latitude: number;
    longitude: number;
}

export default function MapView({ latitude, longitude }: MapViewProps) {
    const position: [number, number] = [latitude, longitude];

    return (
        <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
                <Popup>
                    Ubicació on es va iniciar el servei.
                </Popup>
            </Marker>
        </MapContainer>
    )
}
