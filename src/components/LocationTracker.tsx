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
        console.error('Geolocation is not supported by this browser.');
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
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
      
      // Try to get permission silently first
      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
          if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
             // If we have permission or the browser will prompt, start watching.
             // We get the initial position to trigger the prompt if needed.
             navigator.geolocation.getCurrentPosition(
                (pos) => { // Got permission and initial position
                     if (watchIdRef.current === null) { // Avoid multiple watchers
                         watchIdRef.current = navigator.geolocation.watchPosition(
                            successCallback,
                            errorCallback,
                            options
                        );
                     }
                     successCallback(pos); // Log initial position
                },
                errorCallback,
                options
             );
          } else if (permissionStatus.state === 'denied') {
             // Permission is denied, do nothing silently.
             console.error("Geolocation permission has been denied.");
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
