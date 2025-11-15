'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
import type { Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function UsersPage() {
  const router = useRouter()
  const { user } = useUser()
  const firestore = useFirestore()

  const employeeDocRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(firestore, 'employees', user.uid)
  }, [firestore, user])

  const { data: currentEmployee, isLoading: isLoadingCurrentEmployee } = useDoc<Employee>(employeeDocRef)

  useEffect(() => {
    if (!isLoadingCurrentEmployee && currentEmployee?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [currentEmployee, isLoadingCurrentEmployee, router])

  const employeesQuery = useMemoFirebase(() => {
    if (currentEmployee?.role !== 'admin') return null
    return collection(firestore, 'employees')
  }, [firestore, currentEmployee])

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery)

  const getInitials = (employee: Employee) => {
    if (employee.firstName && employee.lastName) return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
    if (employee.firstName) return employee.firstName[0].toUpperCase()
    if (employee.email) return employee.email[0].toUpperCase()
    return 'U'
  }

  if (isLoadingCurrentEmployee || isLoadingEmployees) {
    return <p>Carregant usuaris...</p>
  }
  
  if (currentEmployee?.role !== 'admin') {
    return <p>Accés denegat.</p>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Gestió d'Usuaris</CardTitle>
          <CardDescription>Visualitza i gestiona tots els empleats registrats.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleat</TableHead>
                <TableHead>ID d'Empleat</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees && employees.map(employee => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback>{getInitials(employee)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.employeeId}</TableCell>
                  <TableCell>
                    <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
                      {employee.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
