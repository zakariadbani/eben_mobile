import React from "react";
import { Text as RNText } from "react-native";
import { act, fireEvent, render as rtlRender, waitFor } from "@testing-library/react-native";
import i18n from "@/localization/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCategoryTree } from "@/api/resources/categories";
import { getVehicles } from "@/api/resources/vehicles";
import { uploadLocalImages } from "@/api/resources/uploads";
import {
  acceptOffer,
  createRequest,
  getOffer,
  getOffers,
  getRequest,
  getRequests,
  sendRequest,
} from "@/api/resources/requests";
import { getVehicle } from "@/api/resources/vehicles";
import { getBasket, removeBasketItem } from "@/api/resources/basket";
import { ApiClientError } from "@/api/types";
import { CartContext } from "@/context/CartContext";
import { Role, useSession } from "@/context/AuthContext";
import { RequestDraftProvider } from "@/context/RequestDraftContext";
import CreateRequestScreen from "../requests/CreateRequestScreen";
import RequestSuccessScreen from "../requests/success";
import RequestDetailScreen from "../requests/[requestId]";
import OffersListScreen from "../requests/[requestId]/offers";
import OfferDetailScreen from "../requests/[requestId]/offers/[offerId]";
import ArchivedOffersScreen from "../settings/archived-offers";
import WhatsappBtn from "@/components/common/WhatsappBtn";
import { formatCountdown } from "@/helpers/countdown";
import type { Basket, BasketItem } from "@/interfaces/Basket";

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Stub = (props: object) => React.createElement(View, props);
  return { __esModule: true, default: Stub, Svg: Stub, Circle: Stub };
});

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSetOptions = jest.fn();
let mockParams: Record<string, string | undefined> = {};
// Captures the latest useFocusEffect callback so tests can replay it
// directly to simulate a refocus, without needing a real navigation stack.
let mockFocusCallback: (() => void) | null = null;

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
  // Mirrors catalogJourneys.test.tsx: runs the focus callback via a real
  // useEffect (so mount == "first focus") instead of the previous no-op.
  useFocusEffect: (callback: () => void) => {
    mockFocusCallback = callback;
    const ReactModule = require("react") as typeof React;
    ReactModule.useEffect(callback, [callback]);
  },
}));
jest.mock("@react-navigation/core", () => ({
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));
jest.mock("@/components/common/Button", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  const { useTranslation } = require("react-i18next");
  return function MockButton({ title, onPress, disabled, navigateTo }: { title?: string; onPress?: () => void; disabled?: boolean; navigateTo?: string }) {
    const { t } = useTranslation();
    const label = title ? t(title) : "button";
    return React.createElement(View, {
      accessible: true, accessibilityRole: "button", accessibilityLabel: label,
      accessibilityState: { disabled },
      onPress: disabled ? undefined : navigateTo ? () => mockPush(navigateTo) : onPress,
    }, React.createElement(Text, null, label));
  };
});
jest.mock("@/components/common/ImageInputList", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  const { useTranslation } = require("react-i18next");
  return function MockImageInputList({ imageUris = [], onAddImage }: { imageUris?: string[]; onAddImage?: (uri: string) => void }) {
    const { t } = useTranslation();
    return React.createElement(View, null,
      React.createElement(View, {
        accessible: true, accessibilityRole: "button", accessibilityLabel: t("requestFlow.addImage"),
        onPress: () => onAddImage?.("file:///part.jpg"),
      }, React.createElement(Text, null, t("requestFlow.addImage"))),
      ...imageUris.map((uri) => React.createElement(View, { key: uri, accessibilityLabel: uri })),
    );
  };
});
jest.mock("@/context/useStorageState", () => ({
  useStorageState: () => [[false, 42], jest.fn()],
}));
jest.mock("@/context/AuthContext", () => ({
  Role: { CLIENT: "client", PRESTATAIRE: "prestataire" },
  useSession: jest.fn(),
}));
jest.mock("@/api/resources/categories", () => ({ getCategoryTree: jest.fn() }));
jest.mock("@/api/resources/vehicles", () => ({
  CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY: "selectedVehicleId",
  getVehicles: jest.fn(),
  getVehicle: jest.fn(),
}));
jest.mock("@/api/resources/uploads", () => ({ uploadLocalImages: jest.fn() }));
jest.mock("@/api/resources/basket", () => ({ getBasket: jest.fn(), removeBasketItem: jest.fn() }));
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));
jest.mock("@/api/resources/requests", () => ({
  acceptOffer: jest.fn(),
  createRequest: jest.fn(),
  getOffer: jest.fn(),
  getOffers: jest.fn(),
  getRequest: jest.fn(),
  getRequests: jest.fn(),
  sendRequest: jest.fn(),
}));
jest.mock("@/components/common/Image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockImage(props: object) { return React.createElement(View, props); };
});
jest.mock("@/components/common/ImageInput", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockImageInput({ defaultImage }: { defaultImage?: string }) {
    return React.createElement(View, { testID: defaultImage });
  };
});
jest.mock("@/components/common/ImageSlider", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockImageSlider() { return React.createElement(View, { testID: "image-slider" }); };
});
jest.mock("@/components/common/AudioPlayer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAudioPlayer() { return React.createElement(View, { testID: "audio-player" }); };
});

const mockGetCategoryTree = getCategoryTree as jest.MockedFunction<typeof getCategoryTree>;
const mockGetVehicles = getVehicles as jest.MockedFunction<typeof getVehicles>;
const mockUploadLocalImages = uploadLocalImages as jest.MockedFunction<typeof uploadLocalImages>;
const mockCreateRequest = createRequest as jest.MockedFunction<typeof createRequest>;
const mockGetRequest = getRequest as jest.MockedFunction<typeof getRequest>;
const mockGetRequests = getRequests as jest.MockedFunction<typeof getRequests>;
const mockSendRequest = sendRequest as jest.MockedFunction<typeof sendRequest>;
const mockGetOffer = getOffer as jest.MockedFunction<typeof getOffer>;
const mockGetOffers = getOffers as jest.MockedFunction<typeof getOffers>;
const mockGetVehicle = getVehicle as jest.MockedFunction<typeof getVehicle>;
const mockAcceptOffer = acceptOffer as jest.MockedFunction<typeof acceptOffer>;
const mockGetBasket = getBasket as jest.MockedFunction<typeof getBasket>;
const mockRemoveBasketItem = removeBasketItem as jest.MockedFunction<typeof removeBasketItem>;
const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;

// CreateRequestScreen and the Liste tab now read useRequestDraft() (guests
// build their draft locally, login only at send) — shadow `render` so every
// call site below picks up the provider without touching each test.
function render(ui: React.ReactElement) {
  return rtlRender(<RequestDraftProvider>{ui}</RequestDraftProvider>);
}

// ponytail: OfferDetailScreen calls useCart() (throws outside a provider) —
// this is a lightweight stand-in for CartProvider that skips the real
// provider's useSession()-gated auto-refresh.
let mockInitialBasket: Basket | null = null;
function CartTestProvider({ children }: { children: React.ReactNode }) {
  const [basket, setBasket] = React.useState<Basket | null>(mockInitialBasket);
  const itemCount = basket?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
  return (
    <CartContext.Provider value={{ basket, setBasket, refresh: async () => {}, itemCount }}>
      {children}
      {/* Stand-in for the "Panier" tab badge, which reads the same context. */}
      <CartBadgeProbe />
    </CartContext.Provider>
  );
}
function CartBadgeProbe() {
  const cart = React.useContext(CartContext);
  return <RNText testID="cart-badge">{String(cart?.itemCount ?? 0)}</RNText>;
}
function renderWithCart(ui: React.ReactElement) {
  return render(<CartTestProvider>{ui}</CartTestProvider>);
}

