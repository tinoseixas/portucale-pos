
'use client';

import { type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, LogIn } from 'lucide-react';
import { useUser } from '@/firebase';
import Link from 'next/link';

interface AdminGateProps {
  children: ReactNode;
  pageTitle: string;
  pageDescription: string;
}

/**
 * Componente simplificado que permite acesso a qualquer utilizador logado.
 * Removemos todas as restrições de permissões para garantir o funcionamento.
 */
export function AdminGate({ children, pageTitle, pageDescription }: AdminGateProps) {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
        <div className="flex items-center justify-center pt-16">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                     <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                        <ShieldCheck className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <CardTitle>{pageTitle}</CardTitle>
                    <CardDescription>A verificar acesso...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                </CardContent>
            </Card>
        </div>
    );
  }

  // Se estiver logado, tem acesso a tudo. Sem exceções.
  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center pt-16">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10">
                <ShieldCheck className="h-6 w-6 text-destructive" />
            </div>
          <CardTitle>Acesso Restrito</CardTitle>
          <CardDescription>
            Inicie sessão para aceder a esta funcionalidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild>
                <Link href="/">
                    <LogIn className="mr-2 h-4 w-4" />
                    Ir para Login
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
