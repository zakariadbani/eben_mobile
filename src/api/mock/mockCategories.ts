/**
 * Mock category data — 3-level self-referencing tree (CONFIRMED A-5/A-18).
 *
 * Level 1: main categories (Freins, Mécanique, Carrosserie, Moteur, Roue, Guidon, Pneumatiques)
 * Level 2: sub-groups
 * Level 3: leaf parts — these are the IDs referenced by request_items
 *
 * Bilingual: title (French) + titleAr (Arabic). CONFIRMED A-16.
 */

import type { Category, PartBrand } from '@/interfaces/Category';

export const mockCategories: Category[] = [
  // ── Level 1 — Main categories ──────────────────────────────────────────────
  {
    id: 1,
    parentId: null,
    level: 1,
    title: 'Freins',
    titleAr: 'المكابح',
    slug: 'freins',
    image: require('@/assets/img/freins.png'),
    sortOrder: 1,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    parentId: null,
    level: 1,
    title: 'Mécanique',
    titleAr: 'الميكانيكا',
    slug: 'mecanique',
    image: require('@/assets/img/moteur.png'),
    sortOrder: 2,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    parentId: null,
    level: 1,
    title: 'Carrosserie',
    titleAr: 'هيكل السيارة',
    slug: 'carrosserie',
    image: require('@/assets/img/carrosserie.png'),
    sortOrder: 3,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 6,
    parentId: null,
    level: 1,
    title: 'Moteur',
    titleAr: 'المحرك',
    slug: 'moteur',
    image: require('@/assets/img/moteur.png'),
    sortOrder: 4,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 7,
    parentId: null,
    level: 1,
    title: 'Roue',
    titleAr: 'العجلة',
    slug: 'roue',
    image: require('@/assets/img/roue.png'),
    sortOrder: 5,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    parentId: null,
    level: 1,
    title: 'Suspension',
    titleAr: 'التعليق',
    slug: 'suspension',
    image: require('@/assets/img/item1.png'),
    sortOrder: 6,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 5,
    parentId: null,
    level: 1,
    title: 'Refroidissement',
    titleAr: 'نظام التبريد',
    slug: 'refroidissement',
    image: require('@/assets/img/item2.png'),
    sortOrder: 7,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // ── Level 2 — Sub-groups ────────────────────────────────────────────────────
  {
    id: 10,
    parentId: 1,  // Freins
    level: 2,
    title: 'Freins avant',
    titleAr: 'مكابح أمامية',
    slug: 'freins-avant',
    sortOrder: 1,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 11,
    parentId: 1,  // Freins
    level: 2,
    title: 'Freins arrière',
    titleAr: 'مكابح خلفية',
    slug: 'freins-arriere',
    sortOrder: 2,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 12,
    parentId: 2,  // Mécanique
    level: 2,
    title: 'Distribution',
    titleAr: 'التوزيع',
    slug: 'distribution',
    sortOrder: 1,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 13,
    parentId: 3,  // Carrosserie
    level: 2,
    title: 'Pare-chocs',
    titleAr: 'المصدات',
    slug: 'pare-chocs',
    sortOrder: 1,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // ── Level 3 — Leaf parts (referenced by request_items) ─────────────────────
  {
    id: 100,
    parentId: 10, // Freins avant
    level: 3,
    title: 'Plaquettes de frein avant',
    titleAr: 'بطانات الفرامل الأمامية',
    slug: 'plaquettes-frein-avant',
    image: require('@/assets/img/freins.png'),
    sortOrder: 1,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 101,
    parentId: 10, // Freins avant
    level: 3,
    title: 'Flexible de frein avant',
    titleAr: 'خرطوم الفرامل الأمامي',
    slug: 'flexible-frein-avant',
    image: require('@/assets/img/freins.png'),
    sortOrder: 2,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 102,
    parentId: 11, // Freins arrière
    level: 3,
    title: 'Disque de frein arrière',
    titleAr: 'قرص الفرامل الخلفي',
    slug: 'disque-frein-arriere',
    image: require('@/assets/img/freins.png'),
    sortOrder: 1,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 103,
    parentId: 12, // Distribution
    level: 3,
    title: 'Kit de distribution',
    titleAr: 'طقم التوزيع',
    slug: 'kit-distribution',
    sortOrder: 1,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 104,
    parentId: 13, // Pare-chocs
    level: 3,
    title: 'Pare-chocs avant',
    titleAr: 'المصد الأمامي',
    slug: 'pare-chocs-avant',
    image: require('@/assets/img/carrosserie.png'),
    sortOrder: 1,
    status: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

/** Flat list of level-1 categories only (for home/categories screens). */
export const mockCategoriesLevel1: Category[] = mockCategories.filter(
  (c) => c.level === 1,
);

/** Build a category tree from the flat list. */
export function buildCategoryTree(flat: Category[]): Category[] {
  const map = new Map<number, Category>();
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: Category[] = [];
  map.forEach((c) => {
    if (c.parentId === null) {
      roots.push(c);
    } else {
      const parent = map.get(c.parentId);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(c);
      }
    }
  });
  return roots;
}

/** Mock part-brand catalog (D1) — RIDEX/Brembo/Bosch/TRW/Valeo active, Gates retired. */
export const mockPartBrands: PartBrand[] = [
  { id: 1, name: 'RIDEX', nameAr: 'ريدكس', logo: null, status: true, sortOrder: 1 },
  { id: 2, name: 'Brembo', nameAr: 'بريمبو', logo: null, status: true, sortOrder: 2 },
  { id: 3, name: 'Bosch', nameAr: 'بوش', logo: null, status: true, sortOrder: 3 },
  { id: 4, name: 'TRW', nameAr: 'تي آر دبليو', logo: null, status: true, sortOrder: 4 },
  { id: 5, name: 'Valeo', nameAr: 'فاليو', logo: null, status: true, sortOrder: 5 },
  { id: 6, name: 'Gates', nameAr: 'غيتس', logo: null, status: false, sortOrder: 6 },
];

/**
 * Leaf category id -> linked part-brand ids. A leaf absent from this map
 * gets every active brand — mirrors the `/categories/:id/brands` server
 * fallback rule (D1).
 */
const CATEGORY_BRAND_LINKS: Record<number, number[]> = {
  100: [1, 2, 3],
  101: [1, 5],
  102: [2, 3, 4],
};

export function mockBrandsForCategory(categoryId: number): PartBrand[] {
  const active = mockPartBrands.filter((brand) => brand.status);
  const linked = CATEGORY_BRAND_LINKS[categoryId];
  if (!linked) return active;
  return linked
    .map((id) => active.find((brand) => brand.id === id))
    .filter((brand): brand is PartBrand => brand != null);
}