const pagination = { currentPage: 1, lastPage: 1, perPage: 20, total: 1, from: 1, to: 1 };
const leaf = {
  id: 12, parentId: 11, level: 3 as const, title: "Plaquettes", titleAr: "وسادات",
  slug: "plaquettes", sortOrder: 1, status: true, createdAt: "2026-01-01", updatedAt: "2026-01-01",
};
// Second leaf sibling — used only by the "list/full" layout test below to
// prove multiple draft items resolve/render independently; other tests in
// this file keep addressing "Plaquettes"/"Freins avant" by name, unaffected.
const leaf2 = {
  ...leaf, id: 13, parentId: 11, title: "Disques", titleAr: "أقراص", slug: "disques",
};
const tree = [{
  ...leaf, id: 10, parentId: null, level: 1 as const, title: "Freins", titleAr: "فرامل",
  children: [{ ...leaf, id: 11, parentId: 10, level: 2 as const, title: "Freins avant", children: [leaf, leaf2] }],
}];
const vehicle = {
  id: 42, userId: 5, brandId: 1, modelId: 2, motorizationId: null, year: 2021,
  vin: null, licensePlate: null, nickname: null, imageUrl: null, isDefault: true,
  createdAt: "2026-01-01", updatedAt: "2026-01-01", brandName: "Dacia", modelName: "Logan",
};
const request = {
  id: 73, reference: "REQ-73", userId: 5, vehicleId: 42, addressId: null, notes: "Bruit avant",
  status: "draft" as const, aiValidationTag: null, aiValidationReason: null, offersCount: 0,
  expiresAt: null, createdAt: "2026-01-01", updatedAt: "2026-01-01",
  items: [{ id: 1, requestId: 73, categoryId: 12, quantity: 1, condition: "occasion" as const,
    notes: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", categoryTitle: "Plaquettes" }],
  images: [],
};
const offer = {
  id: 88, reference: "OFF-88", requestId: 73, ferrailleurId: 8, requestItemId: 1,
  priceClient: 240, description: null, audioUrl: null, availability: "available" as const,
  condition: "occasion" as const, quantity: 2,
  status: "validated" as const, adminNotes: null, validatedBy: 2, validatedAt: "2026-01-01",
  createdAt: "2026-01-01", updatedAt: "2026-01-01", images: [], categoryTitle: "Plaquettes",
  brandName: null, brandNameAr: null,
  vehicle: { brandName: "Dacia", modelName: "Logan", motorisation: null, year: 2021 },
};
const basketLine = (id: number, offerId: number, quantity = 1): BasketItem => ({
  id, basketId: 19, offerId, categoryId: 12, quantity, unitPrice: 240,
  createdAt: "2026-01-01", updatedAt: "2026-01-01", requestItemId: 1,
});
const basketWith = (items: BasketItem[]): Basket => ({
  id: 19, userId: 5, requestId: 73,
  premium: false, premiumFee: 0,
  subtotal: 240, discountAmount: 0, shippingFee: 0, taxAmount: 48, total: 288,
  createdAt: "2026-01-01", updatedAt: "2026-01-01", items,
});
const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  mockFocusCallback = null;
  mockInitialBasket = null;
  await i18n.changeLanguage("fr");
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  mockGetCategoryTree.mockResolvedValue({ success: true, data: tree });
  mockGetVehicles.mockResolvedValue({ success: true, data: [vehicle], pagination });
  mockUploadLocalImages.mockResolvedValue(["tmp/mobile/5/image.jpg"]);
  mockCreateRequest.mockResolvedValue({ success: true, data: { id: 73, reference: "REQ-73" } });
  mockGetRequest.mockResolvedValue({ success: true, data: request });
  mockGetRequests.mockResolvedValue({ success: true, data: [], pagination: { ...pagination, total: 0, from: null, to: null } });
  mockSendRequest.mockResolvedValue({ success: true, data: { id: 73, reference: "REQ-73", status: "pending" } });
  mockGetOffer.mockResolvedValue({ success: true, data: offer });
  mockGetOffers.mockResolvedValue({ success: true, data: [offer], pagination });
  mockGetVehicle.mockResolvedValue({ success: true, data: vehicle });
  const basket = {
    id: 19, userId: 5, requestId: 73,
    premium: false, premiumFee: 0,
    subtotal: 240, discountAmount: 0, shippingFee: 0, taxAmount: 48, total: 288,
    createdAt: "2026-01-01", updatedAt: "2026-01-01", items: [],
  } satisfies Basket;
  mockAcceptOffer.mockResolvedValue({ success: true, data: basket });
  mockGetBasket.mockResolvedValue({ success: true, data: basketWith([]) });
  mockRemoveBasketItem.mockResolvedValue({ success: true, data: basketWith([]) });
});

it("uploads local attachments and creates a draft with selected server vehicle and leaf IDs", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 13, title: "Disques", titleAr: "أقراص", quantity: 1, condition: "occasion" },
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 2, condition: "occasion" },
  ]));
  const screen = render(<CreateRequestScreen />);

  await screen.findByText("Disques");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.addImage") }));
  await screen.findByLabelText("file:///part.jpg");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));

  const send = await screen.findByRole("button", { name: i18n.t("requestFlow.send") });
  fireEvent.press(send);

  await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledWith({
    vehicleId: 42,
    items: [
      { categoryId: 13, quantity: 1, condition: "occasion" },
      { categoryId: 12, quantity: 2, condition: "occasion" },
    ],
    notes: null,
    images: ["tmp/mobile/5/image.jpg"],
  }));
  expect(mockUploadLocalImages).toHaveBeenCalledWith(["file:///part.jpg"]);
  expect(mockUploadLocalImages.mock.invocationCallOrder[0]).toBeLessThan(mockCreateRequest.mock.invocationCallOrder[0]);
  await waitFor(() => expect(mockSendRequest).toHaveBeenCalledWith(73));
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: "/(client)/requests/success",
    params: { requestId: "73" },
  });
});

it("preserves the draft and uploaded paths across a Laravel validation error", async () => {
  mockCreateRequest
    .mockRejectedValueOnce(new ApiClientError("Validation failed", 422, { "items.0.categoryId": ["Leaf required"] }))
    .mockResolvedValueOnce({ success: true, data: { id: 73, reference: "REQ-73" } });
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion" },
  ]));
  const screen = render(<CreateRequestScreen />);

  await screen.findByText("Plaquettes");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.addImage") }));
  await screen.findByLabelText("file:///part.jpg");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));

  const send = await screen.findByRole("button", { name: i18n.t("requestFlow.send") });
  fireEvent.press(send);

  expect(await screen.findByText("Leaf required")).toBeTruthy();
  // "Plaquettes" now renders both in the underlying draft list and inside
  // the still-open send sheet — assert the draft survived without pinning
  // to a single node.
  expect(screen.getAllByText("Plaquettes").length).toBeGreaterThan(0);
  expect(screen.getByLabelText("file:///part.jpg")).toBeTruthy();
  fireEvent.press(send);
  await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledTimes(2));
  expect(mockUploadLocalImages).toHaveBeenCalledTimes(1);
});

it("routes an empty garage to the existing add-car flow without creating a request", async () => {
  mockGetVehicles.mockResolvedValueOnce({ success: true, data: [], pagination: { ...pagination, total: 0, from: null, to: null } });
  const screen = render(<CreateRequestScreen />);

  fireEvent.press(await screen.findByRole("button", { name: i18n.t("requestFlow.addVehicle") }));
  expect(mockPush).toHaveBeenCalledWith("/(client)/search/add-car");
  expect(mockCreateRequest).not.toHaveBeenCalled();
});

it("hydrates the builder from a persisted draft, upserts the param prefill, and clears the draft after sending", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 3, condition: "en_stock" },
  ]));
  mockParams = { categoryId: "12" };
  const screen = render(<CreateRequestScreen />);

  expect(await screen.findByText("Plaquettes")).toBeTruthy();

  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));
  const send = await screen.findByRole("button", { name: i18n.t("requestFlow.send") });
  fireEvent.press(send);

  await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledWith({
    vehicleId: 42,
    items: [{ categoryId: 12, quantity: 3, condition: "en_stock" }],
    notes: null,
    images: [],
  }));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith("requestDraft", "[]"));
});

