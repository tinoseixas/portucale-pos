'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { ServiceCard } from '@/components/ServiceCard'
import { mockServices as initialServices } from '@/lib/data'
import type { Service } from '@/lib/types'

export default function DashboardPage() {
  const [services, setServices] = useState<Service[]>(initialServices)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Serveis del Dia</h1>
          <p className="text-muted-foreground">Un resum de la teva jornada laboral.</p>
        </div>
        <div className="hidden md:block">
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/dashboard/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nou Servei
                </Link>
            </Button>
        </div>
      </div>
      
      {services.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No hi ha serveis registrats</h2>
          <p className="text-muted-foreground mt-2">Comença afegint el teu primer servei del dia.</p>
          <Button asChild className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/dashboard/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Afegeix un Servei
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
