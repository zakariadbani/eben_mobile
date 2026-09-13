import React from "react";
import { FlatList, Image, Modal, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import i18n from "@/localization/i18n";
import Dashboard from "../dashboard";
import OverviewScreen from "../profile/overview";
import PrestataireSearchScreen from "../search";
import PrestataireOffersScreen from "../offers";
import ItemIncomingRequestCard from "@/components/screens/prestataire/ItemIncomingRequestCard";
import ItemPartnerOfferCard from "@/components/screens/prestataire/ItemPartnerOfferCard";

const mockPush = jest.fn();
const mockSetParams = jest.fn();
const mockBack = jest.fn();
const mockNavigate = jest.fn();
const mockRouter = { push: mockPush, setParams: mockSetParams, back: mockBack, navigate: mockNavigate };
let mockParams: Record<string, string | undefined> = {};

const mockGetStats = jest.fn();
const mockGetSeries = jest.fn();
const mockGetIncoming = jest.fn();
const mockGetOffers = jest.fn();
const mockGetOrders = jest.fn();
const mockApiGet = jest.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => { resolve = resolver; });
  return { promise, resolve };
}

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-router", () => ({
  Tabs: { Screen: () => null },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => {
    const ReactModule = require("react") as typeof React;
    ReactModule.useEffect(callback, [callback]);
  },
}));
jest.mock("@/api", () => ({
  getPrestataireStats: (...args: unknown[]) => mockGetStats(...args),
  getPrestataireOffers: (...args: unknown[]) => mockGetOffers(...args),
}));
jest.mock("@/api/client", () => ({
  apiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
}));
jest.mock("@/api/resources/prestataire", () => ({
  getPrestataireStats: (...args: unknown[]) => mockGetStats(...args),
  getPrestataireDashboardSeries: (...args: unknown[]) => mockGetSeries(...args),
  getPrestataireIncomingRequests: (...args: unknown[]) => mockGetIncoming(...args),
  getPrestataireOffers: (...args: unknown[]) => mockGetOffers(...args),
  getPrestataireOrders: (...args: unknown[]) => mockGetOrders(...args),
}));

const pagination = {
  currentPage: 1,
  lastPage: 1,
  perPage: 20,
  total: 2,
  from: 1,
  to: 2,
};

const stats = {
  revenue30d: 101,
  offersReceivedCount: 102,
  offersActiveCount: 103,
  offersAcceptedCount: 104,
  offersSentCount: 105,
  missedRequestsCount: 107,
  pendingPayout: 106,
  comparison: {
    period: '30d' as const,
    sales: 101,
    salesPrev: 101,
    requestsReceived: 102,
    requestsReceivedPrev: 102,
    offersSent: 105,
    offersSentPrev: 105,
    accepted: 104,
    acceptedPrev: 104,
  },
  recentOffers: [],
};

const series = (period: "1j" | "7j" | "1m" | "6m" | "1a" | "max", offset = 0) => ({
  success: true as const,
  data: {
    period,
    buckets: [
      {
        label: "A",
        revenue: 201 + offset,
        offersReceived: 301 + offset,
        offersActive: 401 + offset,
        offersAccepted: 501 + offset,
        offersSent: 601 + offset,
        pendingPayout: 701 + offset,
      },
      {
        label: "B",
        revenue: 202 + offset,
        offersReceived: 302 + offset,
        offersActive: 402 + offset,
        offersAccepted: 502 + offset,
        offersSent: 602 + offset,
        pendingPayout: 702 + offset,
      },
    ],
    topProducts: [
      { title: 'Plaquettes live', titleAr: 'وسادات مباشرة', image: 'https://cdn.example/top.jpg', soldCount: 12 },
    ],
  },
});

const requests = [
  {
    id: 501,
    reference: "REQ-501",
    userId: 7,
    vehicleId: 8,
    addressId: null,
    notes: "Plaquettes urgentes",
    status: "pending" as const,
    aiValidationTag: null,
    aiValidationReason: null,
    offersCount: 0,
    expiresAt: "2099-01-01T12:00:00.000Z",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    items: [{
      id: 801,
      requestId: 501,
      categoryId: 31,
      quantity: 1,
      condition: "occasion" as const,
      notes: null,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      categoryTitle: "Plaquettes live",
      categoryTitleAr: "Plaquettes live AR",
      categoryImage: "https://cdn.example/plaquettes.jpg",
    }],
  },
  {
    id: 502,
    reference: "REQ-502",
    userId: 7,
    vehicleId: 9,
    addressId: null,
    notes: "Boite",
    status: "pending" as const,
    aiValidationTag: null,
    aiValidationReason: null,
    offersCount: 0,
    expiresAt: "2099-01-01T12:00:00.000Z",
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
    items: [{
      id: 802,
      requestId: 502,
      categoryId: 32,
      quantity: 1,
      condition: "en_stock" as const,
      notes: null,
      createdAt: "2026-08-02T10:00:00.000Z",
      updatedAt: "2026-08-02T10:00:00.000Z",
      categoryTitle: "Transmission live",
      categoryTitleAr: "Transmission live AR",
      categoryImage: "https://cdn.example/transmission.jpg",
    }],
  },
];