it("shows the requestList.brand line and sends brandId for a branded draft item", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion", brandId: 1, brandName: "RIDEX", brandNameAr: "ريدكس" },
  ]));
  const screen = render(<CreateRequestScreen />);

  expect(await screen.findByText(i18n.t("requestList.brand", { value: "RIDEX" }))).toBeTruthy();

  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));
  const send = await screen.findByRole("button", { name: i18n.t("requestFlow.send") });
  fireEvent.press(send);

  await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledWith({
    vehicleId: 42,
    items: [{ categoryId: 12, quantity: 1, condition: "occasion", brandId: 1 }],
    notes: null,
    images: [],
  }));
});

it("keeps a branded and a brandless line of the same leaf as two rows, and removes only one", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion", brandId: null, brandName: null, brandNameAr: null },
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion", brandId: 1, brandName: "RIDEX", brandNameAr: "ريدكس" },
  ]));
  const screen = render(<CreateRequestScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.totalPieces", { count: 2 }))).toBeTruthy();
  expect(screen.getAllByText("Plaquettes")).toHaveLength(2);
  expect(screen.getByText(i18n.t("requestList.brand", { value: "RIDEX" }))).toBeTruthy();

  const removeButtons = screen.getAllByLabelText(i18n.t("requestFlow.removePart"));
  expect(removeButtons).toHaveLength(2);
  fireEvent.press(removeButtons[0]);

  await waitFor(() => expect(screen.getAllByText("Plaquettes")).toHaveLength(1));
  expect(await screen.findByText(i18n.t("requestFlow.totalPieces", { count: 1 }))).toBeTruthy();
});

it("pushes a guest submit to login-to-send instead of creating a request", async () => {
  mockedUseSession.mockReturnValue({ role: "guest" } as ReturnType<typeof useSession>);
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion" },
  ]));
  const screen = render(<CreateRequestScreen />);

  await screen.findByText("Plaquettes");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));

  expect(mockPush).toHaveBeenCalledWith("/(client)/requests/login-to-send");
  expect(mockCreateRequest).not.toHaveBeenCalled();
  expect(mockGetVehicles).not.toHaveBeenCalled();
});

it("keeps listing the draft and offers the add-car CTA when the garage is empty", async () => {
  mockGetVehicles.mockResolvedValueOnce({ success: true, data: [], pagination: { ...pagination, total: 0, from: null, to: null } });
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion" },
  ]));
  const screen = render(<CreateRequestScreen />);

  await screen.findByText("Plaquettes");

  expect(screen.getByText("Plaquettes")).toBeTruthy();
  expect(screen.getByRole("button", { name: i18n.t("requestFlow.addVehicle") })).toBeTruthy();
  expect(screen.queryByRole("button", { name: i18n.t("requestFlow.verify") })).toBeNull();

  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.addVehicle") }));
  expect(mockPush).toHaveBeenCalledWith("/(client)/search/add-car");
  expect(mockCreateRequest).not.toHaveBeenCalled();
});

it.each(["fr", "ar"])("renders the Figma list/full layout for a saved draft in %s", async (language) => {
  await i18n.changeLanguage(language);
  const draftItem1 = { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 3, condition: "occasion" as const };
  const draftItem2 = { categoryId: 13, title: "Disques", titleAr: "أقراص", quantity: 1, condition: "occasion" as const, brandId: null, brandName: null, brandNameAr: null };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([draftItem1, draftItem2]));
  mockGetRequests.mockResolvedValueOnce({
    success: true,
    data: [
      { id: 101, reference: "REQ-101", status: "pending", expiresDisplay: "3h 00min", createdAt: "2026-09-01" },
      { id: 102, reference: "REQ-102", status: "validated", expiresDisplay: "1h 00min", createdAt: "2026-09-01" },
    ],
    pagination: { ...pagination, total: 2 },
  });
  const screen = render(<CreateRequestScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.totalPieces", { count: 4 }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("requestFlow.chooseCategory"))).toBeNull();
  expect(screen.getAllByText(i18n.t("requestList.category", { value: language === "ar" ? "فرامل" : "Freins" })).length).toBeGreaterThan(0);
  expect(screen.getByText(i18n.t(
    "Les demandes de prix sont ouvertes de 8h à 18h, toute demande envoyée après 18h sera satisfaite à 10h le jour ouvrable suivant.",
  ))).toBeTruthy();
  expect(screen.getByText(i18n.t("Ajouter des détails"))).toBeTruthy();
  expect(screen.getByText(i18n.t("Vos requêtes actives"))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.checkPrices"))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.details"))).toBeTruthy();

  expect(screen.queryByRole("button", { name: i18n.t("Ajouter une pièce") })).toBeNull();
  const increaseButtons = screen.getAllByLabelText(i18n.t("Augmenter la quantité"));
  const decreaseButtons = screen.getAllByLabelText(i18n.t("Diminuer la quantité"));
  expect(decreaseButtons[1].props.accessibilityState.disabled).toBe(true);
  fireEvent.press(increaseButtons[0]);
  expect(await screen.findByText(i18n.t("requestFlow.totalPieces", { count: 5 }))).toBeTruthy();
  fireEvent.press(decreaseButtons[0]);
  expect(await screen.findByText(i18n.t("requestFlow.totalPieces", { count: 4 }))).toBeTruthy();

  fireEvent.press(screen.getAllByLabelText(i18n.t("requestFlow.removePart"))[0]);
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith("requestDraft", JSON.stringify([draftItem2])));
  expect(await screen.findByText(i18n.t("requestFlow.totalPieces", { count: 1 }))).toBeTruthy();
});

it("still renders the list layout when the active-requests fetch fails", async () => {
  const draftItem1 = { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion" as const };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([draftItem1]));
  mockGetRequests.mockRejectedValueOnce(new Error("offline"));
  const screen = render(<CreateRequestScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.totalPieces", { count: 1 }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("requestFlow.loadError"))).toBeNull();
});

it("never calls getRequests for a guest with a saved draft and hides the active-requests section", async () => {
  mockedUseSession.mockReturnValue({ role: "guest" } as ReturnType<typeof useSession>);
  const draftItem1 = { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion" as const };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([draftItem1]));
  const screen = render(<CreateRequestScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.totalPieces", { count: 1 }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("Vos requêtes actives"))).toBeNull();
  expect(mockGetRequests).not.toHaveBeenCalled();
});

it("renders the Figma list/empty layout for an empty draft", async () => {
  mockGetRequests.mockResolvedValueOnce({
    success: true,
    data: [
      { id: 1, reference: "REQ-1", status: "offers_received", expiresDisplay: "1h 30min", createdAt: "2026-08-01" },
      { id: 2, reference: "REQ-2", status: "pending", expiresDisplay: "45min", createdAt: "2026-08-01" },
      { id: 3, reference: "REQ-3", status: "expired", expiresDisplay: null, createdAt: "2026-08-01" },
    ],
    pagination: { ...pagination, total: 3 },
  });
  const screen = render(<CreateRequestScreen />);

  expect(await screen.findByText(i18n.t("Ajouter des détails"))).toBeTruthy();
  expect(screen.getByText(i18n.t("Vos requêtes actives"))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.reference", { value: "REQ-1" }))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.reference", { value: "REQ-2" }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("home.reference", { value: "REQ-3" }))).toBeNull();
  expect(screen.queryByText(i18n.t("requestFlow.chooseCategory"))).toBeNull();
  expect(screen.queryByRole("button", { name: "Freins" })).toBeNull();
  expect(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }).props.accessibilityState.disabled).toBe(true);

  fireEvent.press(screen.getByRole("button", { name: i18n.t("Explorer les produits") }));
  expect(mockPush).toHaveBeenCalledWith("/(client)/categories");
});

it("hides the active-requests section for a guest with an empty draft", async () => {
  mockedUseSession.mockReturnValue({ role: "guest" } as ReturnType<typeof useSession>);
  const screen = render(<CreateRequestScreen />);

  expect(await screen.findByText(i18n.t("Ajouter des détails"))).toBeTruthy();
  expect(screen.queryByText(i18n.t("Vos requêtes actives"))).toBeNull();
  expect(mockGetRequests).not.toHaveBeenCalled();
});

it("fetches requests once on mount and again silently on a later refocus", async () => {
  const screen = render(<CreateRequestScreen />);

  expect(await screen.findByText(i18n.t("Ajouter des détails"))).toBeTruthy();
  expect(mockGetRequests).toHaveBeenCalledTimes(1);

  const freshRequest = {
    id: 55, reference: "REQ-55", status: "pending" as const, expiresDisplay: "10min", createdAt: "2026-09-08",
  };
  mockGetRequests.mockResolvedValueOnce({ success: true, data: [freshRequest], pagination: { ...pagination, total: 1 } });

  await act(async () => { mockFocusCallback?.(); });

  await waitFor(() => expect(mockGetRequests).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(i18n.t("home.reference", { value: "REQ-55" }))).toBeTruthy();
});

it("lets the user retry sendRequest after a transient failure without re-creating the request", async () => {
  mockSendRequest.mockRejectedValueOnce(new Error("boom"));
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion" },
  ]));
  const screen = render(<CreateRequestScreen />);

  await screen.findByText("Plaquettes");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));

  const send = await screen.findByRole("button", { name: i18n.t("requestFlow.send") });
  fireEvent.press(send);

  expect(await screen.findByText(i18n.t("requestFlow.sendError"))).toBeTruthy();

  fireEvent.press(send);

  await waitFor(() => expect(mockSendRequest).toHaveBeenCalledTimes(2));
  expect(mockCreateRequest).toHaveBeenCalledTimes(1);
  expect(mockSendRequest).toHaveBeenNthCalledWith(1, 73);
  expect(mockSendRequest).toHaveBeenNthCalledWith(2, 73);
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: "/(client)/requests/success",
    params: { requestId: "73" },
  });
});

