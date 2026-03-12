'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Aquesta pàgina ha estat desativada per sol·licitud de l'usuari.
 */
export default function ImportLegacyPage() {
    const router = useRouter()
    
    useEffect(() => {
        router.replace('/dashboard')
    }, [router])

    return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Redirigint...</p>
        </div>
    )
}
