'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SignaturePad } from '@/components/SignaturePad';
import { User, CheckCircle2 } from 'lucide-react';

interface ServiceConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, signatureDataUrl: string) => void;
  initialName?: string;
}

export function ServiceConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  initialName = '',
}: ServiceConfirmationDialogProps) {
  const [name, setName] = useState(initialName);
  const [signature, setSignature] = useState('');

  const handleConfirm = () => {
    if (name.trim() && signature) {
      onConfirm(name, signature);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Confirmació del Servei
          </DialogTitle>
          <DialogDescription>
            Si us plau, demana al client que signi per confirmar la recepció del servei.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="client-name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Nom de la persona que confirma
            </Label>
            <Input
              id="client-name"
              placeholder="Ex: Joan Garcia"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Signatura del Client</Label>
            <SignaturePad onSave={setSignature} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel·lar</Button>
          <Button onClick={handleConfirm} disabled={!name.trim() || !signature}>
            Confirmar Registre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
