'use client'

import { useEffect, useRef } from 'react'
import { useFirestore } from '@/firebase'
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { collection } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { Button } from './ui/button'
import { MapPin, Play, Square } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface LocationTrackerProps {
  employeeId: string
  serviceRecordId: string
  isTracking: boolean
  setIsTracking: (isTracking: boolean) => void
}

export function LocationTracker({
  employeeId,
  serviceRecordId,
  isTracking,
  setIsTracking,
}: LocationTrackerProps) {
  const firestore = useFirestore()
  const { toast } = useToast()
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    // Function to start watching the position
    const startWatching = () => {
      if (!firestore) return

      // Check for Geolocation support
      if (!('geolocation' in navigator)) {
        toast({
          variant: 'destructive',
          title: 'Geolocalització no suportada',
          description: 'El teu navegador no suporta la geolocalització.',
        })
        setIsTracking(false)
        return
      }

      const locationRecordsCol = collection(
        firestore,
        `employees/${employeeId}/serviceRecords/${serviceRecordId}/locations`
      )

      const successCallback: PositionCallback = (position) => {
        const { latitude, longitude } = position.coords
        const newLocationRecord = {
          employeeId,
          serviceRecordId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        }
        // Save to Firestore without blocking
        addDocumentNonBlocking(locationRecordsCol, newLocationRecord)
      }

      const errorCallback: PositionErrorCallback = (error) => {
        console.error('Error de geolocalització:', error)
        toast({
          variant: 'destructive',
          title: 'Error de Geolocalització',
          description: `No s'ha pogut obtenir la teva posició. Codi: ${error.code}`,
        })
        setIsTracking(false) // Stop tracking on error
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0,
      }

      // Start watching position and store the watch ID
      watchIdRef.current = navigator.geolocation.watchPosition(
        successCallback,
        errorCallback,
        options
      )
    }

    // Function to stop watching the position
    const stopWatching = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }

    if (isTracking) {
      startWatching()
    } else {
      stopWatching()
    }

    // Cleanup function to stop watching when the component unmounts or isTracking becomes false
    return () => {
      stopWatching()
    }
  }, [isTracking, firestore, employeeId, serviceRecordId, toast, setIsTracking])
  
  const handleToggleTracking = () => {
     if (!isTracking) {
        // Request permission before starting
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Permission granted
                setIsTracking(true);
                toast({
                    title: "Seguiment de GPS iniciat",
                    description: "La teva localització s'està registrant.",
                });
            },
            (error) => {
                // Permission denied
                toast({
                    variant: 'destructive',
                    title: 'Permís de localització denegat',
                    description: "Has de permetre l'accés a la localització per iniciar el seguiment.",
                });
            }
        );
    } else {
        setIsTracking(false);
        toast({
            title: "Seguiment de GPS aturat",
            description: "El registre de la teva localització ha finalitzat.",
        });
    }
  }


  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5"/> Seguiment GPS</CardTitle>
            <CardDescription>
                Inicia el seguiment per registrar la teva ruta durant el servei. El client no tindrà accés a aquesta informació.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleToggleTracking} className="w-full">
                {isTracking ? <Square className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {isTracking ? 'Aturar Seguiment' : 'Iniciar Seguiment'}
            </Button>
            {isTracking && (
                 <p className="text-sm text-center text-green-600 mt-4 animate-pulse">
                    Seguiment actiu...
                </p>
            )}
        </CardContent>
    </Card>
  )
}
