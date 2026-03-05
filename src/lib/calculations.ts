import type { ServiceRecord, Employee } from '@/lib/types';
import { parseISO, isValid, differenceInMinutes } from 'date-fns';

const ADMIN_EMAIL = 'tinoseixas@gmail.com';
const ADMIN_HOURLY_RATE = 30; 
const USER_HOURLY_RATE = 27; 
export const IVA_RATE = 0.045; // 4.5% IGI for Andorra

export function calculateLaborCost(services: ServiceRecord[], employees: Employee[]): number {
    if (!services || !employees) return 0;
    return services.reduce((total, service) => {
        const employee = employees.find(e => e.id === service.employeeId);
        
        // Priority:
        // 1. Service-specific rate
        // 2. Employee's default rate
        // 3. Fallback hardcoded values
        const hourlyRate = service.serviceHourlyRate ?? 
                          employee?.hourlyRate ?? 
                          (employee?.email === ADMIN_EMAIL ? ADMIN_HOURLY_RATE : USER_HOURLY_RATE);
        
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
    const safeServices = services || [];
    const safeEmployees = employees || [];

    const laborCost = calculateLaborCost(safeServices, safeEmployees);
    const totalMinutes = calculateTotalMinutes(safeServices);
    const totalHours = totalMinutes / 60;

    const allMaterials = safeServices.flatMap(service => service.materials || []).filter(material => 
        material && material.description && !material.description.toLowerCase().includes('traball') && material.description.trim() !== ''
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
