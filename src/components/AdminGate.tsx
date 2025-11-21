'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ADMIN_PASSWORD = '6698';
const SESSION_STORAGE_KEY = 'admin_access_granted';

interface AdminGateProps {
  children: ReactNode;
  pageTitle: string;
  pageDescription: string;
}

export function AdminGate({ children, pageTitle, pageDescription }: AdminGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      toast({
        title: 'Accés concedit',
        description: 'Benvingut a la secció d\'administració.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Contrasenya incorrecta',
        description: 'La contrasenya introduïda no és correcta. Si us plau, torna-ho a provar.',
      });
      setPassword('');
    }
  };

  if (!isClient) {
    // Render nothing or a loading spinner on the server
    return null;
  }
  
  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center pt-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            Aquesta secció està protegida. Si us plau, introdueix la contrasenya d'administrador per continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Contrasenya d'Administrador</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              Desbloquejar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
