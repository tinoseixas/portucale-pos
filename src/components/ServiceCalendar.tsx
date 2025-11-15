'use client'

import { Calendar, dateFnsLocalizer, Event as CalendarEvent } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ca } from 'date-fns/locale'
import type { ServiceRecord } from '@/lib/types'

const locales = {
  'ca': ca,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }), // Dilluns
  getDay,
  locales,
})

interface ServiceCalendarProps {
  services: ServiceRecord[];
  onSelectEvent: (service: ServiceRecord) => void;
}

interface ServiceEvent extends CalendarEvent {
  resource: ServiceRecord;
}

export function ServiceCalendar({ services, onSelectEvent }: ServiceCalendarProps) {
  const events: ServiceEvent[] = services.map(service => ({
    title: service.description,
    start: new Date(service.arrivalDateTime),
    end: new Date(service.departureDateTime),
    resource: service,
  }));
  
  const messages = {
    allDay: 'Tot el dia',
    previous: 'Anterior',
    next: 'Següent',
    today: 'Avui',
    month: 'Mes',
    week: 'Setmana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Servei',
    noEventsInRange: 'No hi ha serveis en aquest rang.',
    showMore: (total: number) => `+ Veure'n ${total} més`,
  };

  return (
    <div className="h-[70vh] bg-card p-4 rounded-lg shadow">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={(event) => onSelectEvent(event.resource)}
        culture='ca'
        messages={messages}
      />
    </div>
  )
}
