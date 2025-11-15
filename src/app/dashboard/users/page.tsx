'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase'
import { collection } from 'firebase/firestore'
import type { Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ADMIN_EMAIL } from '@/lib/admin'

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path
      d="M16.75 13.96c.25.13.43.2.6.38.2.19.3.4.38.63.09.25.12.5.12.78 0 .25-.03.5-.09.72s-.15.42-.28.59c-.13.16-.28.3-.48.42s-.42.2-.66.25c-.25.06-.5.09-.77.09-.53 0-1.04-.1-1.53-.28s-.95-.45-1.38-.78c-.43-.34-.8-.75-1.1-1.23s-.55-.98-.74-1.5c-.2-.5-.3-1.02-.3-1.56 0-.5.1-1 .3-1.48.2-.48.48-.9.82-1.24s.75-.6 1.2-.78c.45-.18.9-.28 1.4-.28.25 0 .5.03.75.09s.48.15.68.28c.2.13.38.28.5.48s.22.4.28.64c.06.25.09.48.09.75 0 .25-.03.48-.09.7s-.15.42-.28.58c-.13.16-.28.3-.48.42s-.42.2-.66.25c-.25.06-.5.09-.77.09-.28 0-.55-.03-.8-.09s-.48-.15-.68-.28c-.2-.13-.35-.28-.48-.48s-.2-.4-.2-.64v-.3l.6-.6c.3-.3.6-.5.9-.6.3-.1.6-.2.9-.2.3 0 .6.1.9.2s.5.2.7.4c.2.2.3.4.4.6.1.2.1.5.1.7zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
  </svg>
);


export default function UsersPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  const isCurrentUserAdmin = useMemo(() => {
    if (isUserLoading || !user) return false;
    return user.email === ADMIN_EMAIL;
  }, [user, isUserLoading]);

  const employeesQuery = useMemoFirebase(() => {
    if (!isCurrentUserAdmin || !firestore) return null;
    // This query now fetches the entire document for all employees
    return collection(firestore, 'employees')
  }, [firestore, isCurrentUserAdmin])

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery)

  useEffect(() => {
    if (!isUserLoading && !isCurrentUserAdmin) {
      router.push('/dashboard');
    }
  }, [isUserLoading, isCurrentUserAdmin, router]);

  const handleWhatsAppClick = (phoneNumber: string) => {
    const internationalNumber = phoneNumber.startsWith('+') ? phoneNumber : `34${phoneNumber}`;
    window.open(`https://wa.me/${internationalNumber.replace(/\s+/g, '')}`, '_blank');
  };

  const getInitials = (employee: Employee) => {
    if (employee.firstName && employee.lastName) return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
    if (employee.firstName) return employee.firstName[0].toUpperCase()
    if (employee.email) return employee.email[0].toUpperCase()
    return 'U'
  }
  
  if (isUserLoading || isLoadingEmployees) {
    return <p>Carregant usuaris...</p>
  }
  
  if (!isCurrentUserAdmin) {
     return <p>Accés no autoritzat.</p>;
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
                <TableHead>Accions</TableHead>
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
                    <Badge variant={employee.email === ADMIN_EMAIL ? 'default' : 'secondary'}>
                      {employee.email === ADMIN_EMAIL ? 'admin' : 'user'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.phoneNumber && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWhatsAppClick(employee.phoneNumber!)}
                        aria-label={`Enviar WhatsApp a ${employee.firstName}`}
                      >
                        <WhatsAppIcon className="h-5 w-5 text-green-500" />
                      </Button>
                    )}
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
