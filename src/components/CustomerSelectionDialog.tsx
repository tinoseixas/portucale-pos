'use client';

import { useState, useMemo } from 'react';
import type { Customer } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building } from 'lucide-react';

interface CustomerSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onCustomerSelect: (customer: Customer) => void;
}

export function CustomerSelectionDialog({
  open,
  onOpenChange,
  customers,
  onCustomerSelect,
}: CustomerSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const uniqueAndFilteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    const seen = new Set();
    const unique = customers.filter(c => {
      const nameKey = c.name.toLowerCase().trim();
      if (seen.has(nameKey)) return false;
      seen.add(nameKey);
      return true;
    });

    if (!searchTerm) return unique;

    return unique.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Seleccionar Client</DialogTitle>
          <DialogDescription>
            Busca i selecciona un client de la llista.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Buscar per nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="h-72">
            <div className="space-y-2">
              {uniqueAndFilteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => onCustomerSelect(customer)}
                  className="w-full text-left p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3"
                >
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.nrt || 'NRT no especificat'}</p>
                  </div>
                </button>
              ))}
              {uniqueAndFilteredCustomers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No s'han trobat clients.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
