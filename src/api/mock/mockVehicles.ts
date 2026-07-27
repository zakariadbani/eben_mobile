/**
 * Mock vehicle catalog — brands, models, motorizations, and user vehicles.
 */

import type { CarBrand, CarModel, CarMotorization, CarYear, Vehicle } from '@/interfaces/Vehicle';

export const mockCarBrands: CarBrand[] = [
  { id: 1, name: 'Toyota', nameAr: 'تويوتا', logo: null, status: true, sortOrder: 1 },
  { id: 2, name: 'Honda', nameAr: 'هوندا', logo: null, status: true, sortOrder: 2 },
  { id: 3, name: 'Ford', nameAr: 'فورد', logo: null, status: true, sortOrder: 3 },
  { id: 4, name: 'Chevrolet', nameAr: 'شيفروليه', logo: null, status: true, sortOrder: 4 },
  { id: 5, name: 'Nissan', nameAr: 'نيسان', logo: null, status: true, sortOrder: 5 },
  { id: 6, name: 'BMW', nameAr: 'بي إم دبليو', logo: null, status: true, sortOrder: 6 },
  { id: 7, name: 'Audi', nameAr: 'أودي', logo: null, status: true, sortOrder: 7 },
  { id: 8, name: 'Mercedes-Benz', nameAr: 'مرسيدس بنز', logo: null, status: true, sortOrder: 8 },
  { id: 9, name: 'Hyundai', nameAr: 'هيونداي', logo: null, status: true, sortOrder: 9 },
  { id: 10, name: 'Kia', nameAr: 'كيا', logo: null, status: true, sortOrder: 10 },
];

export const mockCarModels: CarModel[] = [
  { id: 1, brandId: 1, name: 'Camry', nameAr: 'كامري', yearFrom: 2000, yearTo: null, status: true, sortOrder: 1 },
  { id: 2, brandId: 1, name: 'Corolla', nameAr: 'كورولا', yearFrom: 2000, yearTo: null, status: true, sortOrder: 2 },
  { id: 3, brandId: 1, name: 'RAV4', nameAr: 'راف 4', yearFrom: 2000, yearTo: null, status: true, sortOrder: 3 },
  { id: 4, brandId: 2, name: 'Civic', nameAr: 'سيفيك', yearFrom: 2000, yearTo: null, status: true, sortOrder: 1 },
  { id: 5, brandId: 2, name: 'Accord', nameAr: 'أكورد', yearFrom: 2000, yearTo: null, status: true, sortOrder: 2 },
  { id: 6, brandId: 3, name: 'F-150', nameAr: 'إف-150', yearFrom: 2000, yearTo: null, status: true, sortOrder: 1 },
  { id: 7, brandId: 3, name: 'Mustang', nameAr: 'موستانغ', yearFrom: 2000, yearTo: null, status: true, sortOrder: 2 },
  { id: 8, brandId: 6, name: '3 Series', nameAr: 'الفئة الثالثة', yearFrom: 2000, yearTo: null, status: true, sortOrder: 1 },
  { id: 9, brandId: 6, name: '5 Series', nameAr: 'الفئة الخامسة', yearFrom: 2000, yearTo: null, status: true, sortOrder: 2 },
  { id: 10, brandId: 6, name: 'X5', nameAr: 'إكس 5', yearFrom: 2000, yearTo: null, status: true, sortOrder: 3 },
];

/** CONFIRMED A-3: global flat list — modelId always null. */
export const mockCarMotorizations: CarMotorization[] = [
  { id: 1, modelId: null, name: 'I4', fuelType: 'essence', engineCode: null, status: true },
  { id: 2, modelId: null, name: 'I6', fuelType: 'essence', engineCode: null, status: true },
  { id: 3, modelId: null, name: 'V6', fuelType: 'essence', engineCode: null, status: true },
  { id: 4, modelId: null, name: 'V8', fuelType: 'essence', engineCode: null, status: true },
  { id: 5, modelId: null, name: 'V10', fuelType: 'essence', engineCode: null, status: true },
  { id: 6, modelId: null, name: 'V12', fuelType: 'essence', engineCode: null, status: true },
  { id: 7, modelId: null, name: 'W12', fuelType: 'essence', engineCode: null, status: true },
  { id: 8, modelId: null, name: 'Electric', fuelType: 'electric', engineCode: null, status: true },
  { id: 9, modelId: null, name: 'Hybrid', fuelType: 'hybrid', engineCode: null, status: true },
];

export const mockCarYears: CarYear[] = Array.from({ length: 25 }, (_, i) => {
  const year = 2000 + i;
  return { id: year, title: String(year) };
});

/** User's garage — 4 vehicles matching ws.ts `dataCars` shape. */
export const mockVehicles: Vehicle[] = [
  {
    id: 1,
    userId: 1,
    brandId: 1,
    modelId: 1,
    motorizationId: 1,
    year: 2021,
    vin: null,
    licensePlate: null,
    nickname: null,
    imageUrl: 'https://picsum.photos/id/514/1000/1500',
    isDefault: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    brandName: 'Toyota',
    modelName: 'Camry',
    motorizationName: 'I4',
  },
  {
    id: 2,
    userId: 1,
    brandId: 3,
    modelId: 7,
    motorizationId: 4,
    year: 2018,
    vin: null,
    licensePlate: null,
    nickname: null,
    imageUrl: 'https://picsum.photos/id/133/1000/1500',
    isDefault: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    brandName: 'Ford',
    modelName: 'Mustang',
    motorizationName: 'V8',
  },
  {
    id: 3,
    userId: 1,
    brandId: 6,
    modelId: 8,
    motorizationId: 2,
    year: 2022,
    vin: null,
    licensePlate: null,
    nickname: null,
    imageUrl: 'https://picsum.photos/id/1071/1000/1500',
    isDefault: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    brandName: 'BMW',
    modelName: '3 Series',
    motorizationName: 'I6',
  },
  {
    id: 4,
    userId: 1,
    brandId: 1,
    modelId: 1,
    motorizationId: 8,
    year: 2023,
    vin: null,
    licensePlate: null,
    nickname: 'Tesla Mock',
    imageUrl: 'https://picsum.photos/id/111/1000/1500',
    isDefault: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    brandName: 'Toyota',
    modelName: 'Camry',
    motorizationName: 'Electric',
  },
];
