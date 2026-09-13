/**
 * PrestataireCompany — legal/company information for a ferrailleur.
 *
 * Maps to `ferrailleur_companies` (or equivalent) table.
 * ICE = Identifiant Commun de l'Entreprise (15 digits, Moroccan).
 * RC  = Registre de Commerce.
 * IF  = Identifiant Fiscal (tax registration number).
 */

export type CompanyStatus = 'active' | 'pending_review' | 'suspended';
export type CompanyBrandGroupKey = 'mecanique' | 'carrosserie';

export interface CompanyBrand {
  id: number;
  name: string;
  nameAr: string;
  logo: string | null;
  relatedParts: import('./Category').CategoryFamily[];
}

export interface CompanyBrandGroup {
  group: CompanyBrandGroupKey;
  brands: CompanyBrand[];
}

export interface PrestataireCompany {
  id: number;
  userId: number;
  /** Legal trade name (raison sociale). */
  legalName: string;
  legalForm: string | null;
  /** ICE — Identifiant Commun de l'Entreprise (15-digit string). */
  ice: string | null;
  /** RC — Registre de Commerce number. */
  rc: string | null;
  /** IF — Identifiant Fiscal (tax id). */
  taxId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  region: string | null;
  country: string;
  /** Primary contact phone for B2B (may differ from user phone). */
  phone: string | null;
  /** Primary contact email for B2B. */
  email: string | null;
  /** Array of car_brand IDs this company specialises in. */
  specializations: number[];
  bank: {
    ibanMasked: string | null;
    holder: string | null;
    bankName: string | null;
  };
  brandGroups: CompanyBrandGroup[];
  /** EBEN account status for this company. */
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
}
