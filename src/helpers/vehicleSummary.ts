import type { VehicleSummary } from '@/interfaces/Vehicle';

/** Figma-compatible vehicle identity, using only the server-resolved summary. */
export function vehicleSummaryLabel(vehicle: VehicleSummary | null | undefined): string | null {
  if (!vehicle) return null;
  const label = [vehicle.brandName, vehicle.modelName, vehicle.motorisation, vehicle.year]
    .filter((value) => value !== null && value !== undefined && String(value).trim().length > 0)
    .join(' ')
    .trim();
  return label.length > 0 ? label : null;
}
