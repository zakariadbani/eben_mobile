import { apiClient } from "../client";
import type { ApiResponse, Paginated, PaginationMeta } from "../types";
import type {
  PrestataireDashboardStats,
} from "@/interfaces/PrestataireDashboard";
import type { Request } from "@/interfaces/Request";
import type { PrestataireOffer, PrestataireShipment } from "@/interfaces/Offer";
import type { PrestataireOrder } from "@/interfaces/Order";
import type { PrestataireProfile } from "@/interfaces/User";
import type { PrestataireCompany } from "@/interfaces/PrestataireCompany";
import type { PrestataireWallet, Withdrawal } from "@/interfaces/Wallet";
import type { Notification } from "@/interfaces/Notification";
import {
  acknowledgePurchaseOrder,
  confirmWithdrawal,
  declineRequest,
  getOfferShipment,
  getPrestataireCompany,
  getPrestataireDashboardSeries,
  getPrestataireIncomingRequests,
  getPrestataireNotifications,
  getPrestataireOffer,
  getPrestataireOffers,
  getPrestataireOffersHistory,
  getPrestataireOrder,
  getPrestataireOrders,
  getPrestataireProfile,
  getPrestataireStats,
  getPrestataireWallet,
  getWithdrawals,
  markAllPrestataireNotificationsRead,
  markPrestataireNotificationRead,
  preparePurchaseOrder,
  shipPurchaseOrder,
  requestWithdrawal,
  resendOffer,
  shipOffer,
  submitOffer,
  updatePrestataireCompany,
  updatePrestataireProfile,
  type DashboardPeriod,
  type SubmitOfferPayload,
  type UpdatePrestataireCompanyPayload,
  type UpdatePrestataireProfilePayload,
} from "../resources/prestataire";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const get = jest.mocked(apiClient.get);
const post = jest.mocked(apiClient.post);
const put = jest.mocked(apiClient.put);

const pagination = {
  total: 0,
  perPage: 20,
  currentPage: 1,
  lastPage: 1,
  from: null,
  to: null,
} satisfies PaginationMeta;

const dashboardResponse = {
  success: true,
  data: {
    revenue30d: 940,
    offersReceivedCount: 4,
    offersActiveCount: 2,
    offersAcceptedCount: 1,
    offersSentCount: 3,
    pendingPayout: 940,
    recentOffers: [
      {
        offerId: 41,
        offerReference: "OFF-41",
        requestReference: "REQ-88",
        quantity: 1,
        priceFerrailleur: 500,
        status: "validated",
        categoryTitle: null,
        categoryTitleAr: null,
        createdAt: "2026-08-02T10:00:00.000Z",
        expiresAt: null,
        categoryImage: null,
      },
    ],
  },
} satisfies ApiResponse<PrestataireDashboardStats>;

const offer: PrestataireOffer = {
  id: 41,
  reference: "OFF-41",
  requestId: 88,
  requestItemId: 101,
  priceFerrailleur: 500,
  description: null,
  audioUrl: null,
  condition: "en_stock",
  quantity: 1,
  availability: "available",
  status: "validated",
  adminNotes: null,
  validatedAt: null,
  createdAt: "2026-08-02T10:00:00.000Z",
  updatedAt: "2026-08-02T10:00:00.000Z",
  images: [],
  categoryTitle: null,
  categoryTitleAr: null,
  categoryImage: null,
  ferrailleurName: null,
  brandName: null,
  brandNameAr: null,
  shippingEligible: false,
};

const order: PrestataireOrder = {
  id: 73,
  reference: "ORD-73",
  netTotal: 470,
  status: "confirmed",
  fulfillmentStatus: "sent",
  notes: null,
  confirmedAt: null,
  createdAt: "2026-08-02T10:00:00.000Z",
  updatedAt: "2026-08-02T10:00:00.000Z",
  items: [
    {
      id: 91,
      orderId: 73,
      offerId: 41,
      productId: null,
      categoryId: 5,
      quantity: 1,
      netAmount: 470,
      status: "confirmed",
      createdAt: "2026-08-02T10:00:00.000Z",
      updatedAt: "2026-08-02T10:00:00.000Z",
      categoryTitle: "Freins",
      categoryTitleAr: "الفرامل",
      purchaseOrder: {
        id: 55,
        reference: "BC-55",
        orderItemId: 91,
        amount: 470,
        trackingNumber: null,
        carrier: null,
        shippingNotes: null,
        status: "sent",
        sentAt: "2026-08-02T10:00:00.000Z",
        shippedAt: null,
        createdAt: "2026-08-02T10:00:00.000Z",
        updatedAt: "2026-08-02T10:00:00.000Z",
      },
    },
  ],
};

