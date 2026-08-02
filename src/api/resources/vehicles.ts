import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { CarBrand, CarModel, CarMotorization, CarYear, Vehicle } from '@/interfaces/Vehicle';
import { getAllPages } from './paginate';
import { assertPositiveId } from './validate';

export const CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY = 'selectedVehicleId';

/** All car brands across every backend pagination page. */
export async function getBrands(): Promise<Paginated<CarBrand>> {
  return getAllPages<CarBrand>('/brands');
}

/** Active models belonging to one brand. */
export async function getBrandModels(brandId: number): Promise<Paginated<CarModel>> {
  assertPositiveId(brandId, 'brandId');
  return getAllPages<CarModel>(`/brands/${brandId}/models`);
}

/** Global flat list of motorizations. CONFIRMED A-3: modelId always null. */
export async function getMotorizations(): Promise<Paginated<CarMotorization>> {
  return getAllPages<CarMotorization>('/motorizations');
}

/** Year list used by the year-picker UI. */
export async function getCarYears(): Promise<ApiResponse<CarYear[]>> {
  return apiClient.get<CarYear[]>('/years') as Promise<ApiResponse<CarYear[]>>;
}

/** Current user's garage (all registered vehicles). */
export async function getVehicles(): Promise<Paginated<Vehicle>> {
  return getAllPages<Vehicle>('/vehicles');
}

/** Single vehicle by id. */
export async function getVehicle(id: number): Promise<ApiResponse<Vehicle>> {
  assertPositiveId(id, 'vehicleId');
  return apiClient.get<Vehicle>(`/vehicles/${id}`) as Promise<ApiResponse<Vehicle>>;
}

/** Payload for adding a new vehicle to the user's garage. */
export interface AddVehiclePayload {
  brandId: number;
  modelId: number;
  year: number;
  motorizationId?: number | null;
  nickname?: string | null;
}

/** Add a new vehicle to the current user's garage. */
export async function addVehicle(payload: AddVehiclePayload): Promise<ApiResponse<Vehicle>> {
  return apiClient.post<Vehicle>('/vehicles', payload) as Promise<ApiResponse<Vehicle>>;
}

/** Remove a vehicle from the current user's garage. */
export async function deleteVehicle(id: number): Promise<ApiResponse<{ deleted: boolean }>> {
  assertPositiveId(id, 'vehicleId');
  return apiClient.del<{ deleted: boolean }>(`/vehicles/${id}`) as Promise<ApiResponse<{ deleted: boolean }>>;
}
