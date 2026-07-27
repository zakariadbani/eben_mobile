export const dataCategories = [
  {
    id: 1,
    title: "freins",
    title_ar: "المكابح",
    image: require("@/assets/img/freins.png"),
  },
  {
    id: 2,
    title: "guidon",
    title_ar: "المقود",
    image: require("@/assets/img/guidon.png"),
  },
  {
    id: 3,
    title: "carrosserie",
    title_ar: "هيكل السيارة",
    image: require("@/assets/img/carrosserie.png"),
  },
  {
    id: 4,
    title: "item 1",
    title_ar: "البند 1",
    image: require("@/assets/img/item1.png"),
  },
  {
    id: 5,
    title: "item 2",
    title_ar: "البند 2",
    image: require("@/assets/img/item2.png"),
  },
  {
    id: 6,
    title: "moteur",
    title_ar: "المحرك",
    image: require("@/assets/img/moteur.png"),
  },
  {
    id: 7,
    title: "roue",
    title_ar: "العجلة",
    image: require("@/assets/img/roue.png"),
  },
];
export const dataSubCategories = [
  {
    id: 1,
    title: "Flexible de frein",
    title_ar: "المكابح",
    image: require("@/assets/img/freins.png"),
    state: "added",
  },
  {
    id: 2,
    title: "Flexible de frein",
    title_ar: "المقود",
    image: require("@/assets/img/freins.png"),
  },
  {
    id: 3,
    title: "Flexible de frein",
    title_ar: "هيكل السيارة",
    image: require("@/assets/img/freins.png"),
    state: "added",
  },
  {
    id: 4,
    title: "Flexible de frein",
    title_ar: "البند 1",
    image: require("@/assets/img/freins.png"),
  },
  {
    id: 5,
    title: "Flexible de frein",
    title_ar: "البند 2",
    image: require("@/assets/img/freins.png"),
  },
  {
    id: 6,
    title: "Flexible de frein",
    title_ar: "المحرك",
    image: require("@/assets/img/moteur.png"),
    state: "added",
  },
  {
    id: 7,
    title: "Flexible de frein",
    title_ar: "العجلة",
    image: require("@/assets/img/roue.png"),
  },
];

export const dataRequests = [
  {
    id: 1,
    ref: "268303280",
    status: "received",
    exp: "12h 00min",
  },
  {
    id: 2,
    ref: "381379033",
    status: "new",
    exp: "1h 31min",
  },
  {
    id: 3,
    ref: "492837293",
    status: "delivered",
    exp: "4h 15min",
  },
  {
    id: 4,
    ref: "573839202",
    status: "received",
    exp: "2h 45min",
  },
  {
    id: 5,
    ref: "684839301",
    status: "new",
    exp: "3h 20min",
  },
  {
    id: 6,
    ref: "798374839",
    status: "delivered",
    exp: "15h 10min",
  },
  {
    id: 7,
    ref: "839283920",
    status: "new",
    exp: "30min",
  },
  {
    id: 8,
    ref: "940283719",
    status: "received",
    exp: "6h 00min",
  },
  {
    id: 9,
    ref: "102938475",
    status: "delivered",
    exp: "9h 50min",
  },
  {
    id: 10,
    ref: "112837465",
    status: "new",
    exp: "2h 30min",
  },
];