it("clears the note and images after a successful send so a later draft starts fresh", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion" },
  ]));
  const screen = render(<CreateRequestScreen />);

  await screen.findByText("Plaquettes");
  fireEvent.changeText(screen.getByLabelText(i18n.t("requestFlow.note")), "Bruit au freinage");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.addImage") }));
  await screen.findByLabelText("file:///part.jpg");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));
  fireEvent.press(await screen.findByRole("button", { name: i18n.t("requestFlow.send") }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  expect(await screen.findByText(i18n.t("Ajouter des détails"))).toBeTruthy();

  // Tabs keep this screen mounted — simulate returning to it via a fresh
  // route prefill instead of unmounting, on the same instance that just sent.
  mockParams = { categoryId: "12" };
  await act(async () => {
    screen.rerender(<RequestDraftProvider><CreateRequestScreen /></RequestDraftProvider>);
  });

  await screen.findByText("Plaquettes");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));
  fireEvent.press(await screen.findByRole("button", { name: i18n.t("requestFlow.send") }));

  await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledTimes(2));
  expect(mockCreateRequest).toHaveBeenLastCalledWith(expect.objectContaining({ notes: null, images: [] }));
});

it("keeps unvalidated offer counts from enabling the request offers action", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "offers_received", offersCount: 0 },
  });
  const screen = renderWithCart(<RequestDetailScreen />);

  await screen.findByText("Plaquettes");
  expect(screen.queryByRole("button", { name: i18n.t("Les offres") })).toBeNull();
  expect(screen.queryByText(i18n.t("requestFlow.noOffer"))).toBeNull();
  // Figma List-Commandez: the WhatsApp FAB stays on the request detail.
  expect(screen.UNSAFE_queryAllByType(WhatsappBtn)).toHaveLength(1);
  expect(mockGetOffers).not.toHaveBeenCalled();
});

it("keeps offers still under admin review on the Envoyé step", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "offers_received", offersCount: 1, expiresAt: inHours(7 * 24) },
  });
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByLabelText(`${i18n.t("Envoyé")}, 1/4`)).toBeTruthy();
  expect(screen.getByLabelText(`${i18n.t("Envoyé")}, 1/4`).props.accessibilityState).toEqual({ selected: true });
});

it.each([
  ["validated without basket lines", "validated" as const, null, "Commandez", 2],
  ["validated with this request in the basket", "validated" as const, basketWith([basketLine(501, 88)]), "Paiement", 3],
  ["validated with another request's basket", "validated" as const, { ...basketWith([basketLine(501, 99)]), requestId: 12 }, "Commandez", 2],
  ["ordered", "ordered" as const, null, "Traitement", 4],
])("maps a %s request to the Figma stepper step", async (_name, status, basket, label, position) => {
  mockParams = { requestId: "73" };
  mockInitialBasket = basket;
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status, offersCount: 1, expiresAt: inHours(20) },
  });
  const screen = renderWithCart(<RequestDetailScreen />);

  const step = await screen.findByLabelText(`${i18n.t(label)}, ${position}/4`);
  expect(step.props.accessibilityState).toEqual({ selected: true });
});

it("shows the order-window ring and expiry warning on a validated request", async () => {
  mockParams = { requestId: "73" };
  const expiresAt = inHours(15.5);
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "validated", offersCount: 1, expiresAt },
  });
  mockInitialBasket = basketWith([basketLine(501, 88)]);
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByText(i18n.t("Restant"))).toBeTruthy();
  expect(screen.getByText(formatCountdown(expiresAt, "Expiré"))).toBeTruthy();
  expect(screen.getByText(i18n.t("Veuillez remplir votre commande avant le délai d'expiration"))).toBeTruthy();
  // Bosch offer 88 is in the basket: its part carries the in-basket badge.
  expect(screen.getByText(i18n.t("clientOffers.inCart"))).toBeTruthy();
  expect(screen.getByText(i18n.t("requestFlow.offersCount", { count: 1 }))).toBeTruthy();
});

it.each(["fr", "ar"])("counts the part's basket lines in the badge and validated + selected offers in X{n} (%s)", async (language) => {
  await i18n.changeLanguage(language);
  mockParams = { requestId: "73" };
  const second = { ...offer, id: 89, reference: "OFF-89", status: "selected" as const };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "validated", offersCount: 2, expiresAt: inHours(15) },
  });
  mockGetOffers.mockResolvedValueOnce({ success: true, data: [offer, second], pagination });
  // Two offers of the same Bosch part in the basket, the second only known through its `selected` status.
  mockInitialBasket = basketWith([basketLine(501, 88)]);
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByText(i18n.t("clientOffers.inCartCount", { count: 2 }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("clientOffers.inCart"))).toBeNull();
  expect(screen.getByText(i18n.t("requestFlow.offersCount", { count: 2 }))).toBeTruthy();
});

it("reads a long deadline in days, with Arabic units", async () => {
  await i18n.changeLanguage("ar");
  mockParams = { requestId: "73" };
  const expiresAt = new Date(Date.now() + (27 * 24 + 7) * 3_600_000 + 30 * 60_000).toISOString();
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "pending", offersCount: 0, expiresAt },
  });
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByText(i18n.t("countdown.daysHours", { days: 27, hours: 7 }))).toBeTruthy();
});

it("localizes the per-part offer count in Arabic instead of the Latin X2", async () => {
  await i18n.changeLanguage("ar");
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValue({
    success: true,
    data: { ...request, status: "validated", offersCount: 2, expiresAt: inHours(10) },
  });
  mockGetOffers.mockResolvedValueOnce({ success: true, data: [offer, { ...offer, id: 89, reference: "OFF-89" }], pagination });
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByText("عرضان")).toBeTruthy();
  expect(screen.queryByText("X2")).toBeNull();
  expect(i18n.t("requestFlow.offersCount", { count: 1 })).toBe("عرض واحد");
  expect(i18n.t("requestFlow.offersCount", { count: 3 })).toBe("3 عروض");
});