const requestA = {
  id: 511,
  reference: "REQ-511",
  userId: 7,
  vehicleId: 8,
  addressId: null,
  notes: null,
  status: "pending" as const,
  aiValidationTag: null,
  aiValidationReason: null,
  offersCount: 0,
  expiresAt: "2099-01-01T12:00:00.000Z",
  createdAt: "2026-08-03T10:00:00.000Z",
  updatedAt: "2026-08-03T10:00:00.000Z",
  items: [
    {
      id: 811,
      requestId: 511,
      categoryId: 33,
      quantity: 1,
      condition: "occasion" as const,
      notes: null,
      createdAt: "2026-08-03T10:00:00.000Z",
      updatedAt: "2026-08-03T10:00:00.000Z",
      categoryTitle: "Disque live",
      categoryTitleAr: "Disque live AR",
      categoryImage: "https://cdn.example/disque.jpg",
      brandId: 1,
      brandName: "RIDEX live",
      brandNameAr: "ريدكس live",
      brandLogo: null,
    },
    {
      id: 812,
      requestId: 511,
      categoryId: 33,
      quantity: 1,
      condition: "occasion" as const,
      notes: null,
      createdAt: "2026-08-03T10:00:00.000Z",
      updatedAt: "2026-08-03T10:00:00.000Z",
      categoryTitle: "Disque live",
      categoryTitleAr: "Disque live AR",
      categoryImage: "https://cdn.example/disque.jpg",
      brandId: 2,
      brandName: "Brembo live",
      brandNameAr: "بريمبو live",
      brandLogo: null,
    },
  ],
};

const requestB = {
  id: 512,
  reference: "REQ-512",
  userId: 7,
  vehicleId: 8,
  addressId: null,
  notes: null,
  status: "pending" as const,
  aiValidationTag: null,
  aiValidationReason: null,
  offersCount: 0,
  expiresAt: "2099-01-01T12:00:00.000Z",
  createdAt: "2026-08-04T10:00:00.000Z",
  updatedAt: "2026-08-04T10:00:00.000Z",
  items: [
    {
      id: 822,
      requestId: 512,
      categoryId: 36,
      quantity: 1,
      condition: "en_stock" as const,
      notes: null,
      createdAt: "2026-08-04T10:00:00.000Z",
      updatedAt: "2026-08-04T10:00:00.000Z",
      categoryTitle: "Amortisseur live",
      categoryTitleAr: "Amortisseur live AR",
      categoryImage: "https://cdn.example/amortisseur.jpg",
    },
    {
      id: 821,
      requestId: 512,
      categoryId: 31,
      quantity: 1,
      condition: "occasion" as const,
      notes: null,
      createdAt: "2026-08-04T10:00:00.000Z",
      updatedAt: "2026-08-04T10:00:00.000Z",
      categoryTitle: "Plaquettes live",
      categoryTitleAr: "Plaquettes live AR",
      categoryImage: "https://cdn.example/plaquettes.jpg",
    },
  ],
};

const sentOffer = {
  id: 901,
  reference: "OFF-901",
  requestId: 501,
  requestItemId: 801,
  condition: "en_stock" as const,
  quantity: 3,
  priceFerrailleur: 345,
  description: "Offre live",
  audioUrl: null,
  availability: "available" as const,
  status: "pending" as const,
  adminNotes: null,
  validatedAt: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  images: ["https://cdn.example/offer.jpg"],
  categoryTitle: "Plaquettes offer live",
  categoryTitleAr: "Plaquettes offer live AR",
  categoryImage: "https://cdn.example/offer-category.jpg",
  ferrailleurName: "Ferrailleur live",
  brandName: null,
  brandNameAr: null,
  vehicle: null,
  paymentStatus: null,
};

const activeOffer = { ...sentOffer, id: 902, reference: "OFF-902", status: "validated" as const, categoryTitle: "Active offer live" };
const acceptedOffer = { ...sentOffer, id: 903, reference: "OFF-903", status: "selected" as const, categoryTitle: "Paid offer live" };
const rejectedOffer = { ...sentOffer, id: 904, reference: "OFF-904", status: "rejected" as const, categoryTitle: "Rejected offer live" };
const shippedOffer = { ...sentOffer, id: 905, reference: "OFF-905", status: "selected" as const, categoryTitle: "Shipped offer live" };

const allOffers = [sentOffer, activeOffer, acceptedOffer, rejectedOffer, shippedOffer];

const partnerOrder = {
  id: 701,
  reference: "CMD-701",
  netTotal: 480,
  status: "confirmed" as const,
  fulfillmentStatus: "preparing" as const,
  notes: null,
  confirmedAt: "2026-08-05T10:00:00.000Z",
  createdAt: "2026-08-05T10:00:00.000Z",
  updatedAt: "2026-08-05T10:00:00.000Z",
  items: [{
    id: 1701,
    orderId: 701,
    offerId: 903,
    productId: null,
    categoryId: 31,
    quantity: 2,
    netAmount: 480,
    status: "confirmed" as const,
    createdAt: "2026-08-05T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
    categoryTitle: "Order line live",
    categoryTitleAr: "Order line live AR",
    purchaseOrder: {
      id: 2701,
      reference: "BC-2701",
      orderItemId: 1701,
      amount: 480,
      trackingNumber: null,
      carrier: null,
      shippingNotes: null,
      status: "preparing" as const,
      sentAt: null,
      shippedAt: null,
      createdAt: "2026-08-05T10:00:00.000Z",
      updatedAt: "2026-08-05T10:00:00.000Z",
    },
  }],
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  await i18n.changeLanguage("fr");
  mockGetStats.mockResolvedValue({ success: true, data: stats });
  mockGetSeries.mockImplementation((period: "1j" | "7j" | "1m" | "6m" | "1a" | "max") =>
    Promise.resolve(series(period)),
  );
  mockGetIncoming.mockResolvedValue({ success: true, data: requests, pagination });
  mockGetOrders.mockResolvedValue({ success: true, data: [partnerOrder], pagination });
  mockGetOffers.mockImplementation((status?: string) => Promise.resolve({
    success: true,
    data: status === undefined
      ? allOffers
      : status === "active"
        ? [activeOffer]
        : status === "accepted"
          ? [acceptedOffer, shippedOffer]
          : status === "sent"
            ? [sentOffer]
            : status === "shipped"
              ? [shippedOffer]
              : [],
    pagination,
  }));
});

