'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SwitchCamera, X } from 'lucide-react'
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

const MAX_VIDEO_DURATION_MS = 15000; // 15 seconds

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [progress, setProgress] = useState(0);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const currentProgress = Math.min((elapsedTime / MAX_VIDEO_DURATION_MS) * 100, 100);
        setProgress(currentProgress);
        if (elapsedTime >= MAX_VIDEO_DURATION_MS) {
          handleStopRecording();
        }
      }, 100);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleTakePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const context = canvas.getContext('2d')
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        onCapture(dataUrl, 'image')
      }
    }
  }

  const handleStartRecording = () => {
    if (stream) {
      setIsRecording(true)
      const recordedChunks: Blob[] = []
      
      let mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if(!MediaRecorder.isTypeSupported(mimeType)) {
              // Fallback if neither is supported
              console.error("Neither webm nor mp4 is supported");
              return;
          }
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mimeType })
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
    }
    setIsRecording(false);
  }

  const handleMouseDown = () => {
    pressTimerRef.current = setTimeout(() => {
      handleStartRecording();
    }, 250); // Start recording after 250ms press
  };

  const handleMouseUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      if (!isRecording) {
        handleTakePhoto();
      } else {
        handleStopRecording();
      }
    } else if (isRecording) {
      handleStopRecording();
    }
  };

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
          <div className="absolute top-4 left-4 z-10">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white bg-black/50 hover:bg-black/75 rounded-full">
              <X />
            </Button>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 w-full">
            <div className="absolute left-10">
                <Button variant="ghost" size="icon" onClick={toggleCamera} className="text-white bg-black/50 hover:bg-black/75 rounded-full">
                    <SwitchCamera />
                </Button>
            </div>

            <div className="relative flex items-center justify-center">
                 <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r="34"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-gray-700"
                    />
                    <circle
                        cx="48"
                        cy="48"
                        r="34"
                        stroke="hsl(var(--primary))"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={(2 * Math.PI * 34) * (1 - progress / 100)}
                        className="text-blue-500 transition-all duration-300"
                    />
                 </svg>

                <button
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onTouchEnd={handleMouseUp}
                    onMouseLeave={handleStopRecording} // Stop if mouse leaves button
                    className="absolute w-16 h-16 rounded-full bg-white transition-transform duration-200 active:scale-90 focus:outline-none"
                    aria-label="Capture"
                >
                    <div className={`w-full h-full rounded-full transition-all duration-200 ${isRecording ? 'bg-red-500 scale-75' : 'bg-white'}`}></div>
                </button>
            </div>

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
