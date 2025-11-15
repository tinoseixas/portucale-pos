import type { Service, Employee } from './types';
import { PlaceHolderImages } from './placeholder-images';

const plumbingImage = PlaceHolderImages.find(img => img.imageHint.includes('plumbing'))?.imageUrl ?? "https://picsum.photos/seed/103/400/300";
const constructionImage = PlaceHolderImages.find(img => img.imageHint.includes('construction'))?.imageUrl ?? "https://picsum.photos/seed/101/400/300";
const officeImage = PlaceHolderImages.find(img => img.imageHint.includes('office'))?.imageUrl ?? "https://picsum.photos/seed/102/400/300";
const electricalImage = PlaceHolderImages.find(img => img.imageHint.includes('electrical'))?.imageUrl ?? "https://picsum.photos/seed/105/400/300";
const userAvatar = PlaceHolderImages.find(img => img.id === 'user_avatar')?.imageUrl ?? "https://picsum.photos/seed/user1/100/100";


export const mockEmployee: Employee = {
  id: 'emp001',
  name: 'Joan Petit',
  avatar: userAvatar
};

export const mockServices: Service[] = [
  {
    id: 'ser001',
    startTime: '08:15',
    endTime: '11:30',
    description: 'Instal·lació de canonades a la cuina principal. Substitució de la clau de pas general.',
    photos: [plumbingImage, constructionImage],
    employeeId: 'emp001',
  },
  {
    id: 'ser002',
    startTime: '12:30',
    endTime: '15:00',
    description: 'Neteja general de les oficines del segon pis. Buidatge de papereres i neteja de superfícies.',
    photos: [officeImage],
    employeeId: 'emp001',
  },
  {
    id: 'ser003',
    startTime: '15:15',
    endTime: '17:00',
    description: 'Revisió del quadre elèctric i substitució de dos interruptors defectuosos.',
    photos: [electricalImage],
    employeeId: 'emp001',
  },
];
