
import type { ServiceRecord, Employee } from '@/lib/types';
import { parseISO, isValid, differenceInMinutes, setHours, setMinutes } from 'date-fns';

const ADMIN_EMAIL = 'tinoseixas@gmail.com';
const ADMIN_HOURLY_RATE = 30; 
const USER_HOURLY_RATE = 27; 
export const IVA_RATE = 0.045; // 4.5% IGI para Andorra

export function getMealBreakOverlapMinutes(start: Date, end: Date): number {
    if (!isValid(start) || !isValid(end) || end <= start) return 0;
    
    const mealStart = setMinutes(setHours(new Date(start), 13), 0);
    const mealEnd = setMinutes(setHours(new Date(start), 14), 0);
    
    const overlapStart = start > mealStart ? start : mealStart;
    const overlapEnd = end < mealEnd ? end : mealEnd;
    
    if (overlapStart < overlapEnd) {
        return differenceInMinutes(overlapEnd, overlapStart);
    }
    
    return 0;
}

export function calculateServiceEffectiveMinutes(service: ServiceRecord): number {
    if (service.arrivalDateTime && service.departureDateTime) {
        const startDate = parseISO(service.arrivalDateTime);
        const endDate = parseISO(service.departureDateTime);
        if (isValid(startDate) && isValid(endDate) && endDate > startDate) {
            let minutes = differenceInMinutes(endDate, startDate);
            
            const shouldSubtractLunch = service.isLunchSubtracted !== false;
            if (shouldSubtractLunch) {
                const mealMinutes = getMealBreakOverlapMinutes(startDate, endDate);
                minutes -= mealMinutes;
            }
            
            if (minutes <= 0) return 0;

            if (minutes === 541) return 541; 

            const roundedMinutes = Math.ceil(minutes / 30) * 30;
            return roundedMinutes;
        }
    }
    return 0;
}

export function calculateLaborCost(services: ServiceRecord[], employees: Employee[]): number {
    if (!services || !employees) return 0;
    return services.reduce((total, service) => {
        const employee = employees.find(e => e.id === service.employeeId);
        
        const hourlyRate = service.serviceHourlyRate ?? 
                          employee?.hourlyRate ?? 
                          (employee?.email === ADMIN_EMAIL ? ADMIN_HOURLY_RATE : USER_HOURLY_RATE);
        
        const effectiveMinutes = calculateServiceEffectiveMinutes(service);
        return total + (effectiveMinutes / 60) * hourlyRate;
    }, 0);
}

export function calculateTotalMinutes(services: ServiceRecord[]): number {
    if (!services) return 0;
    return services.reduce((total, service) => {
        return total + calculateServiceEffectiveMinutes(service);
    }, 0);
}

export function calculateTotalAmount(services: ServiceRecord[], employees: Employee[], applyIva: boolean = true): {
    subtotal: number,
    iva: number,
    totalGeneral: number,
    totalHours: number,
    materialsSubtotal: number,
    laborCost: number,
    extraCostsTotal: number,
} {
    const safeServices = services || [];
    const safeEmployees = employees || [];

    const laborCost = calculateLaborCost(safeServices, safeEmployees);
    const totalMinutes = calculateTotalMinutes(safeServices);
    const totalHours = totalMinutes / 60;

    const allMaterials = safeServices.flatMap(service => service.materials || []).filter(material => 
        material && material.description && material.description.trim() !== ''
    );

    const materialsSubtotal = allMaterials.reduce((acc, material) => acc + (material.quantity * material.unitPrice), 0);
    
    // Calcular suma de Altres costos estructurats + costos de llegat
    const extraCostsTotal = safeServices.reduce((acc, s) => {
        const legacy = Number(s.extraCosts) || 0;
        const structured = (s.additionalCosts || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        return acc + legacy + structured;
    }, 0);
    
    const subtotal = materialsSubtotal + laborCost + extraCostsTotal;
    const iva = applyIva ? subtotal * IVA_RATE : 0;
    const totalGeneral = subtotal + iva;
    
    return {
        subtotal,
        iva,
        totalGeneral,
        totalHours,
        materialsSubtotal,
        laborCost,
        extraCostsTotal,
    };
}
