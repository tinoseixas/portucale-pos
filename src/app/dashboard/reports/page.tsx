
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Aquesta pàgina ja no és necessària perquè els albarans es generen automàticament.
 * Redirigim l'usuari a l'historial d'albarans per mantenir la coherència.
 */
export default function ReportsPage() {
    const router = useRouter()
    
    useEffect(() => {
        router.replace('/dashboard/albarans')
    }, [router])

    return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Redirigint a la gestió d'albarans...</p>
        </div>
    )
}