export const dataRequest = {
  id: 1,
  comment:
    "Seul le côté avant de la voiture a été endommagé. Le moteur est toujours intact.",
  images: [
    "https://picsum.photos/id/1071/1000/1500",
    "https://picsum.photos/id/133/1000/1500",
    "https://picsum.photos/id/111/1000/1500",
    "https://picsum.photos/id/514/1000/1500",
    "https://picsum.photos/id/655/1000/1500",
  ],

  categories: [
    {
      id: 1,
      title: "Freins",
      title_ar: "المكابح",
      sub_categories: [
        {
          id: 1,
          title: "RIDEX 402B1190 Jeu de plaquettes de frein",
          title_ar: "المكابح",
          image: require("@/assets/img/freins.png"),
        },
        {
          id: 2,
          title: "Flexible de frein",
          title_ar: "المقود",
          image: require("@/assets/img/freins.png"),
        },
        {
          id: 3,
          title: "RIDEX 402B1190 Jeu de plaquettes de frein",
          title_ar: "هيكل السيارة",
          image: require("@/assets/img/freins.png"),
        },
      ],
    },
    {
      id: 2,
      title: "Mécanique",
      title_ar: "المقود",
      sub_categories: [
        {
          id: 4,
          title: "Flexible de frein",
          title_ar: "البند 1",
          image: require("@/assets/img/freins.png"),
        },
      ],
    },

    {
      id: 2,
      title: "Carrosserie",
      title_ar: "هيكل السيارة",
      sub_categories: [
        {
          id: 5,
          title: "Flexible de frein",
          title_ar: "البند 2",
          image: require("@/assets/img/freins.png"),
        },
        {
          id: 6,
          title: "Flexible de frein",
          title_ar: "المحرك",
          image: require("@/assets/img/moteur.png"),
        },
      ],
    },
  ],
};

export const dataOffer = {
  id: 1,
  ref: "34852",
  comment:
    "Seul le côté avant de la voiture a été endommagé. Le moteur est toujours intact.",
  price: "2675.99",
  audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  images: [
    "https://picsum.photos/id/514/1000/1500",
    "https://picsum.photos/id/1071/1000/1500",
    "https://picsum.photos/id/133/1000/1500",
    "https://picsum.photos/id/111/1000/1500",
    "https://picsum.photos/id/655/1000/1500",
  ],
};

export const dataBrands = [
  {
    id: 1,
    title: "Toyota",
    models: [
      {
        id: 1,
        title: "Camry",
      },
      {
        id: 2,
        title: "Corolla",
      },
      {
        id: 3,
        title: "RAV4",
      },
    ],
  },
  {
    id: 2,
    title: "Honda",
    models: [
      {
        id: 1,
        title: "Civic",
      },
      {
        id: 2,
        title: "Accord",
      },
      {
        id: 3,
        title: "CR-V",
      },
    ],
  },
  {
    id: 3,
    title: "Ford",
    models: [
      {
        id: 1,
        title: "F-150",
      },
      {
        id: 2,
        title: "Mustang",
      },
      {
        id: 3,
        title: "Explorer",
      },
    ],
  },
  {
    id: 4,
    title: "Chevrolet",
    models: [
      {
        id: 1,
        title: "Silverado",
      },
      {
        id: 2,
        title: "Malibu",
      },
      {
        id: 3,
        title: "Equinox",
      },
    ],
  },
  {
    id: 5,
    title: "Nissan",
    models: [
      {
        id: 1,
        title: "Altima",
      },
      {
        id: 2,
        title: "Maxima",
      },
      {
        id: 3,
        title: "Rogue",
      },
    ],
  },
  {
    id: 6,
    title: "BMW",
    models: [
      {
        id: 1,
        title: "3 Series",
      },
      {
        id: 2,
        title: "5 Series",
      },
      {
        id: 3,
        title: "X5",
      },
    ],
  },
  {
    id: 7,
    title: "Audi",
    models: [
      {
        id: 1,
        title: "A4",
      },
      {
        id: 2,
        title: "Q5",
      },
      {
        id: 3,
        title: "A6",
      },
    ],
  },
  {
    id: 8,
    title: "Mercedes-Benz",
    models: [
      {
        id: 1,
        title: "C-Class",
      },
      {
        id: 2,
        title: "E-Class",
      },
      {
        id: 3,
        title: "GLC",
      },
    ],
  },
  {
    id: 9,
    title: "Hyundai",
    models: [
      {
        id: 1,
        title: "Elantra",
      },
      {
        id: 2,
        title: "Sonata",
      },
      {
        id: 3,
        title: "Tucson",
      },
    ],
  },
  {
    id: 10,
    title: "Kia",
    models: [
      {
        id: 1,
        title: "Forte",
      },
      {
        id: 2,
        title: "Optima",
      },
      {
        id: 3,
        title: "Sportage",
      },
    ],
  },
];

