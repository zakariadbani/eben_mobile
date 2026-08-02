import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import i18n from "@/localization/i18n";
import { ApiClientError } from "@/api/types";
import {
  acknowledgePurchaseOrder,
  getPrestataireOrder,
  getPrestataireOrders,
  preparePurchaseOrder,
  shipPurchaseOrder,
} from "@/api/resources/prestataire";
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
jest.mock("@/components/screens/shared/app/ProgressStepperComponent", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockStepper() { return React.createElement(View, { testID: "stepper" }); };
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
  function MockButton({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) {
    const { t } = useTranslation();
    const label = t(title);
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
  getPrestataireOrder: jest.fn(),
  getPrestataireOrders: jest.fn(),
  preparePurchaseOrder: jest.fn(),
  shipPurchaseOrder: jest.fn(),
}));

const mockAcknowledge = acknowledgePurchaseOrder as jest.MockedFunction<typeof acknowledgePurchaseOrder>;
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

function order(status: PurchaseOrderStatus = "sent", id = 31): PrestataireOrder {
  return {
    id,
    reference: `ORD-${id}`,
    netTotal: 73.41,
    status: status === "shipped" ? "processing" : "confirmed",
    fulfillmentStatus: status,
    notes: "Remarque commande",
    confirmedAt: "2026-08-01T10:00:00.000Z",
    createdAt: "2026-08-01T10:00:00.000Z",
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
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-02T10:00:00.000Z",
      categoryTitle: "Freins",
      categoryTitleAr: "الفرامل",
      purchaseOrder: purchaseOrder(status),
    }],
  };
}

const page = (items: PrestataireOrder[]) => ({ success: true as const, data: items, pagination });
const response = (item: PrestataireOrder) => ({ success: true as const, data: item });
const poResponse = (item: PrestatairePurchaseOrder) => ({ success: true as const, data: item });

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  await i18n.changeLanguage("fr");
  mockGetOrders.mockResolvedValue(page([order()]));
  mockGetOrder.mockResolvedValue(response(order()));
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

it("ignores an older tab response that arrives after the active tab", async () => {
  let resolveAccepted!: (value: ReturnType<typeof page>) => void;
  let resolveShipped!: (value: ReturnType<typeof page>) => void;
  mockGetOrders
    .mockImplementationOnce(() => new Promise((resolve) => { resolveAccepted = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveShipped = resolve; }));
  const view = render(<OrdersScreen />);

  fireEvent.press(view.getByText("Expédiées"));
  await act(async () => resolveShipped(page([order("shipped", 32)])));
  await waitFor(() => expect(view.getByText("ORD-32")).toBeTruthy());
  await act(async () => resolveAccepted(page([order("sent", 31)])));
  expect(view.queryByText("ORD-31")).toBeNull();
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

  fireEvent.press(await view.findByLabelText("Expédier"));
  expect(mockShipPurchaseOrder).not.toHaveBeenCalled();
  expect(view.getByText("Le numéro de référence est obligatoire")).toBeTruthy();
  fireEvent.changeText(await view.findByLabelText("Numéro de référence"), "TRACK-PO-51");
  fireEvent.press(view.getByLabelText("Expédier"));
  await waitFor(() => expect(mockShipPurchaseOrder).toHaveBeenCalledWith(51, {
    trackingNumber: "TRACK-PO-51",
  }));
});

it("ships a product-backed line through its purchase order without fabricating an offer id", async () => {
  mockParams = { orderId: "31" };
  const productOrder = order("preparing");
  productOrder.items[0] = { ...productOrder.items[0]!, offerId: null, productId: 909 };
  mockGetOrder.mockResolvedValue(response(productOrder));
  const view = render(<OrderDetailScreen />);

  fireEvent.changeText(await view.findByLabelText("Numéro de référence"), "PRODUCT-TRACK");
  fireEvent.press(view.getByLabelText("Expédier"));
  await waitFor(() => expect(mockShipPurchaseOrder).toHaveBeenCalledWith(51, {
    trackingNumber: "PRODUCT-TRACK",
  }));
  expect(mockPush).not.toHaveBeenCalled();
});

it("shows shipment tracking from the purchase order and keeps order notes separate", async () => {
  mockParams = { orderId: "31" };
  mockGetOrder.mockResolvedValue(response(order("shipped")));
  const view = render(<OrderDetailScreen />);

  await waitFor(() => expect(view.getByText("TRACK-42")).toBeTruthy());
  expect(view.getByText("Remarque commande")).toBeTruthy();
  expect(view.queryByLabelText("Expédier")).toBeNull();
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
  await waitFor(() => expect(list.getByText("شحناتك")).toBeTruthy());
  expect(list.getByText("العروض المقبولة")).toBeTruthy();
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
  await waitFor(() => expect(view.getByText("Aucune offre acceptée en attente")).toBeTruthy());
});
