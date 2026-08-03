import React from "react";
import { FlatList, Image, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
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
const mockRouter = { push: mockPush, setParams: mockSetParams, back: mockBack };
let mockParams: Record<string, string | undefined> = {};

const mockGetStats = jest.fn();
const mockGetSeries = jest.fn();
const mockGetIncoming = jest.fn();
const mockGetOffers = jest.fn();
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
  pendingPayout: 106,
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
};

const activeOffer = { ...sentOffer, id: 902, reference: "OFF-902", status: "validated" as const, categoryTitle: "Active offer live" };
const acceptedOffer = { ...sentOffer, id: 903, reference: "OFF-903", status: "selected" as const, categoryTitle: "Paid offer live" };
const rejectedOffer = { ...sentOffer, id: 904, reference: "OFF-904", status: "rejected" as const, categoryTitle: "Rejected offer live" };
const shippedOffer = { ...sentOffer, id: 905, reference: "OFF-905", status: "selected" as const, categoryTitle: "Shipped offer live" };

const allOffers = [sentOffer, activeOffer, acceptedOffer, rejectedOffer, shippedOffer];

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  await i18n.changeLanguage("fr");
  mockGetStats.mockResolvedValue({ success: true, data: stats });
  mockGetSeries.mockImplementation((period: "1j" | "7j" | "1m" | "6m" | "1a" | "max") =>
    Promise.resolve(series(period)),
  );
  mockGetIncoming.mockResolvedValue({ success: true, data: requests, pagination });
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
  expect((await screen.findAllByText("602")).length).toBeGreaterThan(0);

  const selections = [
    ["partner.overview.metricReceived", "302"],
    ["partner.overview.metricActive", "402"],
    ["partner.overview.metricAccepted", "502"],
    ["partner.overview.metricRevenue", "202 MAD"],
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
  expect(mockGetStats).toHaveBeenCalledTimes(1);
});

it("keeps overview stats usable when the series fails and retries only the series", async () => {
  mockGetSeries.mockRejectedValueOnce(new Error("series offline"));
  const screen = render(<OverviewScreen />);

  expect(await screen.findByText("102")).toBeTruthy();
  const retry = screen.getByRole("button", { name: i18n.t("partner.overview.seriesRetry") });
  mockGetStats.mockClear();
  fireEvent.press(retry);

  expect((await screen.findAllByText("602")).length).toBeGreaterThan(0);
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
  expect((await screen.findAllByText("602")).length).toBeGreaterThan(0);

  fireEvent.press(screen.getByText(i18n.t("partner.overview.period1m")));
  fireEvent.press(screen.getByText(i18n.t("partner.overview.period6m")));
  await act(async () => { sixMonths.resolve(series("6m", 1000)); });
  expect((await screen.findAllByText("1602")).length).toBeGreaterThan(0);
  await act(async () => { oneMonth.resolve(series("1m", 2000)); });

  expect(screen.getAllByText("1602").length).toBeGreaterThan(0);
  expect(screen.queryByText("2602")).toBeNull();
});