export const dataCarYears = [
  { id: 2000, title: "2000" },
  { id: 2001, title: "2001" },
  { id: 2002, title: "2002" },
  { id: 2003, title: "2003" },
  { id: 2004, title: "2004" },
  { id: 2005, title: "2005" },
  { id: 2006, title: "2006" },
  { id: 2007, title: "2007" },
  { id: 2008, title: "2008" },
  { id: 2009, title: "2009" },
  { id: 2010, title: "2010" },
  { id: 2011, title: "2011" },
  { id: 2012, title: "2012" },
  { id: 2013, title: "2013" },
  { id: 2014, title: "2014" },
  { id: 2015, title: "2015" },
  { id: 2016, title: "2016" },
  { id: 2017, title: "2017" },
  { id: 2018, title: "2018" },
  { id: 2019, title: "2019" },
  { id: 2020, title: "2020" },
  { id: 2021, title: "2021" },
  { id: 2022, title: "2022" },
  { id: 2023, title: "2023" },
  { id: 2024, title: "2024" },
];
export const dataCarMotorizations = [
  {
    id: 1,
    title: "I4",
  },
  {
    id: 2,
    title: "I6",
  },
  {
    id: 3,
    title: "V6",
  },
  {
    id: 4,
    title: "V8",
  },
  {
    id: 5,
    title: "V10",
  },
  {
    id: 6,
    title: "V12",
  },
  {
    id: 7,
    title: "W12",
  },
  {
    id: 8,
    title: "Electric",
  },
  {
    id: 9,
    title: "Hybrid",
  },
];