it.each([undefined, "shipped"] as const)("aggregates every %s Prestataire offer page before local filtering", async (status) => {
  const firstPath = status ? `/prestataire/offers?status=${status}` : "/prestataire/offers";
  const secondPath = `${firstPath}${status ? "&" : "?"}page=2&perPage=20`;
  mockApiGet
    .mockResolvedValueOnce({ success: true, data: [sentOffer], pagination: { ...pagination, lastPage: 2 } })
    .mockResolvedValueOnce({ success: true, data: [acceptedOffer], pagination: { ...pagination, currentPage: 2, lastPage: 2 } });
  const { getPrestataireOffers: getActualPrestataireOffers } = jest.requireActual<typeof import("@/api/resources/prestataire")>("@/api/resources/prestataire");

  const response = await getActualPrestataireOffers(status);

  expect(mockApiGet).toHaveBeenNthCalledWith(1, firstPath);
  expect(mockApiGet).toHaveBeenNthCalledWith(2, secondPath);
  expect(response.data.map((offer) => offer.id)).toEqual([901, 903]);
});

it("renders every overview metric from the current server series and requests a switched period once", async () => {
  const screen = render(<OverviewScreen />);

  await waitFor(() => expect(mockGetSeries).toHaveBeenCalledWith("7j"));
  // Headline = total of the plotted buckets (601 + 602).
  expect((await screen.findAllByText("1203")).length).toBeGreaterThan(0);
  expect(screen.getByText(i18n.t("partner.overview.dateRangeMetric", { metric: i18n.t("partner.overview.metricSent"), from: "A", to: "B" }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("partner.overview.dateRange"))).toBeNull();
  // Figma has no KPI grid under the chart: the overview reads the series only.
  expect(screen.queryByText(i18n.t("partner.dashboard.receivedCount"))).toBeNull();

  const selections = [
    ["partner.overview.metricReceived", "603"],
    ["partner.overview.metricActive", "803"],
    ["partner.overview.metricAccepted", "1003"],
    ["partner.overview.metricRevenue", "403 MAD"],
    // Running balance: the headline is the latest point, not a sum.
    ["partner.overview.metricPayout", "702 MAD"],
  ] as const;
  let activeLabelKey = "partner.overview.metricSent";
  for (const [labelKey, value] of selections) {
    fireEvent.press(screen.getAllByText(i18n.t(activeLabelKey))[0]);
    fireEvent.press(screen.getAllByText(i18n.t(labelKey))[0]);
    expect(screen.getAllByText(value).length).toBeGreaterThan(0);
    activeLabelKey = labelKey;
  }

  mockGetSeries.mockClear();
  fireEvent.press(screen.getByText(i18n.t("partner.overview.period1m")));
  await waitFor(() => expect(mockGetSeries).toHaveBeenCalledWith("1m"));
  expect(mockGetSeries).toHaveBeenCalledTimes(1);
  expect(mockGetStats).not.toHaveBeenCalled();
});

it("renders the server-ranked top products in the selected overview period", async () => {
  const screen = render(<OverviewScreen />);

  expect(await screen.findByText(i18n.t('partner.overview.topProducts'))).toBeTruthy();
  expect(screen.getByText('Plaquettes live')).toBeTruthy();
  expect(screen.getByText(i18n.t('partner.overview.soldCount', { count: 12 }))).toBeTruthy();
});

it("keeps the overview usable when the series fails and retries the series", async () => {
  mockGetSeries.mockRejectedValueOnce(new Error("series offline"));
  const screen = render(<OverviewScreen />);

  expect(await screen.findByText(i18n.t("partner.overview.seriesLoadError"))).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.overview.seriesRetry") }));

  expect((await screen.findAllByText("1203")).length).toBeGreaterThan(0);
  expect(screen.getByTestId("overview-chart")).toBeTruthy();
  expect(mockGetSeries).toHaveBeenCalledTimes(2);
  expect(mockGetStats).not.toHaveBeenCalled();
});

it("keeps the latest overview period when an older series request resolves last", async () => {
  const oneMonth = deferred<ReturnType<typeof series>>();
  const sixMonths = deferred<ReturnType<typeof series>>();
  mockGetSeries.mockImplementation((period: "1j" | "7j" | "1m" | "6m" | "1a" | "max") => {
    if (period === "1m") return oneMonth.promise;
    if (period === "6m") return sixMonths.promise;
    return Promise.resolve(series(period));
  });
  const screen = render(<OverviewScreen />);
  expect((await screen.findAllByText("1203")).length).toBeGreaterThan(0);

  fireEvent.press(screen.getByText(i18n.t("partner.overview.period1m")));
  fireEvent.press(screen.getByText(i18n.t("partner.overview.period6m")));
  await act(async () => { sixMonths.resolve(series("6m", 1000)); });
  expect((await screen.findAllByText("3203")).length).toBeGreaterThan(0);
  await act(async () => { oneMonth.resolve(series("1m", 2000)); });

  expect(screen.getAllByText("3203").length).toBeGreaterThan(0);
  expect(screen.queryByText("5203")).toBeNull();
});

it("keeps dashboard stats visible when its offer feed fails and refreshes both resources", async () => {
  mockGetOffers.mockRejectedValueOnce(new Error("offers offline"));
  const screen = render(<Dashboard />);

  expect((await screen.findAllByText("106,00 Dhs")).length).toBeGreaterThan(0);
  expect(screen.getByText(i18n.t("partner.dashboard.offersLoadError"))).toBeTruthy();
  fireEvent(screen.UNSAFE_getByType(RefreshControl), "refresh");

  await waitFor(() => expect(mockGetStats).toHaveBeenCalledTimes(2));
  expect(mockGetOffers).toHaveBeenCalledTimes(2);
  expect(mockGetOrders).toHaveBeenCalledTimes(2);
  expect(mockGetIncoming).toHaveBeenCalledTimes(2);
  expect(mockGetSeries).not.toHaveBeenCalled();
});

it("does not present shared offer sections as empty while their feed is still loading", async () => {
  const incoming = deferred<{ success: true; data: typeof requests; pagination: typeof pagination }>();
  mockGetIncoming.mockReturnValueOnce(incoming.promise);
  const screen = render(<Dashboard />);

  await screen.findAllByText("106,00 Dhs");
  expect(screen.queryByText(i18n.t("partner.dashboard.emptyOffers"))).toBeNull();

  await act(async () => incoming.resolve({ success: true, data: requests, pagination }));
  expect(await screen.findByText("Plaquettes live")).toBeTruthy();
});
it("sources dashboard open, sent, and shipment rows from their canonical live feeds", async () => {
  const screen = render(<Dashboard />);

  expect(await screen.findByText("Plaquettes live")).toBeTruthy();
  expect(screen.getByText("Plaquettes offer live")).toBeTruthy();
  // Sent offers show their own reference, never the raw request id.
  expect(screen.getByText(`${i18n.t("partner.offers.card.ref")} OFF-901`)).toBeTruthy();
  expect(screen.queryByText(`${i18n.t("partner.offers.card.ref")} 501`)).toBeNull();
  expect(screen.getByText("Order line live")).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.orders.status.processing"))).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.sent.enAttente"))).toBeTruthy();
  expect(screen.getAllByText(i18n.t("partner.dashboard.quantity", { count: 3 })).length).toBeGreaterThan(0);
  expect(screen.getByText("(2)")).toBeTruthy();
  expect(mockGetIncoming).toHaveBeenCalledTimes(1);
  expect(mockGetOffers).toHaveBeenCalledWith("sent");
  expect(mockGetOffers).not.toHaveBeenCalledWith("active");
  expect(mockGetOrders).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("+35%")).toBeNull();
  expect(screen.queryByText("+13%")).toBeNull();
});

