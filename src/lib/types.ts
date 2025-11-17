export interface ServiceRecord {
  id: string;
  employeeId: string;
  arrivalDateTime: string;
  departureDateTime: string;
  description: string;
  pendingTasks: string;
  media: { type: 'image' | 'video'; dataUrl: string }[];
  albarans: string[];
  updatedAt?: string;
  createdAt?: string; // Add createdAt for sorting and tracking
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

export interface LocationRecord {
  id: string;
  employeeId: string;
  serviceRecordId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}