export const dataCars = [
  {
    id: 1,
    brand: "Toyota",
    model: "Camry",
    year: "2021",
    motorization: "I4",
    image: "https://picsum.photos/id/514/1000/1500",
  },
  {
    id: 2,
    brand: "Ford",
    model: "Mustang",
    year: "2018",
    motorization: "V8",
    image: "https://picsum.photos/id/133/1000/1500",
  },
  {
    id: 3,
    brand: "BMW",
    model: "M3",
    year: "2022",
    motorization: "I6",
    image: "https://picsum.photos/id/1071/1000/1500",
  },
  {
    id: 4,
    brand: "Tesla",
    model: "Model S",
    year: "2023",
    motorization: "Electric",
    image: "https://picsum.photos/id/111/1000/1500",
  },
];
export const dataAddresses = [
  {
    id: 1,
    name: "Ma maison",
    city: "Casablanca",
    address: "Rue : 7, rue Alhour -ex Peupliers, Hay Kastor",
    default: 1,
  },
  {
    id: 2,
    name: "Mon garagiste",
    city: "Casablanca",
    address: "Rue : 7, rue Alhour -ex Peupliers, Hay Kastor",
    default: 0,
  },
  {
    id: 3,
    name: "Ma maison 2",
    city: "Casablanca",
    address: "Rue : 7, rue Alhour -ex Peupliers, Hay Kastor",
    default: 0,
  },
];
export const dataNotifications = [
  {
    id: 1,
    title: "Commande expédiée",
    message: "La commande n° 2563847 a été expédiée",
    title_ar: "تم شحن الطلب",
    message_ar: "تم شحن الطلب رقم 2563847",
    type: "shipped",
    created_at: "2024-10-09T15:50:00",
    is_read: 0,
  },
  {
    id: 2,
    title: "Carte de bons d'achat",
    message:
      "Vous avez gagné 100dhs de réduction sur votre prochaine commande.",
    title_ar: "بطاقة قسائم الشراء",
    message_ar: "لقد ربحت 100 درهم خصم على طلبك القادم.",
    type: "gift",
    created_at: "2024-09-03T11:10:00",
    is_read: 0,
  },
  {
    id: 3,
    title: "Commande livrée",
    message: "La commande n° 2563847 a été livrée",
    title_ar: "تم تسليم الطلب",
    message_ar: "تم تسليم الطلب رقم 2563847",
    type: "delivered",
    created_at: "2024-08-25T16:00:00",
    is_read: 0,
  },
  {
    id: 4,
    title: "La liste est envoyée",
    message:
      "La liste n° 1287397948 a été envoyée. Vous recevrez vos offres en quelques heures",
    title_ar: "تم إرسال القائمة",
    message_ar:
      "تم إرسال القائمة رقم 1287397948. ستتلقى عروضك في غضون ساعات قليلة.",
    type: "list_sent",
    created_at: "2024-07-14T08:15:00",
    is_read: 1,
  },
  {
    id: 5,
    title: "Vous avez reçu vos offres",
    message:
      "La liste n° 1287397948 a été envoyée. Vous recevrez vos offres en quelques heures.",
    title_ar: "لقد تلقيت عروضك",
    message_ar:
      "تم إرسال القائمة رقم 1287397948. ستتلقى عروضك في غضون ساعات قليلة.",
    type: "list_received",
    created_at: "2024-06-18T12:30:00",
    is_read: 1,
  },
  {
    id: 6,
    title: "Paiement confirmé",
    message:
      "Votre paiement de 500dhs pour la commande n° 654321 a été confirmé.",
    title_ar: "تم تأكيد الدفع",
    message_ar: "تم تأكيد دفعتك بمبلغ 500 درهم للطلب رقم 654321.",
    type: "payment",
    created_at: "2024-10-12T09:20:00",
    is_read: 1,
  },
  {
    id: 7,
    title: "Nouveau message",
    message: "Vous avez reçu un nouveau message de notre support client.",
    title_ar: "رسالة جديدة",
    message_ar: "لقد تلقيت رسالة جديدة من دعم العملاء لدينا.",
    type: "message",
    created_at: "2024-10-05T14:45:00",
    is_read: 1,
  },
  {
    id: 8,
    title: "Retour accepté",
    message:
      "Votre demande de retour pour la commande n° 123456 a été acceptée.",
    title_ar: "تم قبول الإرجاع",
    message_ar: "تم قبول طلب الإرجاع للطلب رقم 123456.",
    type: "return",
    created_at: "2024-09-28T10:00:00",
    is_read: 1,
  },
  {
    id: 9,
    title: "Produit en rupture de stock",
    message: "Le produit XYZ est actuellement en rupture de stock.",
    title_ar: "المنتج غير متوفر",
    message_ar: "المنتج XYZ غير متوفر حاليًا.",
    type: "stock",
    created_at: "2024-09-15T07:30:00",
    is_read: 1,
  },
  {
    id: 10,
    title: "Abonnement renouvelé",
    message: "Votre abonnement annuel a été renouvelé avec succès.",
    title_ar: "تم تجديد الاشتراك",
    message_ar: "تم تجديد اشتراكك السنوي بنجاح.",
    type: "subscription",
    created_at: "2024-09-01T12:15:00",
    is_read: 1,
  },
  {
    id: 11,
    title: "Nouveau commentaire",
    message: "Un nouvel avis a été laissé sur votre commande n° 765432.",
    title_ar: "تعليق جديد",
    message_ar: "تم ترك رأي جديد على طلبك رقم 765432.",
    type: "review",
    created_at: "2024-08-21T18:45:00",
    is_read: 1,
  },
  {
    id: 12,
    title: "Compte mis à jour",
    message:
      "Les informations de votre compte ont été mises à jour avec succès.",
    title_ar: "تم تحديث الحساب",
    message_ar: "تم تحديث معلومات حسابك بنجاح.",
    type: "account_update",
    created_at: "2024-08-10T13:30:00",
    is_read: 1,
  },
];

// ─── Typed re-exports from the new mock layer ─────────────────────────────────
// The exports above are kept exactly as-is for backward compat with existing screens.
// New code should import from @/api or @/interfaces directly.
// These re-exports let screens progressively migrate to typed data.

export {
  mockCarBrands as typedBrands,
  mockCarModels as typedCarModels,
  mockCarMotorizations as typedCarMotorizations,
  mockCarYears as typedCarYears,
  mockVehicles as typedCars,
} from '@/api/mock/mockVehicles';

export {
  mockCategoriesLevel1 as typedCategories,
  mockCategories as typedAllCategories,
  buildCategoryTree,
} from '@/api/mock/mockCategories';

export {
  mockRequestSummaries as typedRequests,
  mockRequests as typedRequestDetails,
  mockOffers as typedOffers,
} from '@/api/mock/mockRequests';

export {
  mockAddresses as typedAddresses,
  mockOrders as typedOrders,
  mockNotifications as typedNotifications,
} from '@/api/mock/mockOrders';