it("renders dashboard sales and trends from the server comparison", async () => {
  mockGetStats.mockResolvedValueOnce({ success: true, data: {
    ...stats,
    comparison: {
      period: '30d', sales: 1350, salesPrev: 1000,
      requestsReceived: 113, requestsReceivedPrev: 100,
      accepted: 40, acceptedPrev: 50,
      offersSent: 80, offersSentPrev: 80,
    },
  } });
  const screen = render(<Dashboard />);

  const sales = `${(1350).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`;
  expect(await screen.findByText(sales)).toBeTruthy();
  expect(screen.getByText("+35%")).toBeTruthy();
  expect(screen.getByText("+13%")).toBeTruthy();
  expect(screen.getByText("-20%")).toBeTruthy();
  expect(screen.getByText("+0%")).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.dashboard.missedCount"))).toBeTruthy();
  expect(mockGetStats).toHaveBeenCalledWith('30d');
  expect(mockGetSeries).not.toHaveBeenCalled();
});

it("does not depend on the overview series for dashboard stat tiles", async () => {
  mockGetSeries.mockRejectedValue(new Error("series offline"));
  const screen = render(<Dashboard />);

  expect((await screen.findAllByText("Plaquettes live")).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("102")).toBeTruthy();
  expect(mockGetSeries).not.toHaveBeenCalled();
});