const profile: PrestataireProfile = {
  id: 7,
  name: "Ahmed Amrani",
  firstName: "Ahmed",
  lastName: "Amrani",
  email: "ahmed@example.com",
  phone: "+212600000101",
  avatar: null,
  status: "active",
  ferrailleurRating: 4.8,
  ferrailleurStatus: "certified",
  specializations: [2, 5],
  createdAt: "2026-08-02T10:00:00.000Z",
  updatedAt: "2026-08-02T10:00:00.000Z",
};

const company: PrestataireCompany = {
  id: 12,
  userId: 7,
  legalName: "Atlas Pièces",
  ice: null,
  rc: null,
  taxId: null,
  addressLine1: null,
  addressLine2: null,
  city: "Casablanca",
  postalCode: null,
  region: null,
  country: "MA",
  phone: null,
  email: null,
  specializations: [2, 5],
  status: "active",
  createdAt: "2026-08-02T10:00:00.000Z",
  updatedAt: "2026-08-02T10:00:00.000Z",
};

const wallet: PrestataireWallet = {
  balance: 940,
  pendingPayout: 120,
  transactions: [],
};

const incomingRequestsResponse = {
  success: true,
  data: [],
  pagination,
} satisfies Paginated<Request>;
const incomingRequest: Request = {
  id: 88,
  reference: "REQ-88",
  userId: 3,
  vehicleId: 4,
  addressId: null,
  notes: null,
  status: "pending",
  aiValidationTag: null,
  aiValidationReason: null,
  offersCount: 0,
  expiresAt: null,
  createdAt: "2026-08-02T10:00:00.000Z",
  updatedAt: "2026-08-02T10:00:00.000Z",
};
const offerResponse = { success: true, data: offer } satisfies ApiResponse<PrestataireOffer>;
const shipmentResponse = {
  success: true,
  data: null,
} satisfies ApiResponse<PrestataireShipment | null>;
const orderResponse = { success: true, data: order } satisfies ApiResponse<PrestataireOrder>;
const profileResponse = { success: true, data: profile } satisfies ApiResponse<PrestataireProfile>;
const companyResponse = { success: true, data: company } satisfies ApiResponse<PrestataireCompany>;
const walletResponse = { success: true, data: wallet } satisfies ApiResponse<PrestataireWallet>;
const withdrawalsResponse = {
  success: true,
  data: [],
  pagination,
} satisfies Paginated<Withdrawal>;
const offersResponse = {
  success: true,
  data: [],
  pagination,
} satisfies Paginated<PrestataireOffer>;
const notificationsResponse = {
  success: true,
  data: [],
  pagination,
} satisfies Paginated<Notification>;
const emptyResponse = { success: true, data: null } satisfies ApiResponse<null>;

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue(incomingRequestsResponse);
  post.mockResolvedValue(emptyResponse);
  put.mockResolvedValue(emptyResponse);
});

it.each([
  ["dashboard stats", () => getPrestataireStats(), "/prestataire/dashboard", dashboardResponse],
  [
    "incoming requests",
    () => getPrestataireIncomingRequests(),
    "/prestataire/incoming-requests",
    incomingRequestsResponse,
  ],
  ["offer detail", () => getPrestataireOffer(41), "/prestataire/offers/41", offerResponse],
  [
    "offer shipment",
    () => getOfferShipment(41),
    "/prestataire/offers/41/shipment",
    shipmentResponse,
  ],
  ["order detail", () => getPrestataireOrder(73), "/prestataire/orders/73", orderResponse],
  ["profile", () => getPrestataireProfile(), "/prestataire/profile", profileResponse],
  ["company", () => getPrestataireCompany(), "/prestataire/company", companyResponse],
  ["wallet", () => getPrestataireWallet(), "/prestataire/wallet", walletResponse],
  [
    "withdrawals",
    () => getWithdrawals(),
    "/prestataire/wallet/withdrawals",
    withdrawalsResponse,
  ],
  [
    "offer history",
    () => getPrestataireOffersHistory(),
    "/prestataire/offers/history",
    offersResponse,
  ],
  [
    "notifications",
    () => getPrestataireNotifications(),
    "/prestataire/notifications",
    notificationsResponse,
  ],
])("gets the Laravel %s endpoint", async (_name, request, path, response) => {
  get.mockResolvedValueOnce(response);
  await expect(request()).resolves.toBe(response);
  expect(get).toHaveBeenCalledWith(path);
});

it.each<[DashboardPeriod, string]>([
  ["1j", "1j"],
  ["7j", "7j"],
  ["1m", "1m"],
  ["6m", "6m"],
  ["1a", "1a"],
  ["max", "max"],
])("gets dashboard series for the canonical %s period", async (period, query) => {
  const response = {
    success: true as const,
    data: {
      period,
      buckets: [
        {
          label: "08/2026",
          revenue: 940,
          offersReceived: 4,
          offersActive: 2,
          offersAccepted: 1,
          offersSent: 3,
          pendingPayout: 940,
        },
      ],
    },
  };
  get.mockResolvedValueOnce(response);

  await expect(getPrestataireDashboardSeries(period)).resolves.toBe(response);
  expect(get).toHaveBeenCalledWith(
    `/prestataire/dashboard/series?period=${query}`,
  );
});

