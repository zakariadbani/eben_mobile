/**
 * User — identity table interfaces.
 *
 * Both Client and Ferrailleur (Prestataire) share the same `users` table.
 * Role-specific fields are typed as optional/nullable for non-applicable roles.
 *
 * Role modeling: `role` is the fast-path inline enum (read by RoleMiddleware).
 * Granular permissions live in Spatie tables (server-side only, not in mobile types).
 */

export type UserRole =
  | 'client'
  | 'ferrailleur'
  | 'ambassadeur_acheteur'
  | 'ambassadeur_controleur'
  | 'responsable'
  | 'admin'
  | 'superadmin';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type FerrailleurStatus = 'standard' | 'certified' | 'flagged';

/** Core user record returned by the API. Password is never sent to the mobile app. */
export interface User {
  id: number;
  /** Canonical full name stored in the DB. See assumption A-1 (first_name/last_name split). */
  name: string;
  /** App-layer split — may be null until A-1 is confirmed. */
  firstName: string | null;
  /** App-layer split — may be null until A-1 is confirmed. */
  lastName: string | null;
  email: string | null;
  phone: string;           // Moroccan format ^(\+212|0)6[0-9]{8}$
  phoneVerifiedAt: string | null;
  role: UserRole;
  avatar: string | null;
  status: UserStatus;
  /** 1.00–5.00; null for non-ferrailleur roles. */
  ferrailleurRating: number | null;
  ferrailleurStatus: FerrailleurStatus | null;
  /** Array of car_brand IDs this ferrailleur handles; null for non-ferrailleur. */
  specializations: number[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Backend auth user returned by /api/v1/auth endpoints. */
export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  role: 'client' | 'ferrailleur';
  avatar: string | null;
  status: 'active' | 'inactive' | 'suspended';
  token: string;
}

/** Client-specific profile view (role === 'client'). */
export type ClientProfile = Pick<
  User,
  | 'id'
  | 'name'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'avatar'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
>;

/** Ferrailleur/Prestataire-specific profile view (role === 'ferrailleur'). */
export type PrestataireProfile = Pick<
  User,
  | 'id'
  | 'name'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'avatar'
  | 'status'
  | 'ferrailleurRating'
  | 'ferrailleurStatus'
  | 'specializations'
  | 'createdAt'
  | 'updatedAt'
>;
