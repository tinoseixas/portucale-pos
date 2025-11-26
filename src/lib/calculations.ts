import type { ServiceRecord, Employee } from '@/lib/types';
import { parseISO, isValid, differenceInMinutes } from 'date-fns';

const ADMIN_EMAIL = 'tinoseixas@gmail.com';
const ADMIN_HOURLY_RATE = 30;
const USER_HOURLY_RATE = 27;
const IVA_RATE = 0.045; // 4.5% IGI for Andorra

function calculateLaborCost(services: ServiceRecord[], employees: Employee[]): number {
    if (!services || !employees) return 0;
    return services.reduce((total, service) => {
        const employee = employees.find(e => e.id === service.employeeId);
        const hourlyRate = employee?.email === ADMIN_EMAIL ? ADMIN_HOURLY_RATE : USER_HOURLY_RATE;
        
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

export function calculateTotalAmount(services: ServiceRecord[], employees: Employee[]): number {
    if (!services || !employees) return 0;

    const laborCost = calculateLaborCost(services, employees);

    const allMaterials = services.flatMap(service => service.materials || []).filter(material => 
        !material.description.toLowerCase().includes('traball') && material.description.trim() !== ''
    );

    const materialsSubtotal = allMaterials.reduce((acc, material) => acc + (material.quantity * material.unitPrice), 0);
    
    const subtotal = materialsSubtotal + laborCost;
    const iva = subtotal * IVA_RATE;
    const totalGeneral = subtotal + iva;
    
    return totalGeneral;
}
