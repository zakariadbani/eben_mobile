import React from "react";
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
import { ApiClientError } from "@/api/types";
import { CartContext } from "@/context/CartContext";
import { Role, useSession } from "@/context/AuthContext";
import { RequestDraftProvider } from "@/context/RequestDraftContext";
import CreateRequestScreen from "../requests/CreateRequestScreen";
import RequestSuccessScreen from "../requests/success";
import RequestDetailScreen from "../requests/[requestId]";
import OfferDetailScreen from "../requests/[requestId]/offers/[offerId]";
import ArchivedOffersScreen from "../settings/archived-offers";
import WhatsappBtn from "@/components/common/WhatsappBtn";
import { formatCountdown } from "@/helpers/countdown";
import type { Basket } from "@/interfaces/Basket";

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
function CartTestProvider({ children }: { children: React.ReactNode }) {
  const [basket, setBasket] = React.useState<Basket | null>(null);
  const itemCount = basket?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
  return (
    <CartContext.Provider value={{ basket, setBasket, refresh: async () => {}, itemCount }}>
      {children}
    </CartContext.Provider>
  );
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
  status: "validated" as const, adminNotes: null, validatedBy: 2, validatedAt: "2026-01-01",
  createdAt: "2026-01-01", updatedAt: "2026-01-01", images: [],
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  mockFocusCallback = null;
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
    subtotal: 240, discountAmount: 0, shippingFee: 0, taxAmount: 48, total: 288,
    createdAt: "2026-01-01", updatedAt: "2026-01-01", items: [],
  } satisfies Basket;
  mockAcceptOffer.mockResolvedValue({ success: true, data: basket });
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
  const screen = render(<RequestDetailScreen />);

  await screen.findByText("Plaquettes");
  expect(screen.queryByRole("button", { name: i18n.t("Les offres") })).toBeNull();
  expect(screen.queryByText(i18n.t("requestFlow.noOffer"))).toBeNull();
  expect(screen.UNSAFE_queryAllByType(WhatsappBtn)).toHaveLength(0);
  expect(mockGetOffers).not.toHaveBeenCalled();
});

it("shows the request stepper at the matching step for an in-progress request", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    // Deadline relative to now: a fixed date would expire the request (and hide the stepper) once passed.
    data: { ...request, status: "offers_received", offersCount: 1, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() },
  });
  const screen = render(<RequestDetailScreen />);

  expect(await screen.findByLabelText(`${i18n.t("Commandez")}, 2/4`)).toBeTruthy();
});

it("hides the stepper for an expired request", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "expired", offersCount: 0, expiresAt: "2026-08-01T00:00:00.000Z" },
  });
  const screen = render(<RequestDetailScreen />);

  await screen.findByText(i18n.t("requestFlow.requestStatus.expired"));
  expect(screen.queryByLabelText(/1\/4/)).toBeNull();
});

it("shows an expired request as terminal and offers a truthful new-request path", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "expired", offersCount: 0, expiresAt: "2026-08-01T00:00:00.000Z" },
  });
  const screen = render(<RequestDetailScreen />);

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
  const screen = render(<RequestDetailScreen />);

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
  const screen = render(<RequestDetailScreen />);

  expect(await screen.findByLabelText(`${i18n.t("Paiement")}, 3/4`)).toBeTruthy();
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
  const screen = render(<RequestDetailScreen />);

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
  const item1 = { ...request.items[0], id: 1, categoryId: 12, categoryTitle: "Plaquettes" };
  const item2 = { ...request.items[0], id: 2, categoryId: 13, categoryTitle: "Disques", condition: "occasion" as const };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "offers_received", offersCount: 1, expiresAt, items: [item1, item2] },
  });
  mockGetOffers.mockResolvedValueOnce({ success: true, data: [offer], pagination });
  const screen = render(<RequestDetailScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.offersCount", { count: 1 }))).toBeTruthy();
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

it("shows only closed requests in archived offers", async () => {
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
      summary(5, "expired"),
      summary(6, "cancelled"),
    ],
    pagination: { ...pagination, total: 6 },
  });
  const screen = render(<ArchivedOffersScreen />);

  expect(await screen.findByText("REQ-4")).toBeTruthy();
  expect(screen.getByText("REQ-5")).toBeTruthy();
  expect(screen.getByText("REQ-6")).toBeTruthy();
  expect(screen.queryByText("REQ-1")).toBeNull();
  expect(screen.queryByText("REQ-2")).toBeNull();
  expect(screen.queryByText("REQ-3")).toBeNull();
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

it("accepts a validated offer once and routes with the returned basket state", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  const screen = renderWithCart(<OfferDetailScreen />);

  const accept = await screen.findByRole("button", { name: i18n.t("requestFlow.acceptOffer") });
  fireEvent.press(accept);
  fireEvent.press(accept);

  await waitFor(() => expect(mockAcceptOffer).toHaveBeenCalledTimes(1));
  expect(mockAcceptOffer).toHaveBeenCalledWith(88);
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/cart",
    params: { basketId: "19" },
  });
});

it("disables a leftover validated offer after its parent request is ordered", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  mockGetRequest.mockResolvedValueOnce({ success: true, data: { ...request, status: "ordered" } });
  const screen = renderWithCart(<OfferDetailScreen />);

  const accept = await screen.findByRole("button", { name: i18n.t("requestFlow.acceptOffer") });
  expect(accept.props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText(i18n.t("requestFlow.offerRequestClosed"))).toBeTruthy();
  fireEvent.press(accept);
  expect(mockAcceptOffer).not.toHaveBeenCalled();
});

it("shows vehicle compatibility and navigates to a sibling offer", async () => {
  mockParams = { requestId: "73", offerId: "88" };
  const siblingOffer = { ...offer, id: 89, reference: "OFF-89" };
  mockGetOffers.mockResolvedValueOnce({ success: true, data: [offer, siblingOffer], pagination });
  const screen = renderWithCart(<OfferDetailScreen />);

  expect(await screen.findByText(
    i18n.t("Compatible avec votre {{vehicle}}", { vehicle: "Dacia Logan 2021" }),
  )).toBeTruthy();

  fireEvent.press(await screen.findByRole("button", { name: i18n.t("requestFlow.reference", { value: "OFF-89" }) }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/requests/[requestId]/offers/[offerId]",
    params: { requestId: "73", offerId: "89" },
  });
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

  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.acceptOffer") }));
  await waitFor(() => expect(mockAcceptOffer).toHaveBeenCalledWith(89));
});
