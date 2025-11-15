'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase'
import { collection, query, doc } from 'firebase/firestore'
import type { Employee } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ADMIN_EMAIL } from '@/lib/admin'
import { Edit, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast'

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path
      d="M12.04 2.01A10.03 10.03 0 0 0 2 12.05a10.03 10.03 0 0 0 10.04 10.04 10.03 10.03 0 0 0 10.04-10.04c0-5.52-4.49-10.04-10.04-10.04zM12.04 20.1a8.03 8.03 0 0 1-8.03-8.04c0-4.43 3.6-8.03 8.03-8.03A8.03 8.03 0 0 1 20.07 12.05a8.03 8.03 0 0 1-8.03 8.04z"
    ></path>
    <path
      d="M15.43 14.61c-.13-.06-1.12-.55-1.29-.62-.18-.06-.31-.1-.44.1-.13.2-.49.62-.6.74-.11.13-.22.14-.41.09-.19-.06-.82-.3-1.56-.96-.58-.51-1.02-1.15-1.13-1.34s-.01-.29.09-.38c.09-.09.2-.23.29-.34.1-.11.13-.19.19-.31.06-.13.03-.25-.01-.34-.05-.1-.44-1.06-.6-1.45-.16-.39-.32-.34-.44-.34-.11 0-.25-.01-.37-.01s-.32 0-.49.1c-.17.1-.44.2-.6.49-.16.29-.62.77-.62 1.87 0 1.1.63 2.17.72 2.32.09.15 1.25 1.91 3.03 2.68.43.18.77.29 1.04.37.52.16.99.14 1.36.09.43-.06 1.29-.52 1.47-.98.18-.47.18-.87.13-.98s-.13-.18-.28-.29z"
    ></path>
  </svg>
);


export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  const isCurrentUserAdmin = useMemo(() => {
    if (isUserLoading || !user) return false;
    return user.email === ADMIN_EMAIL;
  }, [user, isUserLoading]);

  const employeesQuery = useMemoFirebase(() => {
    if (!isCurrentUserAdmin || !firestore) return null;
    return query(collection(firestore, 'employees'))
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

  const handleDeleteUser = (employeeId: string, employeeName: string) => {
    if (!firestore) return;
    const employeeDocRef = doc(firestore, 'employees', employeeId);
    
    deleteDocumentNonBlocking(employeeDocRef);
    
    toast({
      title: 'Utilizador Eliminado',
      description: `O utilizador ${employeeName} foi eliminado com sucesso.`,
    });
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
                <TableHead className="text-right">Accions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees && employees.filter(e => e.email !== ADMIN_EMAIL).map(employee => (
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
                  <TableCell className="text-right flex justify-end items-center gap-2">
                     <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/users/edit/${employee.id}`}>
                            <Edit className="h-4 w-4" />
                        </Link>
                    </Button>
                    {employee.phoneNumber && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWhatsAppClick(employee.phoneNumber!)}
                        aria-label={`Enviar WhatsApp a ${employee.firstName}`}
                        className="h-9 w-9"
                      >
                        <WhatsAppIcon className="h-5 w-5 text-green-500" />
                      </Button>
                    )}
                    {employee.email !== ADMIN_EMAIL && (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Aquesta acció no es pot desfer. Això eliminarà permanentment el registre de l'empleat <strong>{employee.firstName} {employee.lastName}</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(employee.id, `${employee.firstName} ${employee.lastName}`)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