it("routes every dashboard see-all link and tile action to its Figma target", async () => {
  const screen = render(<Dashboard />);
  await screen.findByText("Plaquettes live");
  const seeAll = (titleKey: string) =>
    screen.getByLabelText(`${i18n.t(titleKey)} — ${i18n.t("partner.dashboard.seeAllOffers")}`);

  fireEvent.press(seeAll("partner.dashboard.openOffers"));
  expect(mockPush).toHaveBeenLastCalledWith("/(prestataire)/offers?view=incoming");
  fireEvent.press(seeAll("partner.dashboard.sentStatus"));
  expect(mockPush).toHaveBeenLastCalledWith("/(prestataire)/offers?view=sent");
  fireEvent.press(seeAll("partner.dashboard.activeOffers"));
  expect(mockPush).toHaveBeenLastCalledWith("/(prestataire)/orders");
  fireEvent.press(seeAll("partner.dashboard.stats30d"));
  expect(mockPush).toHaveBeenLastCalledWith("/(prestataire)/profile/overview");

  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.dashboard.seeMore") }));
  expect(mockPush).toHaveBeenLastCalledWith("/(prestataire)/profile/overview");
  const withdrawButtons = screen.getAllByRole("button", { name: i18n.t("partner.dashboard.retirer") });
  expect(withdrawButtons).toHaveLength(2);
  fireEvent.press(withdrawButtons[1]!);
  expect(mockPush).toHaveBeenLastCalledWith("/(prestataire)/profile/wallet/withdraw");

  fireEvent.press(screen.getByText("Order line live"));
  expect(mockPush).toHaveBeenLastCalledWith("/(prestataire)/orders/701");
});

it("renders a missed sent offer with the Figma label and a disabled details button", async () => {
  mockGetOffers.mockImplementation((status?: string) => Promise.resolve({
    success: true,
    data: status === "sent" ? [{ ...sentOffer, status: "expired" as const, categoryTitle: "Missed offer live" }] : [],
    pagination,
  }));
  const screen = render(<Dashboard />);

  expect(await screen.findByText(i18n.t("partner.sent.offerManquee"))).toBeTruthy();
  const missedDetails = screen.getAllByRole("button", { name: i18n.t("partner.offer.details") })
    .find((node) => node.props.accessibilityState?.disabled === true);
  expect(missedDetails).toBeTruthy();
});

it("searches the fetched incoming list locally, retries, refreshes, and opens the live request id", async () => {
  mockGetIncoming.mockRejectedValueOnce(new Error("offline"));
  const screen = render(<PrestataireSearchScreen />);

  fireEvent.press(await screen.findByText(i18n.t("partner.offers.retry")));
  expect((await screen.findAllByText("Plaquettes live")).length).toBeGreaterThanOrEqual(1);
  expect(mockGetIncoming).toHaveBeenCalledTimes(2);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.search.placeholder")), "REQ-502");
  expect(screen.queryByText("Plaquettes live")).toBeNull();
  expect(screen.getAllByText("Transmission live").length).toBeGreaterThanOrEqual(1);
  expect(mockGetIncoming).toHaveBeenCalledTimes(2);

  fireEvent.press(screen.getByText(i18n.t("partner.offers.card.details")));
  expect(mockPush).toHaveBeenCalledWith("/(prestataire)/offers/502/fill?itemId=802");

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.search.placeholder")), "missing");
  expect(screen.getByText(i18n.t("partner.search.noResults"))).toBeTruthy();

  const list = screen.UNSAFE_getByType(FlatList);
  await act(async () => {
    list.props.onRefresh();
  });
  await waitFor(() => expect(mockGetIncoming).toHaveBeenCalledTimes(3));
});

it("renders one incoming card per item with its brand and filters by brand text on Recherche", async () => {
  mockGetIncoming.mockResolvedValue({ success: true, data: [requestA], pagination });
  const screen = render(<PrestataireSearchScreen />);

  expect(await screen.findByText(i18n.t("requestList.brand", { value: "RIDEX live" }))).toBeTruthy();
  expect(screen.getByText(i18n.t("requestList.brand", { value: "Brembo live" }))).toBeTruthy();
  expect(screen.getAllByText("Disque live")).toHaveLength(3);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.search.placeholder")), "Brembo live");
  expect(screen.queryByText(i18n.t("requestList.brand", { value: "RIDEX live" }))).toBeNull();
  expect(screen.getByText(i18n.t("requestList.brand", { value: "Brembo live" }))).toBeTruthy();
});

it("groups incoming cards under category headings and keeps the category filter scoped to matching items only", async () => {
  mockGetIncoming.mockResolvedValue({ success: true, data: [...requests, requestB], pagination });
  mockParams = { view: "incoming" };
  const screen = render(<PrestataireOffersScreen />);

  expect(await screen.findAllByText("Plaquettes live")).toHaveLength(3);

  fireEvent.press(screen.UNSAFE_getAllByProps({ accessibilityRole: "button" }).find(
    (node) => node.props.accessibilityLabel === i18n.t("partner.offers.filter.title"),
  )!);
  fireEvent.press(screen.getAllByText("Plaquettes live").at(-1)!);
  fireEvent.press(screen.getByText(i18n.t("partner.offers.filter.apply")));

  expect(screen.getAllByText("Plaquettes live")).toHaveLength(3);
  expect(screen.queryByText("Transmission live")).toBeNull();
  expect(screen.queryByText("Amortisseur live")).toBeNull();
});

it("shows one open-offer row per incoming item with its brand on the dashboard", async () => {
  mockGetIncoming.mockResolvedValue({ success: true, data: [requestA], pagination });
  const screen = render(<Dashboard />);

  expect((await screen.findAllByText("Disque live")).length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText(i18n.t("requestList.brand", { value: "RIDEX live" }))).toBeTruthy();
  expect(screen.getByText(i18n.t("requestList.brand", { value: "Brembo live" }))).toBeTruthy();
});

