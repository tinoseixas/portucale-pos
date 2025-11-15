export interface ServiceRecord {
  id: string;
  employeeId: string;
  arrivalDateTime: string;
  departureDateTime: string;
  description: string;
  pendingTasks: string;
  media: { type: 'image' | 'video'; dataUrl: string }[];
  albarans: string[];
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  avatar?: string;
  email?: string;
  role?: 'admin' | 'user';
}

export interface Photo {
  id: string;
  serviceRecordId: string;
  url: string;
  description: string;
}
