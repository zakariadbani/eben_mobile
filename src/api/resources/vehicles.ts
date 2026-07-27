import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { CarBrand, CarMotorization, CarYear, Vehicle } from '@/interfaces/Vehicle';

/** All car brands (with optional models eager-loaded). */
export async function getBrands(): Promise<Paginated<CarBrand>> {
  return apiClient.get<CarBrand>('/brands') as Promise<Paginated<CarBrand>>;
}

/** Global flat list of motorizations. CONFIRMED A-3: modelId always null. */
export async function getMotorizations(): Promise<Paginated<CarMotorization>> {
  return apiClient.get<CarMotorization>('/motorizations') as Promise<Paginated<CarMotorization>>;
}

/** Year list used by the year-picker UI. */
export async function getCarYears(): Promise<ApiResponse<CarYear[]>> {
  return apiClient.get<CarYear[]>('/years') as Promise<ApiResponse<CarYear[]>>;
}

/** Current user's garage (all registered vehicles). */
export async function getVehicles(): Promise<Paginated<Vehicle>> {
  return apiClient.get<Vehicle>('/vehicles') as Promise<Paginated<Vehicle>>;
}

/** Single vehicle by id. */
export async function getVehicle(id: number): Promise<ApiResponse<Vehicle>> {
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
  return apiClient.del<{ deleted: boolean }>(`/vehicles/${id}`) as Promise<ApiResponse<{ deleted: boolean }>>;
}