it("keeps dashboard stats visible when its offer feed fails and refreshes both resources", async () => {
  mockGetOffers.mockRejectedValueOnce(new Error("offers offline"));
  const screen = render(<Dashboard />);

  expect((await screen.findAllByText("106,00 Dhs")).length).toBeGreaterThan(0);
  expect(screen.getByText(i18n.t("partner.dashboard.offersLoadError"))).toBeTruthy();
  fireEvent(screen.UNSAFE_getByType(RefreshControl), "refresh");

  await waitFor(() => expect(mockGetStats).toHaveBeenCalledTimes(2));
  expect(mockGetOffers).toHaveBeenCalledTimes(4);
  expect(mockGetIncoming).toHaveBeenCalledTimes(2);
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
it("sources dashboard open, sent, and active rows from their canonical live feeds", async () => {
  const screen = render(<Dashboard />);

  expect(await screen.findByText("Plaquettes live")).toBeTruthy();
  expect(screen.getByText("Plaquettes offer live")).toBeTruthy();
  expect(screen.getByText("Active offer live")).toBeTruthy();
  expect(screen.getAllByText(i18n.t("partner.dashboard.quantity", { count: 3 })).length).toBeGreaterThan(0);
  expect(mockGetIncoming).toHaveBeenCalledTimes(1);
  expect(mockGetOffers).toHaveBeenCalledWith("sent");
  expect(mockGetOffers).toHaveBeenCalledWith("active");
  expect(screen.queryByText("+35%")).toBeNull();
  expect(screen.queryByText("+13%")).toBeNull();
});

it("searches the fetched incoming list locally, retries, refreshes, and opens the live request id", async () => {
  mockGetIncoming.mockRejectedValueOnce(new Error("offline"));
  const screen = render(<PrestataireSearchScreen />);

  fireEvent.press(await screen.findByText(i18n.t("partner.offers.retry")));
  expect(await screen.findByText("Plaquettes live")).toBeTruthy();
  expect(mockGetIncoming).toHaveBeenCalledTimes(2);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.search.placeholder")), "REQ-502");
  expect(screen.queryByText("Plaquettes live")).toBeNull();
  expect(screen.getByText("Transmission live")).toBeTruthy();
  expect(mockGetIncoming).toHaveBeenCalledTimes(2);

  fireEvent.press(screen.getByText(i18n.t("partner.offers.card.details")));
  expect(mockPush).toHaveBeenCalledWith("/(prestataire)/offers/502/fill");

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.search.placeholder")), "missing");
  expect(screen.getByText(i18n.t("partner.search.noResults"))).toBeTruthy();

  const list = screen.UNSAFE_getByType(FlatList);
  await act(async () => {
    list.props.onRefresh();
  });
  await waitFor(() => expect(mockGetIncoming).toHaveBeenCalledTimes(3));
});

it("filters fetched incoming requests locally and offer cards open returned offer ids", async () => {
  mockParams = { view: "incoming" };
  const incomingScreen = render(<PrestataireOffersScreen />);
  await incomingScreen.findByText("Plaquettes live");

  fireEvent.press(incomingScreen.UNSAFE_getAllByProps({ accessibilityRole: "button" }).find(
    (node) => node.props.accessibilityLabel === i18n.t("partner.offers.filter.title"),
  )!);
  fireEvent.press(incomingScreen.getAllByText("Transmission live").at(-1)!);
  fireEvent.press(incomingScreen.getByText(i18n.t("partner.offers.filter.apply")));
  expect(incomingScreen.queryByText("Plaquettes live")).toBeNull();
  expect(incomingScreen.getByText("Transmission live")).toBeTruthy();
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
      item={{ ...requests[0]!, items: [{ ...requests[0]!.items[0]!, categoryImage: localImage }] }}
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
  await screen.findByText("Pièces d'arrêt");

  fireEvent.press(screen.getByLabelText(i18n.t("partner.offers.filter.title")));
  const gearboxLabels = screen.getAllByText("Boîte live");
  expect(gearboxLabels).toHaveLength(2);
  fireEvent.press(gearboxLabels[1]);
  fireEvent.press(screen.getByText(i18n.t("partner.offers.filter.apply")));

  expect(screen.queryByText("Pièces d'arrêt")).toBeNull();
  expect(screen.getByText("Boîte live")).toBeTruthy();
});
it.each(["accepted", "sent"] as const)("maps progress, rejected, and paid filters to fetched offers in the %s view", async (view) => {
  mockParams = { view };
  const screen = render(<PrestataireOffersScreen />);
  await screen.findByText(view === "accepted" ? "Paid offer live" : "Plaquettes offer live");

  const applyFilter = (label: string) => {
    fireEvent.press(screen.getByLabelText(i18n.t("partner.offers.filter.title")));
    fireEvent.press(screen.getByText(label));
    fireEvent.press(screen.getByText(i18n.t("partner.offers.filter.apply")));
  };

  applyFilter(i18n.t("partner.offers.filter.progress"));
  expect(screen.getByText("Active offer live")).toBeTruthy();
  expect(screen.getByText("Plaquettes offer live")).toBeTruthy();
  expect(screen.queryByText("Rejected offer live")).toBeNull();

  applyFilter(i18n.t("partner.offers.filter.rejected"));
  expect(screen.getByText("Rejected offer live")).toBeTruthy();
  expect(screen.queryByText("Active offer live")).toBeNull();

  applyFilter(i18n.t("partner.offers.filter.payment"));
  expect(screen.getByText("Paid offer live")).toBeTruthy();
  expect(screen.getByText("Shipped offer live")).toBeTruthy();
  expect(mockGetOffers).toHaveBeenCalledWith(undefined);
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

  expect(await screen.findByText("Plaquettes live AR")).toBeTruthy();
  expect(screen.getByText("Transmission live AR")).toBeTruthy();
});

it("does not infer a shipped transition from free-text offer notes", async () => {
  mockGetOffers.mockImplementation((status?: string) => Promise.resolve({
    success: true,
    data: status === undefined ? [{ ...sentOffer, adminNotes: "expédié manuellement" }] : [],
    pagination,
  }));
  mockParams = { view: "sent" };
  const screen = render(<PrestataireOffersScreen />);

  expect(await screen.findByText(i18n.t("partner.offer.statusPending"))).toBeTruthy();
  expect(screen.queryByText(i18n.t("partner.sent.shipped"))).toBeNull();
});