it("reloads the request detail silently when it regains focus", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValue({
    success: true,
    data: { ...request, status: "validated", offersCount: 1, expiresAt: inHours(10) },
  });
  mockGetOffers.mockResolvedValueOnce({ success: true, data: [offer, { ...offer, id: 89, reference: "OFF-89" }], pagination });
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.offersCount", { count: 2 }))).toBeTruthy();

  mockGetOffers.mockResolvedValueOnce({ success: true, data: [offer], pagination });
  await act(async () => { mockFocusCallback?.(); });

  expect(await screen.findByText(i18n.t("requestFlow.offersCount", { count: 1 }))).toBeTruthy();
  expect(mockGetRequest).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(i18n.t("requestFlow.requestNotFound"))).toBeNull();
});

it("filters the requested parts by condition from the Filters sheet", async () => {
  mockParams = { requestId: "73" };
  const item2 = { ...request.items[0], id: 2, categoryId: 13, categoryTitle: "Disques", condition: "en_stock" as const };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "validated", offersCount: 1, expiresAt: inHours(10), items: [request.items[0], item2] },
  });
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByText("Disques")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("clientOffers.filterParts") }));
  fireEvent.press(await screen.findByRole("checkbox", { name: i18n.t("clientOffers.sections.occasion") }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("clientOffers.filterApply") }));

  await waitFor(() => expect(screen.queryByText("Disques")).toBeNull());
  expect(screen.getByText("Plaquettes")).toBeTruthy();
});

it("hides the stepper for an expired request", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "expired", offersCount: 0, expiresAt: "2026-08-01T00:00:00.000Z" },
  });
  const screen = renderWithCart(<RequestDetailScreen />);

  await screen.findByText(i18n.t("requestFlow.requestStatus.expired"));
  expect(screen.queryByLabelText(/1\/4/)).toBeNull();
});

it("shows an expired request as terminal and offers a truthful new-request path", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "expired", offersCount: 0, expiresAt: "2026-08-01T00:00:00.000Z" },
  });
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.requestStatus.expired"))).toBeTruthy();
  expect(screen.queryByRole("button", { name: i18n.t("requestFlow.waitingOffers") })).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.createNew") }));
  expect(mockPush).toHaveBeenCalledWith("/(client)/requests/CreateRequestScreen");
});

it("treats a stale non-expired status past its deadline as expired", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "pending", offersCount: 0, expiresAt: "2020-01-01T00:00:00.000Z" },
  });
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.requestStatus.expired"))).toBeTruthy();
  expect(screen.queryByRole("button", { name: i18n.t("requestFlow.waitingOffers") })).toBeNull();
});

it("keeps a validated request in progress even past its original deadline", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "validated", offersCount: 1, expiresAt: "2020-01-01T00:00:00.000Z" },
  });
  mockGetOffers.mockResolvedValueOnce({ success: true, data: [offer], pagination });
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByLabelText(`${i18n.t("Commandez")}, 2/4`)).toBeTruthy();
  expect(screen.getByText(i18n.t("requestFlow.offersCount", { count: 1 }))).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("Les offres") }));
  expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
    pathname: "/(client)/requests/[requestId]/offers",
    params: { requestId: "73", itemId: "1" },
  }));
  expect(screen.queryByText(i18n.t("Restant"))).toBeNull();
  expect(screen.queryByText(i18n.t("Expiré"))).toBeNull();
  expect(screen.queryByText(i18n.t("requestFlow.requestStatus.expired"))).toBeNull();
});

it("renders the Figma list detail for a pending request", async () => {
  mockParams = { requestId: "73" };
  const expiresAt = new Date(Date.now() + 90 * 60_000).toISOString();
  const createdAt = new Date(Date.now() - 30 * 60_000).toISOString();
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "pending", offersCount: 0, expiresAt, createdAt },
  });
  mockGetRequests.mockResolvedValueOnce({
    success: true,
    data: [
      { id: 99, reference: "REQ-99", status: "pending", expiresDisplay: "45min", createdAt: "2026-08-01" },
      { id: 73, reference: "REQ-73", status: "pending", expiresDisplay: "1h", createdAt: "2026-08-01" },
    ],
    pagination,
  });
  const screen = renderWithCart(<RequestDetailScreen />);

  await waitFor(() => expect(mockSetOptions).toHaveBeenCalledWith({ title: i18n.t("requestFlow.detailTitle", { reference: "REQ-73" }) }));
  expect(await screen.findByText(i18n.t("Restant"))).toBeTruthy();
  expect(screen.getByText(formatCountdown(expiresAt, "Expiré"))).toBeTruthy();
  expect(screen.getByText(i18n.t("requestList.category", { value: "Freins" }))).toBeTruthy();
  expect(screen.getByText("Plaquettes")).toBeTruthy();
  expect(screen.getByText(i18n.t("Vos autres demandes"))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.reference", { value: "REQ-99" }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("home.reference", { value: "REQ-73" }))).toBeNull();
  expect(screen.queryByText(i18n.t("Veuillez remplir votre commande avant le délai d'expiration"))).toBeNull();
  expect(screen.queryByRole("button", { name: i18n.t("Les offres") })).toBeNull();
  expect(screen.queryByRole("button", { name: i18n.t("requestFlow.viewOffers") })).toBeNull();
});

it("groups parts by category with per-part offer counts and a resend path", async () => {
  mockParams = { requestId: "73" };
  const expiresAt = new Date(Date.now() + 90 * 60_000).toISOString();
  const item1 = { ...request.items[0], id: 1, categoryId: 12, categoryTitle: "Plaquettes", offersCount: 4 };
  const item2 = { ...request.items[0], id: 2, categoryId: 13, categoryTitle: "Disques", condition: "occasion" as const, offersCount: 0 };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "validated", offersCount: 1, expiresAt, items: [item1, item2] },
  });
  mockGetOffers.mockResolvedValueOnce({ success: true, data: [offer], pagination });
  const screen = renderWithCart(<RequestDetailScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.offersCount", { count: 4 }))).toBeTruthy();
  expect(screen.getByText(i18n.t("requestFlow.noOffer"))).toBeTruthy();
  expect(screen.getByText(i18n.t("Veuillez remplir votre commande avant le délai d'expiration"))).toBeTruthy();
  expect(screen.getAllByText("Freins").length).toBeGreaterThanOrEqual(1);
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.resend") }));
  expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
    pathname: "/(client)/requests/CreateRequestScreen",
    params: { categoryId: "13", condition: "occasion" },
  }));
  expect(screen.queryByText(i18n.t("Vos autres demandes"))).toBeNull();
  expect(mockGetRequests).not.toHaveBeenCalled();
});

it("shows the Figma ready and closed request states in archived offers", async () => {
  const summary = (id: number, status: "draft" | "offers_received" | "validated" | "ordered" | "expired" | "cancelled") => ({
    id,
    reference: `REQ-${id}`,
    status,
    expiresDisplay: null,
    createdAt: "2026-08-01T10:00:00.000Z",
  });
  mockGetRequests.mockResolvedValueOnce({
    success: true,
    data: [
      summary(1, "draft"),
      summary(2, "offers_received"),
      summary(3, "validated"),
      summary(4, "ordered"),
    ],
    pagination: { ...pagination, total: 4 },
  });
  const screen = render(<ArchivedOffersScreen />);

  expect(await screen.findByText("REQ-4")).toBeTruthy();
  expect(screen.getByText("REQ-2")).toBeTruthy();
  expect(screen.queryByText("REQ-1")).toBeNull();
  expect(screen.queryByText("REQ-3")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("home.checkPrices") }));
  expect(mockPush).toHaveBeenCalledWith("/(client)/requests/2");
});

