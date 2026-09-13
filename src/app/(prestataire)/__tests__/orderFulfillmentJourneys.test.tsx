import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import i18n from "@/localization/i18n";
import { ApiClientError } from "@/api/types";
import {
  acknowledgePurchaseOrder,
  getPrestataireOffer,
  getPrestataireOffers,
  getPrestataireOrder,
  getPrestataireOrders,
  preparePurchaseOrder,
  shipPurchaseOrder,
} from "@/api/resources/prestataire";
import { formatPartnerDateTime } from "@/components/screens/prestataire/PartnerDetailBlocks";
import { orderStatusLabelKey } from "@/helpers/partnerStatus";
import type { PrestataireOffer } from "@/interfaces/Offer";
import type {
  PrestataireOrder,
  PrestatairePurchaseOrder,
  PurchaseOrderStatus,
} from "@/interfaces/Order";
import OrdersScreen from "../orders";
import OrderDetailScreen from "../orders/[orderId]";
import OrdersHistoryScreen from "../profile/orders-history";

const mockPush = jest.fn();
let mockParams: Record<string, string | undefined> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
    Tabs: { Screen: () => null },
  };
});
jest.mock("@/components/common/Screen", () => {
  const React = require("react");
  const { View } = require("react-native");
  function MockScreen({ children }: { children?: React.ReactNode }) {
    return React.createElement(View, null, children);
  }
  return Object.assign(MockScreen, { Screen: MockScreen });
});
jest.mock("@/components/common/CustomHeader", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockHeader({ title }: { title: string }) {
    return React.createElement(Text, null, title);
  };
});
jest.mock("@/components/common/AudioPlayer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAudioPlayer() { return React.createElement(View, { testID: "audio-player" }); };
});
jest.mock("@/components/common/ImageSlider", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockImageSlider() { return React.createElement(View, { testID: "image-slider" }); };
});
jest.mock("@/components/screens/prestataire/PartnerHistoryToolbar", () => {
  const React = require("react");
  const { TextInput } = require("react-native");
  return function MockToolbar({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
    return React.createElement(TextInput, { value: query, onChangeText: onQueryChange, testID: "history-search" });
  };
});
jest.mock("@/components/common/Button", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  const { useTranslation } = require("react-i18next");
  function MockButton({ title, onPress, disabled }: { title?: string; onPress?: () => void; disabled?: boolean }) {
    const { t } = useTranslation();
    const label = title ? t(title) : "button";
    return React.createElement(View, {
      accessible: true,
      accessibilityRole: "button",
      accessibilityLabel: label,
      accessibilityState: { disabled },
      onPress: disabled ? undefined : onPress,
    }, React.createElement(Text, null, label));
  }
  return Object.assign(MockButton, { Button: MockButton });
});
jest.mock("@/api/resources/prestataire", () => ({
  acknowledgePurchaseOrder: jest.fn(),
  getPrestataireOffer: jest.fn(),
  getPrestataireOffers: jest.fn(),
  getPrestataireOrder: jest.fn(),
  getPrestataireOrders: jest.fn(),
  preparePurchaseOrder: jest.fn(),
  shipPurchaseOrder: jest.fn(),
}));

const mockAcknowledge = acknowledgePurchaseOrder as jest.MockedFunction<typeof acknowledgePurchaseOrder>;
const mockGetOffer = getPrestataireOffer as jest.MockedFunction<typeof getPrestataireOffer>;
const mockGetOffers = getPrestataireOffers as jest.MockedFunction<typeof getPrestataireOffers>;
const mockGetOrder = getPrestataireOrder as jest.MockedFunction<typeof getPrestataireOrder>;
const mockGetOrders = getPrestataireOrders as jest.MockedFunction<typeof getPrestataireOrders>;
const mockPrepare = preparePurchaseOrder as jest.MockedFunction<typeof preparePurchaseOrder>;
const mockShipPurchaseOrder = shipPurchaseOrder as jest.MockedFunction<typeof shipPurchaseOrder>;

const pagination = { currentPage: 1, lastPage: 1, perPage: 20, total: 1, from: 1, to: 1 };

function purchaseOrder(status: PurchaseOrderStatus): PrestatairePurchaseOrder {
  return {
    id: 51,
    reference: "BC-51",
    orderItemId: 71,
    amount: 73.41,
    trackingNumber: status === "shipped" ? "TRACK-42" : null,
    carrier: status === "shipped" ? "Amana" : null,
    shippingNotes: status === "shipped" ? "Fragile" : null,
    status,
    sentAt: "2026-08-01T10:00:00.000Z",
    shippedAt: status === "shipped" ? "2026-08-02T10:00:00.000Z" : null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  };
}

