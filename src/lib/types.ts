
export interface ServiceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  customerId?: string;
  customerName?: string;
  arrivalDateTime: string;
  departureDateTime: string;
  description: string;
  projectName: string;
  projectId?: string; // ID of the linked project
  pendingTasks: string;
  serviceHourlyRate?: number; // Specific rate for this service
  media: { type: 'image' | 'video'; dataUrl: string }[];
  albarans: string[];
  materials?: {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string; // New field for material image
  }[];
  updatedAt?: string;
  createdAt?: string; 
  albaranNumber?: number; // Unique albaran number assigned to this record
  status?: 'pendent' | 'facturat'; // Invoicing status
  customerSignatureName?: string; // Name of the person who signed
  customerSignatureDataUrl?: string; // Base64 signature image
  isLunchSubtracted?: boolean; // Whether to subtract the 13h-14h break (default true)
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  avatar?: string;
  email?: string;
  phoneNumber?: string;
  role?: 'admin' | 'user';
  hourlyRate: number; // Default hourly rate
}

export interface Customer {
  id: string;
  name: string;
  address?: string;
  contact?: string;
  email?: string;
  nrt?: string; // Tax ID number
}

export interface Project {
  id: string;
  name: string;
  customerId: string;
  customerName?: string;
  status: 'active' | 'finished';
  createdAt: string;
}

export interface Albaran {
  id: string;
  albaranNumber: number;
  createdAt: string;
  customerId: string;
  customerName: string;
  projectName: string;
  serviceRecordIds: string[];
  totalAmount: number;
  status: 'pendent' | 'facturat' | 'arxivat';
  updatedAt?: string;
  employeeId?: string;
  employeeName?: string;
}

export interface Quote {
    id: string;
    quoteNumber: number;
    createdAt: string;
    customerId: string;
    customerName: string;
    projectName: string;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        imageDataUrl?: string;
        discount?: number; // Discount in percentage
        category?: string; // Optional category for grouping
    }[];
    labor: {
        description: string;
        cost: number;
    };
    totalAmount: number;
    notes?: string;
}

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string;
    discount?: number;
    albaranId?: string; // To trace back to the source albaran
    albaranNumber?: number; // For display purposes
}

export interface Invoice {
    id: string;
    invoiceNumber: number;
    createdAt: string;
    customerId: string;
    customerName: string;
    projectName: string;
    items: InvoiceItem[];
    labor: {
        description: string;
        cost: number;
    };
    totalAmount: number;
    sourceId?: string; // ID of the albaran or quote it was created from
    sourceType?: 'albaran' | 'quote';
    status: 'pendent' | 'pagada' | 'parcialment pagada';
    paymentDate?: string;
    applyIva?: boolean;
    notes?: string;
}

export interface Receipt {
  id: string;
  receiptNumber: number;
  invoiceId: string;
  invoiceNumber: number;
  customerId: string;
  customerName: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string;
  createdAt: string;
}
