import { apiClient } from '../client';
import type { Paginated } from '../types';
import type { Pneumatic, PneumaticSeason, PneumaticVehicleType } from '@/interfaces/Pneumatic';
import { getAllPages } from './paginate';

export type PneumaticSort = 'priceAsc' | 'priceDesc' | 'recent';

export interface PneumaticSearchParams {
  width?: number;
  aspectRatio?: number;
  diameter?: number;
  season?: PneumaticSeason;
  vehicleType?: PneumaticVehicleType;
  brand?: string;
  speedRating?: string;
  q?: string;
  sort?: PneumaticSort;
  page?: number;
  perPage?: number;
}

function pneumaticSearchPath(params: PneumaticSearchParams): string {
  const query = new URLSearchParams();
  if (params.width !== undefined) query.set('width', String(params.width));
  if (params.aspectRatio !== undefined) query.set('aspectRatio', String(params.aspectRatio));
  if (params.diameter !== undefined) query.set('diameter', String(params.diameter));
  if (params.season) query.set('season', params.season);
  if (params.vehicleType) query.set('vehicleType', params.vehicleType);
  if (params.brand) query.set('brand', params.brand);
  if (params.speedRating) query.set('speedRating', params.speedRating);
  if (params.q) query.set('q', params.q);
  if (params.sort) query.set('sort', params.sort);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.perPage !== undefined) query.set('perPage', String(params.perPage));
  const suffix = query.toString();

  return `/pneumatics${suffix ? `?${suffix}` : ''}`;
}

export async function searchPneumatics(params: PneumaticSearchParams = {}): Promise<Paginated<Pneumatic>> {
  return apiClient.get<Pneumatic>(pneumaticSearchPath(params)) as Promise<Paginated<Pneumatic>>;
}

export async function searchAllPneumatics(params: PneumaticSearchParams = {}): Promise<Paginated<Pneumatic>> {
  return getAllPages<Pneumatic>(pneumaticSearchPath(params));
}