function order(status: PurchaseOrderStatus = "sent", id = 31, createdAt = "2026-08-01T10:00:00.000Z"): PrestataireOrder {
  return {
    id,
    reference: `ORD-${id}`,
    netTotal: 73.41,
    status: status === "shipped" ? "processing" : "confirmed",
    fulfillmentStatus: status,
    notes: "Remarque commande",
    confirmedAt: createdAt,
    createdAt,
    updatedAt: "2026-08-02T10:00:00.000Z",
    items: [{
      id: 71,
      orderId: id,
      offerId: 401,
      productId: null,
      categoryId: 8,
      quantity: 1,
      netAmount: 73.41,
      status: status === "shipped" ? "shipped" : "confirmed",
      createdAt,
      updatedAt: "2026-08-02T10:00:00.000Z",
      categoryTitle: "Freins",
      categoryTitleAr: "الفرامل",
      images: ["https://cdn.example/order-line.jpg"],
      vehicle: { brandName: "BMW", modelName: "X5 (E53)", motorisation: "4.8 Essence", year: 2004 },
      paymentStatus: "completed",
      purchaseOrder: purchaseOrder(status),
    }],
  };
}

const linkedOffer = {
  id: 401,
  reference: "OFF-401",
  requestId: 33,
  requestItemId: 8,
  condition: "occasion",
  quantity: 1,
  priceFerrailleur: 78.1,
  description: "Remarque offre",
  audioUrl: "https://cdn.example/note.m4a",
  availability: "available",
  status: "selected",
  adminNotes: null,
  validatedAt: "2026-08-01T10:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  images: ["https://cdn.example/offer.jpg"],
  categoryTitle: "Freins",
  categoryTitleAr: "الفرامل",
  categoryImage: null,
  ferrailleurName: "Garage",
  brandName: null,
  brandNameAr: null,
  vehicle: { brandName: "BMW", modelName: "X5 (E53)", motorisation: "4.8 Essence", year: 2004 },
  paymentStatus: "completed",
  shippingEligible: true,
} satisfies PrestataireOffer;

const page = (items: PrestataireOrder[]) => ({ success: true as const, data: items, pagination });
const response = (item: PrestataireOrder) => ({ success: true as const, data: item });
const poResponse = (item: PrestatairePurchaseOrder) => ({ success: true as const, data: item });
const cardRefs = (view: ReturnType<typeof render>) =>
  view.getAllByText(/^Ref: ORD-/).map((node) => node.props.children as string);

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  await i18n.changeLanguage("fr");
  mockGetOrders.mockResolvedValue(page([order()]));
  mockGetOrder.mockResolvedValue(response(order()));
  mockGetOffer.mockRejectedValue(new ApiClientError("Not found", 404));
  mockGetOffers.mockResolvedValue({ success: true, data: [], pagination });
  mockAcknowledge.mockResolvedValue(poResponse(purchaseOrder("acknowledged")));
  mockPrepare.mockResolvedValue(poResponse(purchaseOrder("preparing")));
  mockShipPurchaseOrder.mockResolvedValue(poResponse(purchaseOrder("shipped")));
});

it("renders the non-derivable server net in list and history", async () => {
  const list = render(<OrdersScreen />);
  await waitFor(() => expect(list.getByText(/73,41/)).toBeTruthy());
  expect(list.queryByText(/88,68/)).toBeNull();
  list.unmount();

  const history = render(<OrdersHistoryScreen />);
  await waitFor(() => expect(history.getByText(/73,41/)).toBeTruthy());
  expect(mockGetOrders).toHaveBeenLastCalledWith();
});

it("renders one Figma card per owned line with helper status, green counter, and detail navigation", async () => {
  mockGetOrders.mockResolvedValue(page([order("ready")]));
  const view = render(<OrdersScreen />);

  expect(await view.findByText("Ref: ORD-31")).toBeTruthy();
  expect(view.getByText("Freins")).toBeTruthy();
  expect(view.getByText(i18n.t(orderStatusLabelKey("ready")))).toBeTruthy();
  expect(view.getByText(i18n.t("partner.offers.quantity", { count: 1 }))).toBeTruthy();
  expect(view.getByText("(1)")).toBeTruthy();
  expect(view.queryByText(i18n.t("partner.orders.tabs.accepted"))).toBeNull();
  expect(mockGetOrders).toHaveBeenCalledWith();

  fireEvent.press(view.getByLabelText(`${i18n.t("partner.orders.details")} ORD-31`));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(prestataire)/orders/31",
    params: { itemId: "71" },
  });
});

