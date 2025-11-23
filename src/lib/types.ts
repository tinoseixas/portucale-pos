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
  pendingTasks: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  media: { type: 'image' | 'video'; dataUrl: string }[];
  albarans: string[];
  materials?: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  updatedAt?: string;
  createdAt?: string; 
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
}

export interface Customer {
  id: string;
  name: string;
  address?: string;
  contact?: string;
  email?: string;
  nrt?: string; // Tax ID number
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
}