it("filters fetched incoming requests locally and offer cards open returned offer ids", async () => {
  mockParams = { view: "incoming" };
  const incomingScreen = render(<PrestataireOffersScreen />);
  await incomingScreen.findAllByText("Plaquettes live");

  fireEvent.press(incomingScreen.UNSAFE_getAllByProps({ accessibilityRole: "button" }).find(
    (node) => node.props.accessibilityLabel === i18n.t("partner.offers.filter.title"),
  )!);
  fireEvent.press(incomingScreen.getAllByText("Transmission live").at(-1)!);
  fireEvent.press(incomingScreen.getByText(i18n.t("partner.offers.filter.apply")));
  expect(incomingScreen.queryByText("Plaquettes live")).toBeNull();
  expect(incomingScreen.getAllByText("Transmission live")).toHaveLength(2);
  expect(mockGetIncoming).toHaveBeenCalledTimes(1);
  incomingScreen.unmount();

  mockParams = { view: "sent" };
  const sentScreen = render(<PrestataireOffersScreen />);
  expect(await sentScreen.findByText("Plaquettes offer live")).toBeTruthy();
  fireEvent.press(sentScreen.getByText(i18n.t("partner.offers.card.details")));
  expect(mockPush).toHaveBeenCalledWith("/(prestataire)/offers/901");
});

it("passes bundled category images through and mirrors Prestataire cards in Arabic", async () => {
  await i18n.changeLanguage("ar");
  const localImage = 42 as unknown as string;
  const incoming = render(
    <ItemIncomingRequestCard
      request={requests[0]!}
      item={{ ...requests[0]!.items[0]!, categoryImage: localImage }}
    />,
  );

  expect(incoming.UNSAFE_getByType(Image).props.source).toBe(localImage);
  expect(StyleSheet.flatten(incoming.UNSAFE_getAllByType(TouchableOpacity)[0].props.style).flexDirection).toBe("row-reverse");
  expect(StyleSheet.flatten(incoming.getByText("Plaquettes live AR").props.style).textAlign).toBe("right");
  incoming.unmount();

  const offer = render(
    <ItemPartnerOfferCard item={{ ...sentOffer, categoryImage: localImage, shippingEligible: false }} />,
  );
  expect(offer.UNSAFE_getByType(Image).props.source).toBe(localImage);
  expect(StyleSheet.flatten(offer.UNSAFE_getAllByType(TouchableOpacity)[0].props.style).flexDirection).toBe("row-reverse");
});

it("filters incoming requests by category id instead of localized title text", async () => {
  mockGetIncoming.mockResolvedValue({
    success: true,
    data: requests.map((request, index) => ({
      ...request,
      items: request.items.map((item) => ({
        ...item,
        categoryTitle: index === 0 ? "Pièces d'arrêt" : "Boîte live",
      })),
    })),
    pagination,
  });
  mockParams = { view: "incoming" };
  const screen = render(<PrestataireOffersScreen />);
  await screen.findAllByText("Pièces d'arrêt");

  fireEvent.press(screen.getByLabelText(i18n.t("partner.offers.filter.title")));
  const gearboxLabels = screen.getAllByText("Boîte live");
  expect(gearboxLabels).toHaveLength(3);
  fireEvent.press(gearboxLabels.at(-1)!);
  fireEvent.press(screen.getByText(i18n.t("partner.offers.filter.apply")));

  expect(screen.queryByText("Pièces d'arrêt")).toBeNull();
  expect(screen.getAllByText("Boîte live")).toHaveLength(2);
});
it.each(["accepted", "sent"] as const)("maps progress, rejected, and paid filters to fetched offers in the %s view", async (view) => {
  mockParams = { view };
  const screen = render(<PrestataireOffersScreen />);
  await screen.findByText(view === "accepted" ? "Paid offer live" : "Plaquettes offer live");

  // The sheet is multi-select: each press toggles a checkbox, "Appliquer" commits the draft.
  const applyFilter = (...labels: string[]) => {
    fireEvent.press(screen.getByLabelText(i18n.t("partner.offers.filter.title")));
    // The sheet renders last, so its option is the last match ("Rejeté" is also a card status).
    labels.forEach((label) => fireEvent.press(screen.getAllByText(label).at(-1)!));
    fireEvent.press(screen.getByText(i18n.t("partner.offers.filter.apply")));
  };
  const progress = i18n.t("partner.offers.filter.progress");
  const rejected = i18n.t("partner.offers.filter.rejected");
  const payment = i18n.t("partner.offers.filter.payment");

  applyFilter(progress);
  expect(screen.getByText("Active offer live")).toBeTruthy();
  expect(screen.getByText("Plaquettes offer live")).toBeTruthy();
  expect(screen.queryByText("Rejected offer live")).toBeNull();

  applyFilter(rejected);
  expect(screen.getByText("Rejected offer live")).toBeTruthy();
  expect(screen.getByText("Active offer live")).toBeTruthy();
  expect(screen.queryByText("Paid offer live")).toBeNull();

  applyFilter(progress);
  expect(screen.getByText("Rejected offer live")).toBeTruthy();
  expect(screen.queryByText("Active offer live")).toBeNull();

  applyFilter(rejected, payment);
  expect(screen.getByText("Paid offer live")).toBeTruthy();
  expect(screen.getByText("Shipped offer live")).toBeTruthy();
  expect(screen.queryByText("Rejected offer live")).toBeNull();

  fireEvent.press(screen.getByLabelText(i18n.t("partner.offers.filter.title")));
  fireEvent.press(screen.getByText(i18n.t("partner.offers.filter.reset")));
  fireEvent.press(screen.getByText(i18n.t("partner.offers.filter.apply")));
  expect(screen.queryByText("Rejected offer live")).toBeNull();
  expect(mockGetOffers).toHaveBeenCalledWith(undefined);
});

