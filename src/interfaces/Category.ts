/**
 * CategoryProps — legacy interface kept for backward compat.
 * Screens that imported `CategoryProps` from "@/interfaces/Category" continue to work.
 * New code should use `Category` (camelCase convention).
 */
export interface CategoryProps {
  id: number;
  title: string;
  title_ar: string;
  image?: ReturnType<typeof require> | string;
}

/**
 * Category — 3-level self-referencing taxonomy (CONFIRMED A-5/A-18).
 *
 * Hierarchy:
 *   level 1 — main category (e.g. "Freins")
 *   level 2 — secondary category (e.g. "Freins avant")
 *   level 3 — leaf/final category (e.g. "Flexible de frein") — targeted by request_items
 *
 * Bilingual: `title` (French, primary) + `titleAr` (Arabic, in-row — A-16).
 * `parentId` is null for level-1 roots.
 * `children` is populated client-side when building a tree; never sent in flat list responses.
 *
 * NOTE: condition (occasion / en_stock) does NOT live here — it is on RequestItem (A-6).
 */
export interface Category {
  id: number;
  parentId: number | null;
  level: 1 | 2 | 3;
  title: string;      // French — maps to DB `name`
  titleAr: string;    // Arabic — maps to DB `name_ar`
  slug: string;
  icon?: string | null;
  image?: ReturnType<typeof require> | string | null;
  description?: string | null;
  sortOrder: number;
  status: boolean;
  createdAt: string;  // ISO-8601
  updatedAt: string;
  children?: Category[];
}

/** Alias so legacy callers using CategoryProps stay valid while new code uses Category. */
// CategoryProps is intentionally kept as a separate, narrower type because screens
// that display categories only need id/title/title_ar/image.

/**
 * PartBrand — a part-brand entity linked per leaf (level-3) category (D1).
 * Distinct from CarBrand (vehicle brands, `GET /brands`) — never a category
 * level itself.
 */
export interface PartBrand {
  id: number;
  name: string;
  nameAr: string;
  logo: string | null;
  status: boolean;
  sortOrder: number;
}

/** Server-resolved level-1 ancestor used to group marketplace lines. */
export interface CategoryFamily {
  id: number;
  title: string;
  titleAr: string;
}