it("loads the created draft and sends once using the server response reference", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([
    { categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion" },
  ]));
  const screen = render(<CreateRequestScreen />);

  await screen.findByText("Plaquettes");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));

  const send = await screen.findByRole("button", { name: i18n.t("requestFlow.send") });
  fireEvent.press(send);
  fireEvent.press(send);

  await waitFor(() => expect(mockSendRequest).toHaveBeenCalledTimes(1));
  expect(mockSendRequest).toHaveBeenCalledWith(73);
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: "/(client)/requests/success",
    params: { requestId: "73" },
  });
});

it("loads request success from the owned server request and rejects forged route data", async () => {
  mockParams = { requestId: "73", reference: "FORGED" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "pending", expiresAt: "2026-08-02T14:00:00.000Z" },
  });
  const valid = render(<RequestSuccessScreen />);

  expect(await valid.findByText(/REQ-73/)).toBeTruthy();
  expect(valid.queryByText(/FORGED/)).toBeNull();
  fireEvent.press(valid.getByRole("button", { name: i18n.t("requestFlow.viewRequest") }));
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: "/(client)/requests/[requestId]",
    params: { requestId: "73" },
  });
  valid.unmount();

  mockParams = { requestId: "invalid", reference: "FORGED" };
  const invalid = render(<RequestSuccessScreen />);
  expect(await invalid.findByText(i18n.t("requestFlow.invalidRoute"))).toBeTruthy();
  expect(mockGetRequest).toHaveBeenCalledTimes(1);
});

it("adds a validated offer in place: one call, toast, cart badge and remove state", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  mockAcceptOffer.mockResolvedValue({ success: true, data: basketWith([basketLine(501, 88)]) });
  const screen = renderWithCart(<OfferDetailScreen />);

  const add = await screen.findByRole("button", { name: i18n.t("clientOffers.addToCart") });
  fireEvent.press(add);
  fireEvent.press(add);

  await waitFor(() => expect(mockAcceptOffer).toHaveBeenCalledTimes(1));
  expect(mockAcceptOffer).toHaveBeenCalledWith(88);
  expect(await screen.findByText(i18n.t("clientOffers.addedToast", { quantity: 1, part: "Plaquettes" }))).toBeTruthy();
  expect(screen.getByRole("button", { name: i18n.t("clientOffers.removeFromCart") })).toBeTruthy();
  expect(screen.getByTestId("cart-badge").props.children).toBe("1");
  expect(mockPush).not.toHaveBeenCalled();

  fireEvent.press(screen.getByRole("button", { name: i18n.t("clientOffers.removeFromCart") }));
  await waitFor(() => expect(mockRemoveBasketItem).toHaveBeenCalledWith(501));
  expect(await screen.findByText(i18n.t("clientOffers.removedToast", { part: "Plaquettes" }))).toBeTruthy();
  expect(screen.getByRole("button", { name: i18n.t("clientOffers.addToCart") })).toBeTruthy();
  expect(screen.getByTestId("cart-badge").props.children).toBe("0");
});

it("asks before an offer detail add empties a basket of product lines, and adds only on confirm", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  const productBasket = { ...basketWith([basketLine(640, 5001, 3)]), requestId: null };
  mockGetBasket.mockResolvedValue({ success: true, data: productBasket });
  mockAcceptOffer.mockResolvedValue({ success: true, data: basketWith([basketLine(501, 88)]) });
  const screen = renderWithCart(<OfferDetailScreen />);

  fireEvent.press(await screen.findByRole("button", { name: i18n.t("clientOffers.addToCart") }));

  expect(await screen.findByText(i18n.t("clientOffers.replaceBasketTitle"))).toBeTruthy();
  expect(screen.getByText(i18n.t("clientOffers.replaceBasketBodyNoRef", { count: 3 }))).toBeTruthy();
  expect(mockAcceptOffer).not.toHaveBeenCalled();
  // No request behind the basket: no reference lookup.
  expect(mockGetRequest).toHaveBeenCalledTimes(1);

  fireEvent.press(screen.getByRole("button", { name: i18n.t("clientOffers.replaceBasketConfirm") }));

  await waitFor(() => expect(mockAcceptOffer).toHaveBeenCalledWith(88));
  expect(await screen.findByText(i18n.t("clientOffers.addedToast", { quantity: 1, part: "Plaquettes" }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("clientOffers.replaceBasketTitle"))).toBeNull();
  expect(screen.getByRole("button", { name: i18n.t("clientOffers.removeFromCart") })).toBeTruthy();
  expect(screen.getByTestId("cart-badge").props.children).toBe("1");
});

it("shows a selected offer as in the basket and removes it through the basket line", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, status: "selected" } });
  mockGetBasket.mockResolvedValueOnce({ success: true, data: basketWith([basketLine(640, 88)]) });
  const screen = renderWithCart(<OfferDetailScreen />);

  fireEvent.press(await screen.findByRole("button", { name: i18n.t("clientOffers.removeFromCart") }));

  await waitFor(() => expect(mockRemoveBasketItem).toHaveBeenCalledWith(640));
  expect(mockAcceptOffer).not.toHaveBeenCalled();
  expect(await screen.findByRole("button", { name: i18n.t("clientOffers.addToCart") })).toBeTruthy();
});

it("renders the Figma offer detail blocks in order with the yellow TTC price chip", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  mockGetRequest.mockResolvedValueOnce({ success: true, data: { ...request, status: "validated", expiresAt: inHours(15.5) } });
  mockGetOffer.mockResolvedValueOnce({
    success: true,
    data: { ...offer, priceClient: 402.8, description: "Usure légère", audioUrl: "https://cdn/audio.m4a", brandName: "TRW" },
  });
  const screen = renderWithCart(<OfferDetailScreen />);

  expect(await screen.findByText("402,80 Dhs TTC")).toBeTruthy();
  await waitFor(() => expect(mockSetOptions).toHaveBeenCalledWith({
    title: i18n.t("offerDetail.headerTitle", { name: i18n.t("clientOffers.partWithBrand", { brand: "TRW", part: "Plaquettes" }) }),
  }));
  const texts = [
    i18n.t("Détails de l'offre"),
    i18n.t("En attente de votre commande"),
    i18n.t("offerDetail.sellerRemarks"),
    i18n.t("clientOffers.priceTitle"),
    i18n.t("clientOffers.audio"),
  ];
  const nodes = screen.root.findAll((node) => typeof node.type === "string" && texts.includes(String(node.props.children)));
  const order = nodes.map((node) => String(node.props.children)).filter((text, index, list) => list.indexOf(text) === index);
  expect(order).toEqual(texts);
  expect(screen.getByText(new RegExp(i18n.t("clientOffers.remaining", { value: "" }).trim()))).toBeTruthy();
  expect(screen.getByText(i18n.t("clientOffers.condition", { value: i18n.t("clientOffers.sections.occasion") }))).toBeTruthy();
  expect(screen.getByTestId("audio-player")).toBeTruthy();
  expect(screen.queryByText(i18n.t("requestFlow.acceptOffer"))).toBeNull();
});

it("disables a leftover validated offer after its parent request is ordered", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  mockGetRequest.mockResolvedValueOnce({ success: true, data: { ...request, status: "ordered" } });
  const screen = renderWithCart(<OfferDetailScreen />);

  const add = await screen.findByRole("button", { name: i18n.t("clientOffers.addToCart") });
  expect(add.props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText(i18n.t("requestFlow.offerRequestClosed"))).toBeTruthy();
  fireEvent.press(add);
  expect(mockAcceptOffer).not.toHaveBeenCalled();
});

it("shows vehicle compatibility and links the other parts of the request", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  const item2 = { ...request.items[0], id: 2, categoryId: 13, categoryTitle: "Disques" };
  mockGetRequest.mockResolvedValue({ success: true, data: { ...request, status: "validated", items: [request.items[0], item2] } });
  mockGetOffers.mockResolvedValue({ success: true, data: [offer, { ...offer, id: 90, reference: "OFF-90", requestItemId: 2 }], pagination });
  const screen = renderWithCart(<OfferDetailScreen />);

  expect(await screen.findByLabelText(
    i18n.t("Compatible avec votre {{vehicle}}", { vehicle: "Dacia Logan 2021" }),
  )).toBeTruthy();
  expect(mockGetVehicle).not.toHaveBeenCalled();

  fireEvent.press(await screen.findByRole("button", { name: `${i18n.t("Les offres")} Disques` }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/requests/[requestId]/offers",
    params: { requestId: "73", itemId: "2" },
  });
});

