export type PneumaticSeason = 'summer' | 'winter' | 'all_season';
export type PneumaticVehicleType = 'auto' | '4x4';

export interface Pneumatic {
  id: number;
  brand: string;
  model: string;
  width: number;
  aspectRatio: number;
  diameter: number;
  loadIndex: number | null;
  speedRating: string | null;
  season: PneumaticSeason;
  vehicleType: PneumaticVehicleType;
  price: number;
  stockQuantity: number;
  image: string | null;
  status: boolean;
}
