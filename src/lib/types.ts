export interface Service {
  id: string;
  startTime: string;
  endTime: string;
  description: string;
  photos: string[]; // URLs to images
  employeeId: string;
}

export interface Employee {
  id: string;
  name: string;
  avatar: string;
}
