import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Address } from '@/interfaces/Address';
import { getAllPages } from './paginate';

function requireAddressId(id: number): void {
  if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('address id must be a positive integer');
}

/** All saved addresses for the current user. */
export async function getAddresses(): Promise<Paginated<Address>> {
  return getAllPages<Address>('/addresses');
}

/** Single address by id. */
export async function getAddress(id: number): Promise<ApiResponse<Address>> {
  requireAddressId(id);
  return apiClient.get<Address>(`/addresses/${id}`) as Promise<ApiResponse<Address>>;
}

/** Payload for creating a new address. */
export interface AddAddressPayload {
  label?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode?: string | null;
  region?: string | null;
  country?: string;
}

/** Payload for updating an existing address. */
export type UpdateAddressPayload = Partial<AddAddressPayload>;

/** Add a new address for the current user. */
export async function addAddress(payload: AddAddressPayload): Promise<ApiResponse<Address>> {
  if (!payload.addressLine1.trim() || !payload.city.trim()) {
    throw new TypeError('addressLine1 and city are required');
  }
  return apiClient.post<Address>('/addresses', payload) as Promise<ApiResponse<Address>>;
}

/** Update an existing address. */
export async function updateAddress(
  id: number,
  payload: UpdateAddressPayload,
): Promise<ApiResponse<Address>> {
  requireAddressId(id);
  return apiClient.put<Address>(`/addresses/${id}`, payload) as Promise<ApiResponse<Address>>;
}

/** Soft-delete an address. */
export async function deleteAddress(id: number): Promise<ApiResponse<{ deleted: boolean }>> {
  requireAddressId(id);
  return apiClient.del<{ deleted: boolean }>(`/addresses/${id}`) as Promise<ApiResponse<{ deleted: boolean }>>;
}

/** Set an address as the user's default. */
export async function setDefaultAddress(id: number): Promise<ApiResponse<Address>> {
  requireAddressId(id);
  return apiClient.post<Address>(`/addresses/${id}/default`, {}) as Promise<ApiResponse<Address>>;
}