it.each([
  [undefined, "/prestataire/offers"],
  ["active" as const, "/prestataire/offers?status=active"],
  ["accepted" as const, "/prestataire/offers?status=accepted"],
  ["sent" as const, "/prestataire/offers?status=sent"],
  ["shipped" as const, "/prestataire/offers?status=shipped"],
])("encodes the offer status filter %s", async (status, path) => {
  await getPrestataireOffers(status);
  expect(get).toHaveBeenCalledWith(path);
});

it.each([
  [undefined, "/prestataire/orders"],
  ["accepted" as const, "/prestataire/orders?status=accepted"],
  ["shipped" as const, "/prestataire/orders?status=shipped"],
  ["delivered" as const, "/prestataire/orders?status=delivered"],
])("encodes the order status filter %s", async (status, path) => {
  await getPrestataireOrders(status);
  expect(get).toHaveBeenCalledWith(path);
});

it("loads every order page because the order screens have no paginator", async () => {
  const firstPage = {
    success: true as const,
    data: [order],
    pagination: { ...pagination, total: 2, perPage: 1, currentPage: 1, lastPage: 2, from: 1, to: 1 },
  };
  const secondOrder = { ...order, id: 74, reference: "ORD-74" };
  const secondPage = {
    success: true as const,
    data: [secondOrder],
    pagination: { ...pagination, total: 2, perPage: 1, currentPage: 2, lastPage: 2, from: 2, to: 2 },
  };
  get.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

  await expect(getPrestataireOrders("accepted")).resolves.toMatchObject({
    data: [order, secondOrder],
  });
  expect(get).toHaveBeenNthCalledWith(1, "/prestataire/orders?status=accepted");
  expect(get).toHaveBeenNthCalledWith(2, "/prestataire/orders?status=accepted&page=2&perPage=1");
});

it("loads every incoming-request page while preserving the no-argument API", async () => {
  const firstPage = {
    success: true as const,
    data: [incomingRequest],
    pagination: { ...pagination, total: 2, perPage: 1, currentPage: 1, lastPage: 2, from: 1, to: 1 },
  };
  const secondRequest = { ...incomingRequest, id: 89, reference: "REQ-89" };
  const secondPage = {
    success: true as const,
    data: [secondRequest],
    pagination: { ...pagination, total: 2, perPage: 1, currentPage: 2, lastPage: 2, from: 2, to: 2 },
  };
  get.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

  await expect(getPrestataireIncomingRequests()).resolves.toMatchObject({
    data: [incomingRequest, secondRequest],
  });
  expect(get).toHaveBeenNthCalledWith(1, "/prestataire/incoming-requests");
  expect(get).toHaveBeenNthCalledWith(2, "/prestataire/incoming-requests?page=2&perPage=1");
});

it("posts canonical purchase-order transitions without client state", async () => {
  await acknowledgePurchaseOrder(55);
  expect(post).toHaveBeenLastCalledWith(
    "/prestataire/purchase-orders/55/acknowledge",
    {},
  );

  await preparePurchaseOrder(55);
  expect(post).toHaveBeenLastCalledWith(
    "/prestataire/purchase-orders/55/prepare",
    {},
  );

  await shipPurchaseOrder(55, { trackingNumber: "TRACK-55" });
  expect(post).toHaveBeenLastCalledWith(
    "/prestataire/purchase-orders/55/ship",
    { trackingNumber: "TRACK-55" },
  );
});

