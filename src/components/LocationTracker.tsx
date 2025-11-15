'use client'

import { useEffect, useRef } from 'react'
import { useFirestore } from '@/firebase'
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { collection } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'

interface LocationTrackerProps {
  employeeId: string
  serviceRecordId: string
  isTracking: boolean
}

export function LocationTracker({
  employeeId,
  serviceRecordId,
  isTracking
}: LocationTrackerProps) {
  const firestore = useFirestore()
  const { toast } = useToast()
  const watchIdRef = useRef<number | null>(null)
  
  useEffect(() => {
    const startWatching = () => {
      if (!firestore) return;

      if (!('geolocation' in navigator)) {
        toast({
          variant: 'destructive',
          title: 'Geolocalització no suportada',
          description: 'El teu navegador no suporta la geolocalització.',
        });
        return;
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
        addDocumentNonBlocking(locationRecordsCol, newLocationRecord)
      }

      const errorCallback: PositionErrorCallback = (error) => {
        console.error('Error de geolocalització:', error)
         if(error.code === error.PERMISSION_DENIED) {
             toast({
              variant: 'destructive',
              title: 'Permís de localització denegat',
              description: "Si us plau, habiliteu el permís de localització per registrar la ruta.",
            })
         }
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
      
      // Try to get permission silently first
      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
          if (permissionStatus.state === 'granted') {
             watchIdRef.current = navigator.geolocation.watchPosition(
                successCallback,
                errorCallback,
                options
            );
          } else if (permissionStatus.state === 'prompt') {
             navigator.geolocation.getCurrentPosition(
                (pos) => { // Got permission
                     watchIdRef.current = navigator.geolocation.watchPosition(
                        successCallback,
                        errorCallback,
                        options
                    );
                     successCallback(pos); // Log initial position
                },
                errorCallback,
                options
             );
          } else {
            errorCallback({ code: 1, message: "Permission denied.", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
          }
      });
    }

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

    return () => {
      stopWatching()
    }
  }, [isTracking, firestore, employeeId, serviceRecordId, toast]);


  // This component is now invisible and handles tracking in the background
  return null
}