it("sorts by date and filters lines by Figma status", async () => {
  mockGetOrders.mockResolvedValue(page([
    order("sent", 31, "2026-08-01T10:00:00.000Z"),
    order("shipped", 32, "2026-08-03T10:00:00.000Z"),
  ]));
  const view = render(<OrdersScreen />);

  await waitFor(() => expect(cardRefs(view)).toEqual(["Ref: ORD-32", "Ref: ORD-31"]));
  fireEvent.press(view.getByLabelText(i18n.t("partner.offers.sortAscending")));
  expect(cardRefs(view)).toEqual(["Ref: ORD-31", "Ref: ORD-32"]);

  fireEvent.press(view.getByLabelText(i18n.t("partner.offers.filter.title")));
  fireEvent.press(view.getByRole("checkbox", { name: i18n.t(orderStatusLabelKey("shipped")) }));
  fireEvent.press(view.getByText(i18n.t("partner.offers.filter.apply")));
  expect(cardRefs(view)).toEqual(["Ref: ORD-32"]);
  expect(view.getByText("(1)")).toBeTruthy();

  fireEvent.press(view.getByLabelText(i18n.t("partner.offers.filter.title")));
  fireEvent.press(view.getByText(i18n.t("partner.offers.filter.reset")));
  expect(cardRefs(view)).toEqual(["Ref: ORD-31", "Ref: ORD-32"]);
});

it("preselects the status filter from the route state", async () => {
  mockParams = { state: "shipped" };
  mockGetOrders.mockResolvedValue(page([order("sent", 31), order("shipped", 32)]));
  const view = render(<OrdersScreen />);

  await waitFor(() => expect(cardRefs(view)).toEqual(["Ref: ORD-32"]));
});

it("ignores a stale list response after the screen loses focus", async () => {
  let resolveFirst!: (value: ReturnType<typeof page>) => void;
  mockGetOrders.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
  const view = render(<OrdersScreen />);
  view.unmount();

  await act(async () => resolveFirst(page([order("sent", 31)])));
  expect(mockGetOrders).toHaveBeenCalledTimes(1);
});

it("acknowledges, prepares, and ships the owned purchase-order line", async () => {
  mockParams = { orderId: "31" };
  const view = render(<OrderDetailScreen />);
  const acknowledge = await view.findByLabelText("Accuser réception");
  fireEvent.press(acknowledge);
  fireEvent.press(acknowledge);
  await waitFor(() => expect(mockAcknowledge).toHaveBeenCalledTimes(1));

  fireEvent.press(await view.findByLabelText("Préparer la commande"));
  await waitFor(() => expect(mockPrepare).toHaveBeenCalledWith(51));

  const ship = await view.findByLabelText(i18n.t("partner.ship.readyCta"));
  expect(view.getByText(`${i18n.t("partner.offerDetail.ref")} BC-51`)).toBeTruthy();
  fireEvent.press(ship);
  expect(mockShipPurchaseOrder).not.toHaveBeenCalled();
  expect(view.getByText("Le numéro de référence est obligatoire")).toBeTruthy();
  fireEvent.changeText(await view.findByLabelText("Numéro de référence"), "TRACK-PO-51");
  fireEvent.press(view.getByLabelText(i18n.t("partner.ship.readyCta")));
  await waitFor(() => expect(mockShipPurchaseOrder).toHaveBeenCalledWith(51, {
    trackingNumber: "TRACK-PO-51",
  }));
  expect(await view.findByText("TRACK-42")).toBeTruthy();
  expect(view.queryByLabelText(i18n.t("partner.ship.readyCta"))).toBeNull();
});

it("ships a product-backed line through its purchase order without fabricating an offer id", async () => {
  mockParams = { orderId: "31" };
  const productOrder = order("preparing");
  productOrder.items[0] = { ...productOrder.items[0]!, offerId: null, productId: 909 };
  mockGetOrder.mockResolvedValue(response(productOrder));
  const view = render(<OrderDetailScreen />);

  fireEvent.changeText(await view.findByLabelText("Numéro de référence"), "PRODUCT-TRACK");
  fireEvent.press(view.getByLabelText(i18n.t("partner.ship.readyCta")));
  await waitFor(() => expect(mockShipPurchaseOrder).toHaveBeenCalledWith(51, {
    trackingNumber: "PRODUCT-TRACK",
  }));
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockGetOffer).not.toHaveBeenCalled();
});

it("shows the Figma shipped block with tracking and keeps order notes separate", async () => {
  mockParams = { orderId: "31" };
  mockGetOrder.mockResolvedValue(response(order("shipped")));
  const view = render(<OrderDetailScreen />);

  await waitFor(() => expect(view.getByText("TRACK-42")).toBeTruthy());
  expect(view.getByText(i18n.t(orderStatusLabelKey("shipped")))).toBeTruthy();
  expect(view.getByText(i18n.t("partner.orders.shippedAt"))).toBeTruthy();
  expect(view.getByText(formatPartnerDateTime("2026-08-02T10:00:00.000Z"))).toBeTruthy();
  expect(view.getByText("Remarque commande")).toBeTruthy();
  expect(view.getByText(`73,41 ${i18n.t("partner.offerDetail.priceTtc")}`)).toBeTruthy();
  expect(view.queryByLabelText(i18n.t("partner.ship.readyCta"))).toBeNull();
  expect(view.queryByTestId("stepper")).toBeNull();
  expect(view.queryByText(i18n.t("partner.orders.parts"))).toBeNull();
});

