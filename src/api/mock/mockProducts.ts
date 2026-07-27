/**
 * Mock product data — part listings available for direct purchase.
 *
 * Pricing follows the margin rule (stored immutably at creation time):
 *   priceFerrailleur × 1.06 = price  (client price shown to buyer)
 *   priceFerrailleur × 0.94 = priceBc (purchase-order price to ferrailleur)
 *
 * Examples:
 *   priceFerrailleur = 2525.00  →  price = 2676.50,  priceBc = 2373.50
 *   priceFerrailleur =  180.00  →  price =  190.80,  priceBc =  169.20
 *   priceFerrailleur =  850.00  →  price =  901.00,  priceBc =  799.00
 */

import type { Product } from '@/interfaces/Product';
import type { Review } from '@/interfaces/Review';
import type { Basket, BasketItem } from '@/interfaces/Basket';
import type { WishlistItem } from '@/interfaces/Wishlist';
import { categoryImageFor } from './categoryImage';

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const mockProducts: Product[] = [
  // ── en_stock: Plaquettes de frein avant (Brembo, catId 100) ───────────────
  {
    id: 1001,
    title: 'Jeu de plaquettes de frein avant Brembo',
    titleAr: 'طقم بطانات الفرامل الأمامية بريمبو',
    condition: 'en_stock',
    articleNumber: '18548 10001',
    // priceFerrailleur = 2525.00 → price = 2676.50, priceBc = 2373.50
    price: 2676.50,
    priceBc: 2373.50,
    promoPrice: undefined,
    images: [
      'https://picsum.photos/id/514/800/800',
      'https://picsum.photos/id/1071/800/800',
      'https://picsum.photos/id/133/800/800',
    ],
    description:
      'Plaquettes de frein avant haute performance pour véhicules légers. ' +
      'Formule semi-métallique pour une friction optimale et une durée de vie prolongée. ' +
      'Compatibles avec la majorité des modèles courants.',
    descriptionAr:
      'بطانات فرامل أمامية عالية الأداء للمركبات الخفيفة. ' +
      'تركيبة شبه معدنية لاحتكاك مثالي وعمر أطول. ' +
      'متوافقة مع معظم الطرازات الشائعة.',
    categoryId: 100,
    categoryName: 'Plaquettes de frein avant',
    categoryNameAr: 'بطانات الفرامل الأمامية',
    brand: 'Brembo',
    sellerName: 'Auto Parts Maroc',
    sellerId: 10,
    rating: 4.5,
    reviewsCount: 12,
    stock: 8,
    warranty: '6 mois',
    warrantyAr: '6 أشهر',
    createdAt: '2024-09-01T10:00:00Z',
    updatedAt: '2024-09-01T10:00:00Z',
  },

  // ── occasion: Plaquettes de frein avant usagées (catId 100) ───────────────
  {
    id: 1002,
    title: 'Jeu de plaquettes de frein avant — occasion',
    titleAr: 'طقم بطانات الفرامل الأمامية — مستعمل',
    condition: 'occasion',
    articleNumber: '18548 10002',
    // priceFerrailleur = 850.00 → price = 901.00, priceBc = 799.00
    price: 901.00,
    priceBc: 799.00,
    promoPrice: undefined,
    images: [
      'https://picsum.photos/id/655/800/800',
    ],
    description:
      'Plaquettes de frein avant en bon état général. Usure inférieure à 40 %. ' +
      'Idéal pour prolonger la durée de vie à petit budget.',
    descriptionAr:
      'بطانات فرامل أمامية بحالة جيدة. التآكل أقل من 40٪. ' +
      'مثالية لإطالة عمر المركبة بميزانية محدودة.',
    categoryId: 100,
    categoryName: 'Plaquettes de frein avant',
    categoryNameAr: 'بطانات الفرامل الأمامية',
    brand: undefined,
    sellerName: 'Ferrailleur Casablanca',
    sellerId: 11,
    rating: 3.8,
    reviewsCount: 5,
    stock: 2,
    warranty: undefined,
    warrantyAr: undefined,
    createdAt: '2024-09-15T08:00:00Z',
    updatedAt: '2024-09-15T08:00:00Z',
  },

  // ── en_stock: Flexible de frein avant (Bosch, catId 101) — with promo ─────
  {
    id: 1003,
    title: 'Flexible de frein avant Bosch',
    titleAr: 'خرطوم الفرامل الأمامي بوش',
    condition: 'en_stock',
    articleNumber: '18548 10003',
    // priceFerrailleur = 180.00 → price = 190.80, priceBc = 169.20
    price: 190.80,
    priceBc: 169.20,
    // promo: was 190.80, now 159.90
    promoPrice: 159.90,
    images: [
      'https://picsum.photos/id/111/800/800',
      'https://picsum.photos/id/200/800/800',
    ],
    description:
      'Flexible de frein avant certifié Bosch. Supporte des pressions allant jusqu\'à 250 bar. ' +
      'Résistant aux huiles, carburants et à la chaleur.',
    descriptionAr:
      'خرطوم فرامل أمامي معتمد من بوش. يتحمل ضغطًا يصل إلى 250 بار. ' +
      'مقاوم للزيوت والوقود والحرارة.',
    categoryId: 101,
    categoryName: 'Flexible de frein avant',
    categoryNameAr: 'خرطوم الفرامل الأمامي',
    brand: 'Bosch',
    sellerName: 'Auto Parts Maroc',
    sellerId: 10,
    rating: 4.2,
    reviewsCount: 8,
    stock: 15,
    warranty: '1 an',
    warrantyAr: 'سنة واحدة',
    createdAt: '2024-08-20T09:00:00Z',
    updatedAt: '2024-10-01T09:00:00Z',
  },

  // ── occasion: Disque de frein arrière (catId 102) ─────────────────────────
  {
    id: 1004,
    title: 'Disque de frein arrière — occasion',
    titleAr: 'قرص الفرامل الخلفي — مستعمل',
    condition: 'occasion',
    articleNumber: '18548 10004',
    // priceFerrailleur = 320.00 → price = 339.20, priceBc = 300.80
    price: 339.20,
    priceBc: 300.80,
    promoPrice: undefined,
    images: [
      'https://picsum.photos/id/102/800/800',
      'https://picsum.photos/id/250/800/800',
    ],
    description:
      'Disque de frein arrière en bon état, compatible avec véhicules Renault Logan, Dacia Sandero. ' +
      'Épaisseur résiduelle conforme aux normes de sécurité.',
    descriptionAr:
      'قرص فرامل خلفي بحالة جيدة، متوافق مع رينو لوغان وداسيا سانديرو. ' +
      'السماكة المتبقية وفق معايير السلامة.',
    categoryId: 102,
    categoryName: 'Disque de frein arrière',
    categoryNameAr: 'قرص الفرامل الخلفي',
    brand: undefined,
    sellerName: 'Ferrailleur Rabat',
    sellerId: 12,
    rating: 4.0,
    reviewsCount: 3,
    stock: 1,
    warranty: undefined,
    warrantyAr: undefined,
    createdAt: '2024-10-01T11:00:00Z',
    updatedAt: '2024-10-01T11:00:00Z',
  },

  // ── en_stock: Kit de distribution (catId 103) ─────────────────────────────
  {
    id: 1005,
    title: 'Kit de distribution complet',
    titleAr: 'طقم التوزيع الكامل',
    condition: 'en_stock',
    articleNumber: '18548 10005',
    // priceFerrailleur = 1200.00 → price = 1272.00, priceBc = 1128.00
    price: 1272.00,
    priceBc: 1128.00,
    promoPrice: undefined,
    images: [
      'https://picsum.photos/id/500/800/800',
      'https://picsum.photos/id/501/800/800',
      'https://picsum.photos/id/502/800/800',
    ],
    description:
      'Kit de distribution complet : courroie, galet tendeur, galet enrouleur et pompe à eau. ' +
      'Compatible moteurs 1.5 dCi, 1.6 HDi et 1.9 TDI. Garantie constructeur incluse.',
    descriptionAr:
      'طقم توزيع كامل: حزام، بكرة الشد، بكرة التحويل وضخة الماء. ' +
      'متوافق مع محركات 1.5 dCi و1.6 HDi و1.9 TDI. يشمل ضمان الشركة المصنعة.',
    categoryId: 103,
    categoryName: 'Kit de distribution',
    categoryNameAr: 'طقم التوزيع',
    brand: 'SKF',
    sellerName: 'Auto Parts Maroc',
    sellerId: 10,
    rating: 4.8,
    reviewsCount: 21,
    stock: 5,
    warranty: '1 an',
    warrantyAr: 'سنة واحدة',
    createdAt: '2024-07-10T07:00:00Z',
    updatedAt: '2024-09-05T07:00:00Z',
  },

  // ── occasion: Pare-chocs avant (catId 104) ────────────────────────────────
  {
    id: 1006,
    title: 'Pare-chocs avant — occasion',
    titleAr: 'المصد الأمامي — مستعمل',
    condition: 'occasion',
    articleNumber: '18548 10006',
    // priceFerrailleur = 850.00 → price = 901.00, priceBc = 799.00
    price: 901.00,
    priceBc: 799.00,
    promoPrice: undefined,
    images: [
      'https://picsum.photos/id/400/800/800',
    ],
    description:
      'Pare-chocs avant en bon état, légère égratignure à gauche (voir photo). ' +
      'Compatible Peugeot 207 2006-2012. Prêt à peindre.',
    descriptionAr:
      'مصد أمامي بحالة جيدة، خدش طفيف على اليسار (انظر الصورة). ' +
      'متوافق مع بيجو 207 من 2006 إلى 2012. جاهز للطلاء.',
    categoryId: 104,
    categoryName: 'Pare-chocs avant',
    categoryNameAr: 'المصد الأمامي',
    brand: undefined,
    sellerName: 'Ferrailleur Casablanca',
    sellerId: 11,
    rating: 3.5,
    reviewsCount: 2,
    stock: 1,
    warranty: undefined,
    warrantyAr: undefined,
    createdAt: '2024-10-08T13:00:00Z',
    updatedAt: '2024-10-08T13:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Reviews (keyed by productId for O(1) lookup)
// ---------------------------------------------------------------------------

export const mockReviews: Review[] = [
  // Reviews for product 1001
  {
    id: 2001,
    reviewerId: 1,
    reviewableType: 'order_item',
    reviewableId: 1001,
    rating: 5,
    comment: 'J\'ai obtenu la pièce très rapidement, et au meilleur prix du marché. Je recommande vivement EBEN. La meilleure chose....',
    createdAt: '2024-08-20T10:00:00Z',
    updatedAt: '2024-08-20T10:00:00Z',
    reviewerName: 'Ahmed',
    reviewerAvatar: null,
    reviewerCity: 'Rabat',
    reviewTitle: 'Qualité exceptionnelle',
  },
  {
    id: 2002,
    reviewerId: 2,
    reviewableType: 'order_item',
    reviewableId: 1001,
    rating: 4,
    comment: 'Bonne qualité, correspond bien à la description.',
    createdAt: '2024-10-01T15:00:00Z',
    updatedAt: '2024-10-01T15:00:00Z',
    reviewerName: 'Fatima Z.',
    reviewerAvatar: null,
    reviewerCity: 'Casablanca',
    reviewTitle: null,
  },
  {
    id: 2003,
    reviewerId: 3,
    reviewableType: 'order_item',
    reviewableId: 1001,
    rating: 4,
    comment: null,
    createdAt: '2024-10-05T09:30:00Z',
    updatedAt: '2024-10-05T09:30:00Z',
    reviewerName: 'Youssef M.',
    reviewerAvatar: null,
    reviewerCity: 'Marrakech',
    reviewTitle: null,
  },
  // Reviews for product 1002
  {
    id: 2004,
    reviewerId: 4,
    reviewableType: 'order_item',
    reviewableId: 1002,
    rating: 4,
    comment: 'Bon état pour une pièce d\'occasion, prix correct.',
    createdAt: '2024-09-28T11:00:00Z',
    updatedAt: '2024-09-28T11:00:00Z',
    reviewerName: 'Ahmed R.',
    reviewerAvatar: null,
  },
  {
    id: 2005,
    reviewerId: 5,
    reviewableType: 'order_item',
    reviewableId: 1002,
    rating: 3,
    comment: 'Correct pour le prix, mais les photos ne reflétaient pas exactement l\'état.',
    createdAt: '2024-10-03T14:00:00Z',
    updatedAt: '2024-10-03T14:00:00Z',
    reviewerName: 'Nadia K.',
    reviewerAvatar: null,
  },
  // Reviews for product 1003
  {
    id: 2006,
    reviewerId: 1,
    reviewableType: 'order_item',
    reviewableId: 1003,
    rating: 5,
    comment: 'Produit Bosch authentique, montage sans problème.',
    createdAt: '2024-09-10T08:00:00Z',
    updatedAt: '2024-09-10T08:00:00Z',
    reviewerName: 'Karim B.',
    reviewerAvatar: null,
  },
  {
    id: 2007,
    reviewerId: 6,
    reviewableType: 'order_item',
    reviewableId: 1003,
    rating: 4,
    comment: 'Livraison rapide et pièce conforme.',
    createdAt: '2024-09-25T16:00:00Z',
    updatedAt: '2024-09-25T16:00:00Z',
    reviewerName: 'Sara L.',
    reviewerAvatar: null,
  },
  // Reviews for product 1005
  {
    id: 2008,
    reviewerId: 7,
    reviewableType: 'order_item',
    reviewableId: 1005,
    rating: 5,
    comment: 'Kit complet, tout était dans la boîte. Installation par mon mécanicien sans souci.',
    createdAt: '2024-08-15T11:00:00Z',
    updatedAt: '2024-08-15T11:00:00Z',
    reviewerName: 'Hassan A.',
    reviewerAvatar: null,
  },
  {
    id: 2009,
    reviewerId: 8,
    reviewableType: 'order_item',
    reviewableId: 1005,
    rating: 5,
    comment: 'Parfait. Courroie SKF d\'origine.',
    createdAt: '2024-09-02T09:00:00Z',
    updatedAt: '2024-09-02T09:00:00Z',
    reviewerName: 'Mohammed T.',
    reviewerAvatar: null,
  },
];

// ---------------------------------------------------------------------------
// Basket
// ---------------------------------------------------------------------------

/**
 * Mock basket for the authenticated user (userId = 1).
 * BasketItems reference `offerId` (from the offer flow) — for direct-purchase
 * products this will later map to a `productId`. Using offerId as a placeholder
 * until the backend splits the tables.
 */
export const mockBasket: Basket = {
  id: 1,
  userId: 1,
  requestId: null,
  createdAt: '2024-10-10T07:00:00Z',
  updatedAt: '2024-10-10T10:00:00Z',
  items: [
    {
      id: 3001,
      basketId: 1,
      offerId: 1001, // product 1001 used as offerId placeholder
      categoryId: 100,
      quantity: 1,
      // unitPrice is a snapshot of product.price at add time
      unitPrice: 2676.50,
      createdAt: '2024-10-10T10:00:00Z',
      updatedAt: '2024-10-10T10:00:00Z',
      categoryTitle: 'Plaquettes de frein avant',
      categoryTitleAr: 'بطانات الفرامل الأمامية',
      categoryImage: categoryImageFor(100),
    } satisfies BasketItem,
    {
      id: 3002,
      basketId: 1,
      offerId: 1003, // product 1003 used as offerId placeholder
      categoryId: 101,
      quantity: 2,
      unitPrice: 159.90, // promoPrice was active
      createdAt: '2024-10-10T10:30:00Z',
      updatedAt: '2024-10-10T10:30:00Z',
      categoryTitle: 'Flexible de frein avant',
      categoryTitleAr: 'خرطوم الفرامل الأمامي',
      categoryImage: categoryImageFor(101),
    } satisfies BasketItem,
  ],
};

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

export const mockWishlistItems: WishlistItem[] = [
  {
    id: 4001,
    userId: 1,
    categoryId: 100, // Plaquettes de frein avant
    pneumaticId: null,
    createdAt: '2024-09-05T08:00:00Z',
    categoryTitle: 'Plaquettes de frein avant',
    categoryTitleAr: 'بطانات الفرامل الأمامية',
    categoryImage: categoryImageFor(100),
    price: 349,
    articleNumber: '15049',
    condition: 'Occasion',
  },
  {
    id: 4002,
    userId: 1,
    categoryId: 103, // Kit de distribution
    pneumaticId: null,
    createdAt: '2024-09-18T14:00:00Z',
    categoryTitle: 'Kit de distribution',
    categoryTitleAr: 'طقم التوزيع',
    categoryImage: categoryImageFor(103),
    price: 1190,
    articleNumber: '23817',
    condition: 'Neuf',
  },
  {
    id: 4003,
    userId: 1,
    categoryId: 104, // Pare-chocs avant
    pneumaticId: null,
    createdAt: '2024-10-02T09:00:00Z',
    categoryTitle: 'Pare-chocs avant',
    categoryTitleAr: 'المصد الأمامي',
    categoryImage: categoryImageFor(104),
    price: 2999,
    articleNumber: '38204',
    condition: 'Occasion',
  },
];