it("reloads the offer silently on refocus so a basket change elsewhere shows", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  const screen = renderWithCart(<OfferDetailScreen />);
  expect(await screen.findByRole("button", { name: i18n.t("clientOffers.addToCart") })).toBeTruthy();

  mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, status: "selected" } });
  await act(async () => { mockFocusCallback?.(); });

  expect(await screen.findByRole("button", { name: i18n.t("clientOffers.removeFromCart") })).toBeTruthy();
  expect(mockGetOffer).toHaveBeenCalledTimes(2);
});

it("ignores a stale first-offer response after a fast sibling-offer hop", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  mockGetOffers.mockResolvedValue({ success: true, data: [], pagination });
  let resolveFirst!: (value: Awaited<ReturnType<typeof getOffer>>) => void;
  const firstOfferPromise = new Promise<Awaited<ReturnType<typeof getOffer>>>((resolve) => { resolveFirst = resolve; });
  const siblingOffer = { ...offer, id: 89, reference: "OFF-89" };
  mockGetOffer
    .mockReturnValueOnce(firstOfferPromise)
    .mockResolvedValueOnce({ success: true, data: siblingOffer });

  const screen = renderWithCart(<OfferDetailScreen />);

  mockParams = { requestId: "73", offerId: "89" };
  // Rerender with the *same* wrapper shape renderWithCart used initially —
  // a different root element type forces React to unmount+remount the
  // whole tree instead of diffing OfferDetailScreen in place.
  screen.rerender(<RequestDraftProvider><CartTestProvider><OfferDetailScreen /></CartTestProvider></RequestDraftProvider>);

  expect(await screen.findByText(i18n.t("requestFlow.reference", { value: "OFF-89" }))).toBeTruthy();

  resolveFirst({ success: true, data: offer });
  await waitFor(() => expect(screen.getByText(i18n.t("requestFlow.reference", { value: "OFF-89" }))).toBeTruthy());
  expect(screen.queryByText(i18n.t("requestFlow.reference", { value: "OFF-88" }))).toBeNull();

  fireEvent.press(screen.getByRole("button", { name: i18n.t("clientOffers.addToCart") }));
  await waitFor(() => expect(mockAcceptOffer).toHaveBeenCalledWith(89));
});