it.each([0, -1, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid purchase-order id %s before networking",
  async (id) => {
    await expect(acknowledgePurchaseOrder(id)).rejects.toThrow(TypeError);
    await expect(preparePurchaseOrder(id)).rejects.toThrow(TypeError);
    await expect(shipPurchaseOrder(id, { trackingNumber: "TRACK" })).rejects.toThrow(TypeError);
    expect(post).not.toHaveBeenCalled();
  },
);

it("submits only partner-owned offer inputs for every request line", async () => {
  const payload: SubmitOfferPayload = {
    lines: [
      {
        requestItemId: 101,
        priceFerrailleur: 500,
        condition: "en_stock",
        description: "Neuf",
        images: ["mobile-uploads/partner/offer-1.webp"],
      },
      {
        requestItemId: 102,
        priceFerrailleur: 750.5,
        condition: "occasion",
        description: null,
        images: ["mobile-uploads/partner/offer-2.webp"],
      },
    ],
  };

  await submitOffer(88, payload);

  expect(post).toHaveBeenCalledWith(
    "/prestataire/requests/88/offers",
    payload,
  );
  expect(payload.lines).toEqual(
    expect.not.arrayContaining([
      expect.objectContaining({ priceClient: expect.anything() }),
      expect.objectContaining({ priceBc: expect.anything() }),
    ]),
  );
});

it("posts decline details and preserves the empty-payload variant", async () => {
  const payload = { reason: "stock", comment: "Indisponible" };

  await declineRequest(88, payload);
  expect(post).toHaveBeenLastCalledWith(
    "/prestataire/requests/88/decline",
    payload,
  );

  await declineRequest(89);
  expect(post).toHaveBeenLastCalledWith(
    "/prestataire/requests/89/decline",
    {},
  );
});

it("resends an offer without a client-supplied replacement payload", async () => {
  await resendOffer(41);
  expect(post).toHaveBeenCalledWith("/prestataire/offers/41/resend", {});
});

it("posts canonical shipment fields", async () => {
  const payload = {
    trackingNumber: "AMANA-123",
    carrier: "Amana",
    notes: "Fragile",
  };

  await shipOffer(41, payload);
  expect(post).toHaveBeenCalledWith("/prestataire/offers/41/ship", payload);
});

it("updates the editable Prestataire profile fields", async () => {
  const payload: UpdatePrestataireProfilePayload = {
    firstName: "Ahmed",
    lastName: "Amrani",
    phone: "+212600000101",
    email: "ahmed@example.com",
    currentPassword: "current-password",
  };

  await updatePrestataireProfile(payload);
  expect(put).toHaveBeenCalledWith("/prestataire/profile", payload);
});

it("submits the owned temporary avatar path through the JSON profile resource", async () => {
  const payloadWithAvatar: UpdatePrestataireProfilePayload = {
    firstName: "Ahmed",
    avatar: "tmp/mobile/7/avatar.webp",
  };

  await updatePrestataireProfile(payloadWithAvatar);

  expect(put).toHaveBeenCalledWith("/prestataire/profile", payloadWithAvatar);
});

it.each([
  ["offer history", getPrestataireOffersHistory, "/prestataire/offers/history"],
  ["notifications", getPrestataireNotifications, "/prestataire/notifications"],
] as const)("aggregates every %s page for screens without paging controls", async (_name, request, path) => {
  get
    .mockResolvedValueOnce({ success: true, data: [{ id: 1 }], pagination: { ...pagination, lastPage: 2 } })
    .mockResolvedValueOnce({ success: true, data: [{ id: 2 }], pagination: { ...pagination, currentPage: 2, lastPage: 2 } });

  await expect(request()).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
  expect(get).toHaveBeenNthCalledWith(1, path);
  expect(get).toHaveBeenNthCalledWith(2, `${path}?page=2&perPage=${pagination.perPage}`);
});

it("updates company fields including write-only bank configuration", async () => {
  const payload: UpdatePrestataireCompanyPayload = {
    legalName: "Atlas Pièces",
    ice: "001234567890123",
    rc: "RC-45",
    taxId: "IF-78",
    addressLine1: "1 rue Atlas",
    city: "Casablanca",
    country: "MA",
    phone: "+212522000000",
    email: "contact@example.com",
    specializations: [2, 5],
    bankRib: "123456789012345678901234",
    bankName: "Banque Test",
  };

  await updatePrestataireCompany(payload);
  expect(put).toHaveBeenCalledWith("/prestataire/company", payload);
});

it("requests withdrawals with and without an explicit payout method", async () => {
  await requestWithdrawal(500, "virement");
  expect(post).toHaveBeenLastCalledWith("/prestataire/wallet/withdraw", {
    amount: 500,
    method: "virement",
  });

  await requestWithdrawal(250);
  expect(post).toHaveBeenLastCalledWith("/prestataire/wallet/withdraw", {
    amount: 250,
  });
});

it("confirms an owned withdrawal with the six-digit OTP", async () => {
  await confirmWithdrawal(17, "123456");
  expect(post).toHaveBeenCalledWith(
    "/prestataire/wallet/withdrawals/17/confirm",
    { code: "123456" },
  );
});

it("marks one or all Prestataire notifications read", async () => {
  await markPrestataireNotificationRead(64);
  expect(post).toHaveBeenLastCalledWith(
    "/prestataire/notifications/64/read",
    {},
  );

  await markAllPrestataireNotificationsRead();
  expect(post).toHaveBeenLastCalledWith(
    "/prestataire/notifications/read-all",
    {},
  );
});

it("rejects an invalid notification id before networking", async () => {
  await expect(markPrestataireNotificationRead(0)).rejects.toThrow(
    "notification id must be a positive integer",
  );
  expect(post).not.toHaveBeenCalled();
});
