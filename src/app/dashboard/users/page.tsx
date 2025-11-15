'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection } from 'firebase/firestore'
import type { Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ADMIN_UID } from '@/lib/admin'

export default function UsersPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  
  const isCurrentUserAdmin = useMemo(() => {
    if (isUserLoading || !user) return false;
    return user.uid === ADMIN_UID;
  }, [user, isUserLoading]);

  const employeesQuery = useMemoFirebase(() => {
    if (!isCurrentUserAdmin || !firestore) return null;
    return collection(firestore, 'employees')
  }, [firestore, isCurrentUserAdmin])

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery)

  useEffect(() => {
    if (!isUserLoading && !isCurrentUserAdmin) {
      router.push('/dashboard');
    }
  }, [isUserLoading, isCurrentUserAdmin, router]);


  const getInitials = (employee: Employee) => {
    if (employee.firstName && employee.lastName) return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
    if (employee.firstName) return employee.firstName[0].toUpperCase()
    if (employee.email) return employee.email[0].toUpperCase()
    return 'U'
  }
  
  if (isUserLoading || isLoadingEmployees || !isCurrentUserAdmin) {
    return <p>Carregant usuaris...</p>
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
                <TableHead>Correu electrònic</TableHead>
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
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.employeeId}</TableCell>
                  <TableCell>{employee.email || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={employee.id === ADMIN_UID ? 'default' : 'secondary'}>
                      {employee.id === ADMIN_UID ? 'admin' : 'user'}
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
