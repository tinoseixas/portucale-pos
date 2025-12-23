'use client'

import { useState, useMemo, useEffect } from 'react'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, collectionGroup } from 'firebase/firestore'
import type { ServiceRecord, Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { AdminGate } from '@/components/AdminGate'
import { User, Calendar as CalendarIcon, LineChart, X } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import {
  format,
  parseISO,
  isWithinInterval,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getWeek,
  getMonth,
  getYear,
  differenceInMinutes,
  isValid
} from 'date-fns'
import { ca } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function ActivityReportPage() {
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // Data fetching
  const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees'), orderBy('firstName')) : null, [firestore])
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery)

  const servicesQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'serviceRecords'), orderBy('arrivalDateTime', 'desc')) : null, [firestore])
  const { data: allServices, isLoading: isLoadingServices } = useCollection<ServiceRecord>(servicesQuery)

  // Filtering logic
  const filteredServices = useMemo(() => {
    if (!allServices) return []
    return allServices.filter(service => {
      const employeeMatch = selectedEmployeeId === 'all' || service.employeeId === selectedEmployeeId
      if (!employeeMatch) return false

      if (dateRange?.from && dateRange?.to) {
        const serviceDate = parseISO(service.arrivalDateTime)
        return isValid(serviceDate) && isWithinInterval(serviceDate, { start: dateRange.from, end: dateRange.to })
      }
      
      // If no date range, include all services for the selected employee
      if(!dateRange?.from || !dateRange?.to) return true

      return false
    })
  }, [allServices, selectedEmployeeId, dateRange])

  // Calculation logic
  const calculations = useMemo(() => {
    if (filteredServices.length === 0) {
      return { daily: {}, weekly: {}, monthly: {}, total: 0 }
    }

    const daily: { [key: string]: number } = {}
    const weekly: { [key: string]: number } = {}
    const monthly: { [key: string]: number } = {}
    let totalMinutes = 0

    filteredServices.forEach(service => {
      const start = parseISO(service.arrivalDateTime)
      const end = parseISO(service.departureDateTime)

      if (!isValid(start) || !isValid(end) || end <= start) return

      const minutes = differenceInMinutes(end, start)
      totalMinutes += minutes

      const dayKey = format(start, 'yyyy-MM-dd')
      const weekKey = `${getYear(start)}-W${getWeek(start, { locale: ca })}`
      const monthKey = format(start, 'yyyy-MM')

      daily[dayKey] = (daily[dayKey] || 0) + minutes
      weekly[weekKey] = (weekly[weekKey] || 0) + minutes
      monthly[monthKey] = (monthly[monthKey] || 0) + minutes
    })

    return {
      daily,
      weekly,
      monthly,
      total: totalMinutes / 60,
    }
  }, [filteredServices])
  
  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m}m`
  }
  
  const clearFilters = () => {
    setSelectedEmployeeId('all')
    setDateRange(undefined)
  }

  const isLoading = isLoadingEmployees || isLoadingServices || isUserLoading

  return (
    <AdminGate pageTitle="Relatório de Atividade" pageDescription="Análise detalhada das horas trabalhadas.">
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <LineChart className="h-6 w-6" />
                Relatório de Atividade de Funcionários
            </CardTitle>
            <CardDescription>Filtre por funcionário e intervalo de datas para ver o total de horas trabalhadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Funcionário</label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={isLoadingEmployees}>
                      <SelectTrigger>
                          <SelectValue placeholder="Carregando funcionários..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Todos os Funcionários</SelectItem>
                          {employees?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                     <label className="text-sm font-medium flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Intervalo de Datas</label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Escolha um intervalo</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            locale={ca}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="flex items-end">
                    <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
                        <X className="mr-2 h-4 w-4" />
                        Limpar Filtros
                    </Button>
                </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <p>A carregar dados do relatório...</p>
        ) : (
          <>
            <Card>
                <CardHeader>
                    <CardTitle>Resumo Total</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-primary">{calculations.total.toFixed(2)}</div>
                    <p className="text-muted-foreground">horas totais no período selecionado.</p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Daily */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Horas por Dia</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                       {Object.keys(calculations.daily).length > 0 ? (
                        <div className="space-y-2">
                            {Object.entries(calculations.daily).sort(([dayA], [dayB]) => dayA.localeCompare(dayB)).map(([day, minutes]) => (
                                <div key={day} className="flex justify-between text-sm p-2 rounded-md bg-muted/50">
                                    <span>{format(parseISO(day), 'dd/MM/yyyy', { locale: ca })}</span>
                                    <span className="font-semibold">{formatMinutes(minutes)}</span>
                                </div>
                            ))}
                        </div>
                       ) : <p className="text-sm text-muted-foreground text-center py-4">Sem dados diários para mostrar.</p>}
                    </CardContent>
                </Card>

                {/* Weekly */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Horas por Semana</CardTitle>
                    </CardHeader>
                     <CardContent className="flex-1 overflow-y-auto">
                       {Object.keys(calculations.weekly).length > 0 ? (
                         <div className="space-y-2">
                            {Object.entries(calculations.weekly).sort(([weekA], [weekB]) => weekA.localeCompare(weekB)).map(([week, minutes]) => (
                                <div key={week} className="flex justify-between text-sm p-2 rounded-md bg-muted/50">
                                    <span>Semana {week.split('-W')[1]} de {week.split('-W')[0]}</span>
                                    <span className="font-semibold">{formatMinutes(minutes)}</span>
                                </div>
                            ))}
                        </div>
                       ) : <p className="text-sm text-muted-foreground text-center py-4">Sem dados semanais para mostrar.</p>}
                    </CardContent>
                </Card>
                
                {/* Monthly */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Horas por Mês</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                       {Object.keys(calculations.monthly).length > 0 ? (
                        <div className="space-y-2">
                           {Object.entries(calculations.monthly).sort(([monthA], [monthB]) => monthA.localeCompare(monthB)).map(([month, minutes]) => (
                                <div key={month} className="flex justify-between text-sm p-2 rounded-md bg-muted/50">
                                    <span className="capitalize">{format(parseISO(month), 'MMMM yyyy', { locale: ca })}</span>
                                    <span className="font-semibold">{formatMinutes(minutes)}</span>
                                </div>
                            ))}
                        </div>
                       ) : <p className="text-sm text-muted-foreground text-center py-4">Sem dados mensais para mostrar.</p>}
                    </CardContent>
                </Card>
            </div>
          </>
        )}
      </div>
    </AdminGate>
  )
}
