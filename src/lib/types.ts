
export interface ExtraCostItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Article {
  id: string;
  description: string;
  unitPrice: number;
  updatedAt: string;
}

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
  projectId?: string;
  pendingTasks: string;
  serviceHourlyRate?: number;
  extraCosts?: number; // Mantingut per compatibilitat llegat
  additionalCosts?: ExtraCostItem[]; // Nou camp estructurat
  media: { type: 'image' | 'video'; dataUrl: string }[];
  albarans: string[];
  materials?: {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string;
  }[];
  updatedAt?: string;
  createdAt?: string; 
  albaranNumber?: number;
  status?: 'pendent' | 'facturat';
  customerSignatureName?: string;
  customerSignatureDataUrl?: string;
  isLunchSubtracted?: boolean;
  deleted?: boolean;
  deletedAt?: string;
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
  hourlyRate: number;
}

export interface Customer {
  id: string;
  name: string;
  street?: string;
  city?: string;
  postalCode?: string;
  contact?: string;
  email?: string;
  nrt?: string;
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
  projectId?: string;
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
    employeeId?: string;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        imageDataUrl?: string;
        discount?: number;
        category?: string;
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
    albaranId?: string;
    albaranNumber?: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: number;
    createdAt: string;
    customerId: string;
    customerName: string;
    projectName: string;
    employeeId?: string;
    items: InvoiceItem[];
    labor: {
        description: string;
        cost: number;
    };
    totalAmount: number;
    sourceId?: string;
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
  employeeId?: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string;
  createdAt: string;
}