it("discards unapplied filter changes when the sheet is dismissed", async () => {
  mockParams = { view: "sent" };
  const screen = render(<PrestataireOffersScreen />);
  await screen.findByText("Plaquettes offer live");

  fireEvent.press(screen.getByLabelText(i18n.t("partner.offers.filter.title")));
  fireEvent.press(screen.getByText(i18n.t("partner.offers.filter.rejected")));
  expect(screen.getAllByRole("checkbox").filter((node) => node.props.accessibilityState?.checked)).toHaveLength(1);
  const filterSheet = screen.UNSAFE_getAllByType(Modal).find((modal) => modal.props.visible === true)!;
  fireEvent(filterSheet, "requestClose");

  expect(screen.getByText("Plaquettes offer live")).toBeTruthy();
  expect(screen.queryByText("Rejected offer live")).toBeNull();
});

it("uses the live shipped subset to suppress the ship action for an already shipped selected offer", async () => {
  mockParams = { view: "accepted" };
  const screen = render(<PrestataireOffersScreen />);

  expect(await screen.findByText("Shipped offer live")).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.sent.shipped"))).toBeTruthy();
  fireEvent.press(screen.getByText(i18n.t("partner.offers.card.details")));
  expect(mockPush).toHaveBeenCalledWith("/(prestataire)/offers/905");
  expect(mockPush).not.toHaveBeenCalledWith("/(prestataire)/offers/905/ship");
  expect(mockGetOffers).toHaveBeenCalledWith("shipped");
});

it("retries the offers hub and renders empty incoming and offer lists", async () => {
  mockGetIncoming.mockRejectedValueOnce(new Error("offline"));
  const hub = render(<PrestataireOffersScreen />);
  fireEvent.press(await hub.findByText(i18n.t("partner.offers.retry")));
  expect(await hub.findByText(i18n.t("partner.offers.stats.title"))).toBeTruthy();
  expect(mockGetIncoming).toHaveBeenCalledTimes(2);
  hub.unmount();

  mockGetIncoming.mockResolvedValue({ success: true, data: [], pagination });
  mockGetOffers.mockResolvedValue({ success: true, data: [], pagination });
  mockParams = { view: "incoming" };
  const incoming = render(<PrestataireOffersScreen />);
  expect(await incoming.findByText(i18n.t("partner.offers.empty.incoming"))).toBeTruthy();
  incoming.unmount();

  mockParams = { view: "sent" };
  const offers = render(<PrestataireOffersScreen />);
  expect(await offers.findByText(i18n.t("partner.offers.empty.sent"))).toBeTruthy();
});