it("uses order-line photos and vehicle while enriching remarks and audio from the linked offer", async () => {
  mockParams = { orderId: "31" };
  mockGetOrder.mockResolvedValue(response(order("shipped")));
  mockGetOffer.mockResolvedValue({ success: true, data: linkedOffer });
  const view = render(<OrderDetailScreen />);

  expect(await view.findByTestId("image-slider")).toBeTruthy();
  await waitFor(() => expect(mockGetOffer).toHaveBeenCalledWith(401));
  expect(view.getByText("Ref: ORD-31")).toBeTruthy();
  expect(await view.findByText("Remarque offre")).toBeTruthy();
  expect(view.getByText("BMW X5 (E53) 4.8 Essence 2004")).toBeTruthy();
  expect(view.getByTestId("audio-player")).toBeTruthy();
  expect(view.getByText(`${i18n.t("partner.offerDetail.condition")} ${i18n.t("partner.fill.conditionOccasion")}`)).toBeTruthy();
});

it("focuses the requested line of a multi-line order and switches parts", async () => {
  mockParams = { orderId: "31", itemId: "72" };
  const multi = order("sent");
  multi.items.push({
    ...multi.items[0]!,
    id: 72,
    offerId: null,
    categoryTitle: "Disques",
    categoryTitleAr: "الأقراص",
    quantity: 2,
    purchaseOrder: { ...purchaseOrder("shipped"), id: 52, reference: "BC-52", orderItemId: 72 },
  });
  mockGetOrder.mockResolvedValue(response(multi));
  const view = render(<OrderDetailScreen />);

  expect(await view.findByText("TRACK-42")).toBeTruthy();
  expect(view.queryByLabelText("Accuser réception")).toBeNull();

  fireEvent.press(view.getByRole("tab", { name: "Freins" }));
  expect(await view.findByLabelText("Accuser réception")).toBeTruthy();
});

it("surfaces transition conflicts and permits a retry", async () => {
  mockParams = { orderId: "31" };
  mockAcknowledge
    .mockRejectedValueOnce(new ApiClientError("Invalid transition", 409))
    .mockResolvedValueOnce(poResponse(purchaseOrder("acknowledged")));
  const view = render(<OrderDetailScreen />);

  fireEvent.press(await view.findByLabelText("Accuser réception"));
  await waitFor(() => expect(view.getByText("Cette commande a changé d’état. Actualisez et réessayez.")).toBeTruthy());
  fireEvent.press(view.getByLabelText("Accuser réception"));
  await waitFor(() => expect(mockAcknowledge).toHaveBeenCalledTimes(2));
});

it("rejects an invalid deep-linked order id without an API request", async () => {
  mockParams = { orderId: "not-a-number" };
  const view = render(<OrderDetailScreen />);

  await waitFor(() => expect(view.getByText("Commande introuvable")).toBeTruthy());
  expect(mockGetOrder).not.toHaveBeenCalled();
});

it("renders the list and fulfillment action with Arabic labels", async () => {
  await i18n.changeLanguage("ar");
  const list = render(<OrdersScreen />);
  expect(await list.findByText(`${i18n.t("partner.offerDetail.statusLabel")} ${i18n.t(orderStatusLabelKey("sent"))}`)).toBeTruthy();
  expect(list.getByText("الفرامل")).toBeTruthy();
  expect(list.getByText(i18n.t("partner.orders.details"))).toBeTruthy();
  list.unmount();

  mockParams = { orderId: "31" };
  const detail = render(<OrderDetailScreen />);
  expect(await detail.findByText("الفرامل")).toBeTruthy();
  expect(detail.getByLabelText("تأكيد الاستلام")).toBeTruthy();
});

it("recovers from a list network failure into the localized empty state", async () => {
  mockGetOrders
    .mockRejectedValueOnce(new ApiClientError("Network failed", null))
    .mockResolvedValueOnce(page([]));
  const view = render(<OrdersScreen />);

  await waitFor(() => expect(view.getByText("Impossible de charger les commandes")).toBeTruthy());
  fireEvent.press(view.getByLabelText("Réessayer"));
  await waitFor(() => expect(view.getByText(i18n.t("partner.orders.empty.all"))).toBeTruthy());
});
