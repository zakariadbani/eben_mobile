import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import i18n from "@/localization/i18n";
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
import CreateRequestScreen from "../requests/CreateRequestScreen";
import RequestListScreen from "../requests";
import VerificationScreen from "../requests/verification";
import RequestSuccessScreen from "../requests/success";
import RequestDetailScreen from "../requests/[requestId]";
import OfferDetailScreen from "../requests/[requestId]/offers/[offerId]";
import ArchivedOffersScreen from "../settings/archived-offers";
import WhatsappBtn from "@/components/common/WhatsappBtn";
import type { Basket } from "@/interfaces/Basket";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSetOptions = jest.fn();
let mockParams: Record<string, string | undefined> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@react-navigation/core", () => ({
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));
jest.mock("@/components/common/Button", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  const { useTranslation } = require("react-i18next");
  return function MockButton({ title, onPress, disabled }: { title?: string; onPress?: () => void; disabled?: boolean }) {
    const { t } = useTranslation();
    const label = title ? t(title) : "button";
    return React.createElement(View, {
      accessible: true, accessibilityRole: "button", accessibilityLabel: label,
      accessibilityState: { disabled }, onPress: disabled ? undefined : onPress,
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

// ponytail: OfferDetailScreen calls useCart() (throws outside a provider) —
// this is a lightweight stand-in for CartProvider that skips the real
// provider's useSession()-gated auto-refresh, so this router-level suite
// doesn't also need an AuthContext mock just to satisfy the cart context.
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
const tree = [{
  ...leaf, id: 10, parentId: null, level: 1 as const, title: "Freins", titleAr: "فرامل",
  children: [{ ...leaf, id: 11, parentId: 10, level: 2 as const, title: "Freins avant", children: [leaf] }],
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
  await i18n.changeLanguage("fr");
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
  const screen = render(<CreateRequestScreen />);

  fireEvent.press(await screen.findByRole("button", { name: "Freins" }));
  fireEvent.press(screen.getByRole("button", { name: "Freins avant" }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.addPart", { name: "Plaquettes" }) }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.addImage") }));
  await screen.findByLabelText("file:///part.jpg");
  expect(screen.getByLabelText(i18n.t("Diminuer la quantité")).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByLabelText(i18n.t("Augmenter la quantité")));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));

  await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledWith({
    vehicleId: 42,
    items: [{ categoryId: 12, quantity: 2, condition: "occasion" }],
    notes: null,
    images: ["tmp/mobile/5/image.jpg"],
  }));
  expect(mockUploadLocalImages).toHaveBeenCalledWith(["file:///part.jpg"]);
  expect(mockUploadLocalImages.mock.invocationCallOrder[0]).toBeLessThan(mockCreateRequest.mock.invocationCallOrder[0]);
  expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
    pathname: "/(client)/requests/verification",
    params: { requestId: "73", reference: "REQ-73" },
  }));
});

it("preserves the draft and uploaded paths across a Laravel validation error", async () => {
  mockCreateRequest
    .mockRejectedValueOnce(new ApiClientError("Validation failed", 422, { "items.0.categoryId": ["Leaf required"] }))
    .mockResolvedValueOnce({ success: true, data: { id: 73, reference: "REQ-73" } });
  const screen = render(<CreateRequestScreen />);

  fireEvent.press(await screen.findByRole("button", { name: "Freins" }));
  fireEvent.press(screen.getByRole("button", { name: "Freins avant" }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.addPart", { name: "Plaquettes" }) }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.addImage") }));
  await screen.findByLabelText("file:///part.jpg");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));

  expect(await screen.findByText("Leaf required")).toBeTruthy();
  expect(screen.getByText("Plaquettes")).toBeTruthy();
  expect(screen.getByLabelText("file:///part.jpg")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.verify") }));
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

it("shows request status separately from a pending countdown", async () => {
  mockGetRequests.mockResolvedValueOnce({
    success: true,
    data: [
      { id: 1, reference: "REQ-1", status: "offers_received", expiresDisplay: "1h 30min", createdAt: "2026-08-01" },
      { id: 2, reference: "REQ-2", status: "pending", expiresDisplay: "45min", createdAt: "2026-08-01" },
    ],
    pagination: { ...pagination, total: 2 },
  });

  const screen = render(<RequestListScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.requestStatus.offers_received"))).toBeTruthy();
  expect(screen.getByText(i18n.t("requestFlow.requestStatus.pending"))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.expiresIn", { value: "45min" }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("home.expiresIn", { value: "1h 30min" }))).toBeNull();
  expect(screen.UNSAFE_queryAllByType(WhatsappBtn)).toHaveLength(0);
});

it("shows live request empty state and retries a failed list read", async () => {
  mockGetRequests.mockRejectedValueOnce(new Error("offline"));
  const screen = render(<RequestListScreen />);

  const retry = await screen.findByRole("button", { name: i18n.t("requestFlow.retry") });
  fireEvent.press(retry);
  expect(await screen.findByText(i18n.t("requestFlow.requestsEmpty"))).toBeTruthy();
  expect(screen.getByText(i18n.t("requestFlow.requestsEmptyBody"))).toBeTruthy();
  expect(screen.getAllByRole("button", { name: i18n.t("requestFlow.create") })).toHaveLength(2);
  expect(mockGetRequests).toHaveBeenCalledTimes(2);
});

it("keeps unvalidated offer counts from enabling the request offers action", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "offers_received", offersCount: 0 },
  });
  const screen = render(<RequestDetailScreen />);

  const button = await screen.findByRole("button", { name: i18n.t("requestFlow.waitingOffers") });
  expect(button.props.accessibilityState.disabled).toBe(true);
  expect(screen.UNSAFE_queryAllByType(WhatsappBtn)).toHaveLength(0);
});

it("shows the request stepper at the matching step for an in-progress request", async () => {
  mockParams = { requestId: "73" };
  mockGetRequest.mockResolvedValueOnce({
    success: true,
    data: { ...request, status: "offers_received", offersCount: 1, expiresAt: "2026-09-10T00:00:00.000Z" },
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
  const screen = render(<RequestDetailScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.requestStatus.validated"))).toBeTruthy();
  expect(screen.queryByText(i18n.t("requestFlow.requestStatus.expired"))).toBeNull();
  expect(screen.getByRole("button", { name: i18n.t("requestFlow.viewOffers") })).toBeTruthy();
  expect(await screen.findByLabelText(`${i18n.t("Paiement")}, 3/4`)).toBeTruthy();
  expect(screen.queryByText(i18n.t("Restant"))).toBeNull();
  expect(screen.queryByText(i18n.t("Expiré"))).toBeNull();
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
  mockParams = { requestId: "73", reference: "stale-ref" };
  const screen = render(<VerificationScreen />);

  expect(await screen.findByText("Plaquettes")).toBeTruthy();
  const send = screen.getByRole("button", { name: i18n.t("requestFlow.send") });
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
  screen.rerender(<CartTestProvider><OfferDetailScreen /></CartTestProvider>);

  expect(await screen.findByText(i18n.t("requestFlow.reference", { value: "OFF-89" }))).toBeTruthy();

  resolveFirst({ success: true, data: offer });
  await waitFor(() => expect(screen.getByText(i18n.t("requestFlow.reference", { value: "OFF-89" }))).toBeTruthy());
  expect(screen.queryByText(i18n.t("requestFlow.reference", { value: "OFF-88" }))).toBeNull();

  fireEvent.press(screen.getByRole("button", { name: i18n.t("requestFlow.acceptOffer") }));
  await waitFor(() => expect(mockAcceptOffer).toHaveBeenCalledWith(89));
});