it("renders live incoming-request titles in Arabic", async () => {
  await i18n.changeLanguage("ar");
  const screen = render(<PrestataireSearchScreen />);

  expect((await screen.findAllByText("Plaquettes live AR")).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Transmission live AR").length).toBeGreaterThanOrEqual(1);
});

it("does not infer a shipped transition from free-text offer notes", async () => {
  mockGetOffers.mockImplementation((status?: string) => Promise.resolve({
    success: true,
    data: status === undefined ? [{ ...sentOffer, adminNotes: "expédié manuellement" }] : [],
    pagination,
  }));
  mockParams = { view: "sent" };
  const screen = render(<PrestataireOffersScreen />);

  expect(await screen.findByText(i18n.t("partner.offerDetail.statusPending"))).toBeTruthy();
  expect(screen.queryByText(i18n.t("partner.sent.shipped"))).toBeNull();
});

it("shows the open-request count and first category on the tools row of the open offers list", async () => {
  mockGetIncoming.mockResolvedValue({ success: true, data: [...requests, requestB], pagination });
  mockParams = { view: "incoming" };
  const screen = render(<PrestataireOffersScreen />);

  expect(await screen.findByText("(4)")).toBeTruthy();
  // requestB (newest) comes first: its first item heads the list on the tools row.
  expect(screen.getAllByText("Amortisseur live")).toHaveLength(2);
  expect(screen.getByLabelText(i18n.t("partner.offers.sortAscending"))).toBeTruthy();
});

it("renders the hub with Figma counters, period stats and the show-more shortcut", async () => {
  mockGetIncoming.mockResolvedValue({ success: true, data: [...requests, requestB], pagination });
  const screen = render(<PrestataireOffersScreen />);

  expect(await screen.findByText("(4)")).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.offers.title"))).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByText("(4)").props.style).color).toBe("#DC2626");
  expect(StyleSheet.flatten(screen.getByText("(1)").props.style).color).toBe("#16A34A");
  expect(screen.getByText(i18n.t("partner.offers.stats.periodDays", { count: 30 }))).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.offers.stats.missed"))).toBeTruthy();

  fireEvent.press(screen.getByText(i18n.t("partner.offers.showMore")));
  expect(mockPush).toHaveBeenCalledWith("/(prestataire)/profile/overview");

  fireEvent.press(screen.getByRole("button", { name: `${i18n.t("partner.offers.openTitle")} — ${i18n.t("partner.offers.showAll")}` }));
  expect(mockSetParams).toHaveBeenCalledWith({ view: "incoming", state: undefined });
});

it("prefixes sent offers with their creation time and filters them by month", async () => {
  const septemberOffer = { ...sentOffer, id: 906, reference: "OFF-906", categoryTitle: "September offer live", createdAt: "2026-09-02T08:05:00.000Z" };
  mockGetOffers.mockImplementation((status?: string) => Promise.resolve({
    success: true,
    data: status === undefined ? [sentOffer, septemberOffer] : [],
    pagination,
  }));
  mockParams = { view: "sent" };
  const screen = render(<PrestataireOffersScreen />);
  await screen.findByText("September offer live");

  const created = new Date(sentOffer.createdAt);
  const time = `${String(created.getHours()).padStart(2, "0")}h${String(created.getMinutes()).padStart(2, "0")}`;
  expect(screen.getByText(`${time} - ${i18n.t("partner.offers.card.ref")} OFF-901`)).toBeTruthy();
  expect(screen.getAllByText(i18n.t("partner.offerDetail.statusPending"))).toHaveLength(2);

  const august = new Date(2026, 7, 1).toLocaleDateString("fr-MA", { month: "long", year: "numeric" });
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.offers.allMonths") }));
  fireEvent.press(screen.getByRole("button", { name: august.charAt(0).toLocaleUpperCase("fr-MA") + august.slice(1) }));

  expect(screen.getByText("Plaquettes offer live")).toBeTruthy();
  expect(screen.queryByText("September offer live")).toBeNull();
});

it("shows accepted offers as Préparer la collecte with an Action shortcut and searches them locally", async () => {
  mockParams = { view: "accepted" };
  const screen = render(<PrestataireOffersScreen />);
  await screen.findByText("Paid offer live");

  expect(screen.getByText(i18n.t("partner.offers.prepareCollect"))).toBeTruthy();
  fireEvent.press(screen.getByText(i18n.t("partner.offers.action")));
  expect(mockPush).toHaveBeenCalledWith("/(prestataire)/offers/903/ship");

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.history.searchPlaceholder")), "OFF-905");
  expect(screen.queryByText("Paid offer live")).toBeNull();
  expect(screen.getByText("Shipped offer live")).toBeTruthy();
});

it("prefixes Arabic offer statuses and formats the Arabic countdown", async () => {
  await i18n.changeLanguage("ar");
  const soon = new Date(Date.now() + 50 * 60_000 + 30_000).toISOString();
  const incoming = render(<ItemIncomingRequestCard request={{ ...requests[0]!, expiresAt: soon }} item={requests[0]!.items[0]!} />);
  expect(incoming.getByText("0 س 50 دقيقة متبقية")).toBeTruthy();
  incoming.unmount();

  const offer = render(<ItemPartnerOfferCard item={{ ...rejectedOffer, shippingEligible: false }} />);
  expect(offer.getByText(`${i18n.t("partner.offerDetail.statusLabel")} ${i18n.t("partner.offers.status.rejected")}`)).toBeTruthy();
  // Arabic cards use "HH:MM" (the "h" hour mark is French) before the ref.
  const created = new Date(rejectedOffer.createdAt);
  const time = `${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}`;
  expect(offer.getByText(`${time} - ${i18n.t("partner.offers.card.ref")} OFF-904`)).toBeTruthy();
});

it("shows long incoming deadlines in days and hours", async () => {
  const later = new Date(Date.now() + (27 * 24 + 12) * 3_600_000 + 49 * 60_000 + 30_000).toISOString();
  const french = render(<ItemIncomingRequestCard request={{ ...requests[0]!, expiresAt: later }} item={requests[0]!.items[0]!} />);
  expect(french.getByText("27j 12h restante")).toBeTruthy();
  french.unmount();

  await i18n.changeLanguage("ar");
  const arabic = render(<ItemIncomingRequestCard request={{ ...requests[0]!, expiresAt: later }} item={requests[0]!.items[0]!} />);
  expect(arabic.getByText("27 يوم و 12 ساعة متبقية")).toBeTruthy();
});

it("leaves the Chercher and Liste tab roots for the Accueil tab without popping tab history", async () => {
  const search = render(<PrestataireSearchScreen />);
  await search.findAllByText("Plaquettes live");
  fireEvent.press(search.getByRole("button", { name: i18n.t("partner.offers.back") }));
  expect(mockNavigate).toHaveBeenCalledWith("/(prestataire)/dashboard");
  search.unmount();

  const hub = render(<PrestataireOffersScreen />);
  await hub.findByText(i18n.t("partner.offers.title"));
  fireEvent.press(hub.getByRole("button", { name: i18n.t("partner.offers.back") }));
  expect(mockNavigate).toHaveBeenCalledTimes(2);
  expect(mockNavigate).toHaveBeenLastCalledWith("/(prestataire)/dashboard");
  expect(mockBack).not.toHaveBeenCalled();
});
