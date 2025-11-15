'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Camera, Video, StopCircle, SwitchCamera, X, Check } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CameraCaptureProps {
  onCapture: (dataUrl: string, type: 'image' | 'video') => void
  onClose: () => void
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const { toast } = useToast()

  const cleanupStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        if (stream) cleanupStream();

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true, // Request audio for video recording
        })
        setStream(newStream)
        setHasPermission(true)
        if (videoRef.current) {
          videoRef.current.srcObject = newStream
        }
      } catch (error) {
        console.error('Error accessing camera:', error)
        setHasPermission(false)
      }
    }
    getCameraPermission()

    return () => {
      cleanupStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  const handleTakePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const context = canvas.getContext('2d')
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        onCapture(dataUrl, 'image')
      }
    }
  }

  const handleStartRecording = () => {
    if (stream) {
      setIsRecording(true)
      const recordedChunks: Blob[] = []
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' })

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          onCapture(reader.result as string, 'video')
        }
        reader.readAsDataURL(blob)
        setIsRecording(false)
      }
      mediaRecorderRef.current.start()
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
  }

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'))
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
       <AlertDialog open={hasPermission === false}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Permís de Càmera Requerit</AlertDialogTitle>
              <AlertDialogDescription>
                  Per capturar fotos i vídeos, necessites donar permís a l'aplicació per accedir a la teva càmera. Si us plau, habilita el permís a la configuració del teu navegador.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button onClick={onClose}>Tancar</Button>
              </AlertDialogFooter>
          </AlertDialogContent>
       </AlertDialog>
      
      {hasPermission && (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          <div className="absolute top-4 left-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white bg-black/50 hover:bg-black/75">
              <X />
            </Button>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 w-full">
            <Button variant="ghost" size="icon" onClick={toggleCamera} className="text-white bg-black/50 hover:bg-black/75">
              <SwitchCamera />
            </Button>

            {!isRecording && (
                <Button onClick={handleTakePhoto} size="icon" className="w-16 h-16 rounded-full bg-white text-black hover:bg-gray-200 border-4 border-black/50">
                    <Camera className="h-8 w-8"/>
                </Button>
            )}

            {isRecording ? (
              <Button onClick={handleStopRecording} size="icon" className="w-16 h-16 rounded-full bg-red-500 text-white animate-pulse">
                <StopCircle className="h-8 w-8" />
              </Button>
            ) : (
               <Button onClick={handleStartRecording} variant="ghost" size="icon" className="text-white bg-black/50 hover:bg-black/75">
                <Video />
              </Button>
            )}
          </div>
        </div>
      )}
       {!hasPermission && hasPermission !== null && (
         <div className="text-white text-center">
            <p>No s'ha pogut accedir a la càmera.</p>
         </div>
       )}
        {hasPermission === null && (
             <div className="text-white text-center">
                <p>Demanant permís de càmera...</p>
            </div>
        )}
    </div>
  )
}
