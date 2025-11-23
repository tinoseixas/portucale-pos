'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldCheck, LogIn } from 'lucide-react';
import { useUser } from '@/firebase';
import Link from 'next/link';

interface AdminGateProps {
  children: ReactNode;
  pageTitle: string;
  pageDescription: string;
}

const ADMIN_EMAIL = 'tinoseixas@gmail.com';

export function AdminGate({ children, pageTitle, pageDescription }: AdminGateProps) {
  const { user, isUserLoading } = useUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || isUserLoading) {
    // Render a loading state on the server and during initial client-side loading
    return (
        <div className="flex items-center justify-center pt-16">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                     <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                        <ShieldCheck className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <CardTitle>{pageTitle}</CardTitle>
                    <CardDescription>Verificant permisos...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                </CardContent>
            </Card>
        </div>
    );
  }

  // Once loading is complete, check for the user and their email
  const isAdmin = user && user.email === ADMIN_EMAIL;

  if (isAdmin) {
    return <>{children}</>;
  }

  // If not admin, show the access denied message
  return (
    <div className="flex items-center justify-center pt-16">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10">
                <ShieldCheck className="h-6 w-6 text-destructive" />
            </div>
          <CardTitle>Accés Denegat</CardTitle>
          <CardDescription>
            No tens permisos per accedir a aquesta secció. Si us plau, inicia sessió amb un compte d'administrador.
          </CardDescription>
        </CardHeader>
        {!user && (
             <CardContent>
                <Button asChild>
                    <Link href="/">
                        <LogIn className="mr-2 h-4 w-4" />
                        Anar a Iniciar Sessió
                    </Link>
                </Button>
            </CardContent>
        )}
      </Card>
    </div>
  );
}
