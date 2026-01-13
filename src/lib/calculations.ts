import type { ServiceRecord, Employee } from '@/lib/types';
import { parseISO, isValid, differenceInMinutes } from 'date-fns';

const ADMIN_EMAIL = 'tinoseixas@gmail.com';
const ADMIN_HOURLY_RATE = 30; // This will now be a fallback
const USER_HOURLY_RATE = 27; // This will now be a fallback
export const IVA_RATE = 0.045; // 4.5% IGI for Andorra

export function calculateLaborCost(services: ServiceRecord[], employees: Employee[]): number {
    if (!services || !employees) return 0;
    return services.reduce((total, service) => {
        const employee = employees.find(e => e.id === service.employeeId);
        
        // Use employee's default rate. Fallback to hardcoded values if not set.
        const hourlyRate = employee?.hourlyRate ?? (employee?.email === ADMIN_EMAIL ? ADMIN_HOURLY_RATE : USER_HOURLY_RATE);
        
        if (service.arrivalDateTime && service.departureDateTime) {
            const startDate = parseISO(service.arrivalDateTime);
            const endDate = parseISO(service.departureDateTime);
            if (isValid(startDate) && isValid(endDate) && endDate > startDate) {
                const minutes = differenceInMinutes(endDate, startDate);
                return total + (minutes / 60) * hourlyRate;
            }
        }
        return total;
    }, 0);
}

export function calculateTotalMinutes(services: ServiceRecord[]): number {
    if (!services) return 0;
    return services.reduce((total, service) => {
        if (service.arrivalDateTime && service.departureDateTime) {
            const startDate = parseISO(service.arrivalDateTime);
            const endDate = parseISO(service.departureDateTime);
            if (isValid(startDate) && isValid(endDate) && endDate > startDate) {
              return total + differenceInMinutes(endDate, startDate);
            }
        }
        return total;
    }, 0);
}

export function calculateTotalAmount(services: ServiceRecord[], employees: Employee[], applyIva: boolean = true): {
    subtotal: number,
    iva: number,
    totalGeneral: number,
    totalHours: number,
    materialsSubtotal: number,
    laborCost: number,
} {
    if (!services || !employees) return { subtotal: 0, iva: 0, totalGeneral: 0, totalHours: 0, materialsSubtotal: 0, laborCost: 0 };

    const laborCost = calculateLaborCost(services, employees);
    const totalMinutes = calculateTotalMinutes(services);
    const totalHours = totalMinutes / 60;

    const allMaterials = services.flatMap(service => service.materials || []).filter(material => 
        !material.description.toLowerCase().includes('traball') && material.description.trim() !== ''
    );

    const materialsSubtotal = allMaterials.reduce((acc, material) => acc + (material.quantity * material.unitPrice), 0);
    
    const subtotal = materialsSubtotal + laborCost;
    const iva = applyIva ? subtotal * IVA_RATE : 0;
    const totalGeneral = subtotal + iva;
    
    return {
        subtotal,
        iva,
        totalGeneral,
        totalHours,
        materialsSubtotal,
        laborCost,
    };
}