describe("offers per part (Figma List-Commandez_Parts-Specific-parts)", () => {
  const bosch = { ...request.items[0], id: 1, categoryTitle: "Plaquettes", brandName: "Bosch", quantity: 2 };
  const disques = { ...request.items[0], id: 2, categoryId: 13, categoryTitle: "Disques", brandName: null };
  const cheap = { ...offer, id: 27, reference: "OFF-CHEAP", priceClient: 265 };
  const pricey = { ...offer, id: 30, reference: "OFF-PRICEY", priceClient: 402.8 };
  const selected = { ...offer, id: 31, reference: "OFF-SELECTED", priceClient: 318, status: "selected" as const };

  beforeEach(() => {
    mockParams = { requestId: "73", itemId: "1" };
    mockGetRequest.mockResolvedValue({
      success: true,
      data: { ...request, status: "validated", offersCount: 2, expiresAt: inHours(10), items: [bosch, disques] },
    });
    mockGetOffers.mockResolvedValue({ success: true, data: [pricey, selected, cheap], pagination });
  });

  const rowRefs = (screen: ReturnType<typeof renderWithCart>) =>
    screen.getAllByTestId(/^offer-row-/).map((node) => String(node.props.testID).replace("offer-row-", ""));

  it("renders the part title, warning, Occasion section sorted by price and two-decimal prices", async () => {
    const screen = renderWithCart(<OffersListScreen />);

    // Page title + one title per offer row.
    expect(await screen.findAllByText(i18n.t("clientOffers.partWithBrand", { brand: "Bosch", part: "Plaquettes" }))).toHaveLength(4);
    await waitFor(() => expect(mockSetOptions).toHaveBeenCalledWith({ title: i18n.t("offerDetail.headerTitle", { name: "REQ-73" }) }));
    expect(screen.getByText(i18n.t("Veuillez remplir votre commande avant le délai d'expiration"))).toBeTruthy();
    expect(screen.getByText(i18n.t("clientOffers.sections.occasion"))).toBeTruthy();
    expect(screen.queryByText(i18n.t("clientOffers.sections.en_stock"))).toBeNull();
    expect(rowRefs(screen)).toEqual(["OFF-CHEAP", "OFF-SELECTED", "OFF-PRICEY"]);
    expect(screen.getByText("402,80 dhs")).toBeTruthy();
    expect(screen.getAllByText(i18n.t("requestList.quantity", { count: 2 }))).toHaveLength(3);

    fireEvent.press(screen.getByRole("button", { name: i18n.t("clientOffers.sortDesc") }));
    expect(rowRefs(screen)).toEqual(["OFF-PRICEY", "OFF-SELECTED", "OFF-CHEAP"]);
    fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.reference", { value: "OFF-PRICEY" }) }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(client)/requests/[requestId]/offers/[offerId]",
      params: { requestId: "73", offerId: "30" },
    });

    // "Vos autres offres": the other part, without offers, offers a resend.
    expect(screen.getByText(i18n.t("Vos autres offres"))).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: `${i18n.t("requestFlow.resend")} Disques` }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(client)/requests/CreateRequestScreen",
      params: { categoryId: "13", condition: "occasion" },
    });
    expect(screen.UNSAFE_queryAllByType(WhatsappBtn)).toHaveLength(1);
  });

  it("uses each offer's canonical condition and quantity instead of its request item", async () => {
    mockGetOffers.mockResolvedValueOnce({
      success: true,
      data: [{ ...cheap, condition: 'en_stock', quantity: 4 }],
      pagination,
    });
    const screen = renderWithCart(<OffersListScreen />);

    expect(await screen.findByText(i18n.t('clientOffers.sections.en_stock'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('clientOffers.sections.occasion'))).toBeNull();
    expect(screen.getByText(i18n.t('requestList.quantity', { count: 4 }))).toBeTruthy();
  });

  it("adds an offer from its row without leaving the screen, then flips the row to 🗑", async () => {
    mockAcceptOffer.mockResolvedValue({ success: true, data: basketWith([basketLine(700, 27, 2)]) });
    const screen = renderWithCart(<OffersListScreen />);
    const part = i18n.t("clientOffers.partWithBrand", { brand: "Bosch", part: "Plaquettes" });

    const addButtons = await screen.findAllByRole("button", { name: i18n.t("clientOffers.addA11y", { part }) });
    expect(addButtons).toHaveLength(2);
    // The already-selected offer shows 🗑 straight away.
    expect(screen.getAllByRole("button", { name: i18n.t("clientOffers.removeA11y", { part }) })).toHaveLength(1);

    fireEvent.press(addButtons[0]);

    await waitFor(() => expect(mockAcceptOffer).toHaveBeenCalledWith(27));
    expect(await screen.findByText(i18n.t("clientOffers.addedToast", { quantity: 2, part }))).toBeTruthy();
    expect(screen.getAllByRole("button", { name: i18n.t("clientOffers.removeA11y", { part }) })).toHaveLength(2);
    expect(screen.getByTestId("cart-badge").props.children).toBe("2");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("asks before replacing a basket built from another request and only accepts on confirm", async () => {
    const otherRequestBasket = { ...basketWith([basketLine(640, 501), basketLine(641, 502)]), requestId: 55 };
    mockGetBasket.mockResolvedValue({ success: true, data: otherRequestBasket });
    mockGetRequest.mockImplementation((id: number) => Promise.resolve({
      success: true,
      data: id === 55
        ? { ...request, id: 55, reference: "REQ-URHYPPNQ", status: "validated" }
        : { ...request, status: "validated", offersCount: 2, expiresAt: inHours(10), items: [bosch, disques] },
    }));
    mockAcceptOffer.mockResolvedValue({ success: true, data: basketWith([basketLine(700, 27, 2)]) });
    const screen = renderWithCart(<OffersListScreen />);
    const part = i18n.t("clientOffers.partWithBrand", { brand: "Bosch", part: "Plaquettes" });
    const body = i18n.t("clientOffers.replaceBasketBody", { count: 2, reference: "REQ-URHYPPNQ" });

    fireEvent.press((await screen.findAllByRole("button", { name: i18n.t("clientOffers.addA11y", { part }) }))[0]);

    expect(await screen.findByText(i18n.t("clientOffers.replaceBasketTitle"))).toBeTruthy();
    expect(screen.getByText(body)).toBeTruthy();
    expect(mockGetRequest).toHaveBeenCalledWith(55);
    expect(mockAcceptOffer).not.toHaveBeenCalled();
    // The badge follows the fresh server basket while the client decides.
    expect(screen.getByTestId("cart-badge").props.children).toBe("2");

    fireEvent.press(screen.getByRole("button", { name: i18n.t("Annuler") }));
    await waitFor(() => expect(screen.queryByText(i18n.t("clientOffers.replaceBasketTitle"))).toBeNull());
    expect(mockAcceptOffer).not.toHaveBeenCalled();
    expect(screen.getByTestId("cart-badge").props.children).toBe("2");

    fireEvent.press(screen.getAllByRole("button", { name: i18n.t("clientOffers.addA11y", { part }) })[0]);
    expect(await screen.findByText(body)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: i18n.t("clientOffers.replaceBasketConfirm") }));

    await waitFor(() => expect(mockAcceptOffer).toHaveBeenCalledWith(27));
    expect(mockAcceptOffer).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(i18n.t("clientOffers.addedToast", { quantity: 2, part }))).toBeTruthy();
    expect(screen.getByTestId("cart-badge").props.children).toBe("2");
  });

  it("keeps both offers of the same part in the basket when a second one is added (Figma 63-17933)", async () => {
    mockGetBasket.mockResolvedValue({ success: true, data: basketWith([basketLine(812, 31, 2)]) });
    mockAcceptOffer.mockResolvedValue({ success: true, data: basketWith([basketLine(812, 31, 2), basketLine(700, 27, 2)]) });
    const screen = renderWithCart(<OffersListScreen />);
    const part = i18n.t("clientOffers.partWithBrand", { brand: "Bosch", part: "Plaquettes" });

    const addButtons = await screen.findAllByRole("button", { name: i18n.t("clientOffers.addA11y", { part }) });
    expect(addButtons).toHaveLength(2);
    fireEvent.press(addButtons[0]);

    await waitFor(() => expect(mockAcceptOffer).toHaveBeenCalledWith(27));
    // Same request: no confirmation, and the part's other selected offer stays in the basket.
    expect(screen.queryByText(i18n.t("clientOffers.replaceBasketTitle"))).toBeNull();
    expect(await screen.findByText(i18n.t("clientOffers.addedToast", { quantity: 2, part }))).toBeTruthy();
    // OFF-CHEAP joins OFF-SELECTED: two 🗑 rows, one "Ajoutez" row, badge up by the part's quantity.
    expect(screen.getAllByRole("button", { name: i18n.t("clientOffers.removeA11y", { part }) })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: i18n.t("clientOffers.addA11y", { part }) })).toHaveLength(1);
    expect(screen.getByTestId("cart-badge").props.children).toBe("4");
  });

  it("removes a selected offer from its row through the basket line id", async () => {
    mockGetBasket.mockResolvedValue({ success: true, data: basketWith([basketLine(812, 31)]) });
    const screen = renderWithCart(<OffersListScreen />);
    const part = i18n.t("clientOffers.partWithBrand", { brand: "Bosch", part: "Plaquettes" });

    fireEvent.press(await screen.findByRole("button", { name: i18n.t("clientOffers.removeA11y", { part }) }));

    await waitFor(() => expect(mockRemoveBasketItem).toHaveBeenCalledWith(812));
    expect(await screen.findByText(i18n.t("clientOffers.removedToast", { part }))).toBeTruthy();
    expect(screen.queryAllByRole("button", { name: i18n.t("clientOffers.removeA11y", { part }) })).toHaveLength(0);
  });

  it("filters by condition from the Filters sheet, with options without data disabled", async () => {
    mockParams = { requestId: "73" };
    const newItem = { ...disques, condition: "en_stock" as const };
    mockGetRequest.mockResolvedValue({
      success: true,
      data: { ...request, status: "validated", offersCount: 2, expiresAt: inHours(10), items: [bosch, newItem] },
    });
    mockGetOffers.mockResolvedValue({ success: true, data: [cheap, { ...pricey, requestItemId: 2, condition: 'en_stock' as const }], pagination });
    const screen = renderWithCart(<OffersListScreen />);

    expect(await screen.findByText(i18n.t("clientOffers.sections.en_stock"))).toBeTruthy();
    expect(screen.getByText(i18n.t("clientOffers.sections.occasion"))).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: i18n.t("clientOffers.filter") }));
    expect((await screen.findByRole("checkbox", { name: i18n.t("clientOffers.filterProduct") })).props.accessibilityState)
      .toEqual({ checked: false, disabled: true });
    fireEvent.press(screen.getByRole("checkbox", { name: i18n.t("clientOffers.sections.en_stock") }));
    fireEvent.press(screen.getByRole("button", { name: i18n.t("clientOffers.filterApply") }));

    await waitFor(() => expect(rowRefs(screen)).toEqual(["OFF-PRICEY"]));
  });

  it("renders the offers screen and the offer detail in Arabic with localized units and currency", async () => {
    await i18n.changeLanguage("ar");
    const list = renderWithCart(<OffersListScreen />);

    // Same "دم" label as formatDhs and the partner Arabic frames.
    expect(await list.findByText("402,80 دم")).toBeTruthy();
    expect(list.getByText(i18n.t("clientOffers.sections.occasion"))).toBeTruthy();
    list.unmount();

    mockParams = { requestId: "73", offerId: "30" };
    mockGetOffer.mockResolvedValueOnce({ success: true, data: pricey });
    const detail = renderWithCart(<OfferDetailScreen />);

    // The TTC chip reads exactly like the partner offer-detail chip.
    expect(await detail.findByText(`402,80 ${i18n.t("partner.offerDetail.priceTtc")}`)).toBeTruthy();
    expect(detail.getByText("402,80 دم شامل الضرائب")).toBeTruthy();
    expect(detail.getByRole("button", { name: i18n.t("clientOffers.addToCart") })).toBeTruthy();
    // "9 س 59 د متبقية": Arabic hour / minute units and "remaining" suffix.
    expect(detail.getByText(/^\d+ س \d{2} د متبقية$/)).toBeTruthy();
  });

  it("reloads silently on refocus so offers selected elsewhere show their 🗑 state", async () => {
    mockGetOffers.mockResolvedValueOnce({ success: true, data: [cheap], pagination });
    const screen = renderWithCart(<OffersListScreen />);
    const part = i18n.t("clientOffers.partWithBrand", { brand: "Bosch", part: "Plaquettes" });
    expect(await screen.findByRole("button", { name: i18n.t("clientOffers.addA11y", { part }) })).toBeTruthy();

    mockGetOffers.mockResolvedValueOnce({ success: true, data: [{ ...cheap, status: "selected" }], pagination });
    await act(async () => { mockFocusCallback?.(); });

    expect(await screen.findByRole("button", { name: i18n.t("clientOffers.removeA11y", { part }) })).toBeTruthy();
    expect(screen.queryByText(i18n.t("requestFlow.loadError"))).toBeNull();
  });
});
