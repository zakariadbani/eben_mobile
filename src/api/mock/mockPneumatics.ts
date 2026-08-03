import type { Pneumatic } from '@/interfaces/Pneumatic';

export const mockPneumatics: Pneumatic[] = [
  { id: 1, brand: 'Michelin', model: 'Primacy 4', width: 205, aspectRatio: 55, diameter: 16, loadIndex: 91, speedRating: 'V', season: 'summer', vehicleType: 'auto', price: 980, stockQuantity: 8, image: null, status: true },
  { id: 2, brand: 'Continental', model: 'AllSeasonContact', width: 215, aspectRatio: 60, diameter: 16, loadIndex: 95, speedRating: 'H', season: 'all_season', vehicleType: 'auto', price: 1050, stockQuantity: 4, image: null, status: true },
  { id: 3, brand: 'Goodyear', model: 'Vector 4Seasons', width: 225, aspectRatio: 65, diameter: 17, loadIndex: 102, speedRating: 'T', season: 'all_season', vehicleType: '4x4', price: 1190, stockQuantity: 3, image: null, status: true },
];
