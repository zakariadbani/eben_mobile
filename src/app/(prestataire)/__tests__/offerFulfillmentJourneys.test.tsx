import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import i18n from "@/localization/i18n";
import { ApiClientError } from "@/api/types";
import { uploadLocalImages } from "@/api/resources/uploads";
import {
  declineRequest,
  getOfferShipment,
  getPrestataireIncomingRequests,
  getPrestataireOffer,
  getPrestataireOffers,
  resendOffer,
  shipOffer,
  submitOffer,
} from "@/api/resources/prestataire";
import type { PrestataireOffer, PrestataireShipment } from "@/interfaces/Offer";
import type { Request } from "@/interfaces/Request";
import OfferDetailScreen from "../offers/[offerId]";
import OfferFillScreen from "../offers/[offerId]/fill";
import OfferShipScreen from "../offers/[offerId]/ship";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string | undefined> = {};
let mockNextImageUris: string[] = [];
let mockFocusCleanup: (() => void) | null = null;

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactModule = require("react") as typeof React;
    ReactModule.useEffect(() => {
      const cleanup = callback();
      mockFocusCleanup = typeof cleanup === "function" ? cleanup : null;
      return cleanup;
    }, [callback]);
  },
}));
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
jest.mock("@/components/common/ImageInputList", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  const { useTranslation } = require("react-i18next");
  return function MockImageInputList({
    imageUris,
    defaultimageUris,
    onAddImage,
  }: {
    imageUris?: string[];
    defaultimageUris?: string[];
    onAddImage?: (uri: string) => void;
  }) {
    const { t } = useTranslation();
    const images = imageUris ?? defaultimageUris ?? [];
    return React.createElement(View, null,
      React.createElement(View, {
        accessible: true,
        accessibilityRole: "button",
        accessibilityLabel: t("requestFlow.addImage"),
        onPress: () => {
          const uri = mockNextImageUris.shift();
          if (uri) onAddImage?.(uri);
        },
      }, React.createElement(Text, null, t("requestFlow.addImage"))),
      ...images.map((uri) => React.createElement(View, { key: uri, accessibilityLabel: uri })),
    );
  };
});
jest.mock("@/components/common/PickerInput", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockPicker({
    items,
    onSelectItem,
  }: {
    items: { id: number; title: string }[];
    onSelectItem: (item: { id: number; title: string }) => void;
  }) {
    return React.createElement(View, null, ...items.map((item) => React.createElement(View, {
      key: item.id,
      accessible: true,
      accessibilityRole: "button",
      accessibilityLabel: item.title,
      onPress: () => onSelectItem(item),
    }, React.createElement(Text, null, item.title))));
  };
});
jest.mock("@/components/common/ConfirmModal", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  const { useTranslation } = require("react-i18next");
  return function MockConfirmModal({ visible, children, primaryButton }: {
    visible: boolean;
    children?: React.ReactNode;
    primaryButton?: { title: string; onPress: () => void; disabled?: boolean };
  }) {
    const { t } = useTranslation();
    if (!visible) return null;
    const label = primaryButton ? t(primaryButton.title) : "confirm";
    return React.createElement(View, null, children, primaryButton
      ? React.createElement(View, {
          accessible: true,
          accessibilityRole: "button",
          accessibilityLabel: label,
          accessibilityState: { disabled: primaryButton.disabled },
          onPress: primaryButton.disabled ? undefined : primaryButton.onPress,
        }, React.createElement(Text, null, label))
      : null);
  };
});
jest.mock("@/components/common/CustomModal", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  const { useTranslation } = require("react-i18next");
  return function MockCustomModal({ visible, children, primaryButton }: {
    visible: boolean;
    children?: React.ReactNode;
    primaryButton?: { title: string; onPress: () => void; disabled?: boolean };
  }) {
    const { t } = useTranslation();
    if (!visible) return null;
    const label = primaryButton ? t(primaryButton.title) : "confirm";
    return React.createElement(View, null, children, primaryButton
      ? React.createElement(View, {
          accessible: true,
          accessibilityRole: "button",
          accessibilityLabel: label,
          accessibilityState: { disabled: primaryButton.disabled },
          onPress: primaryButton.disabled ? undefined : primaryButton.onPress,
        }, React.createElement(Text, null, label))
      : null);
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
jest.mock("@/api/resources/uploads", () => ({ uploadLocalImages: jest.fn() }));
jest.mock("@/api/resources/prestataire", () => ({
  declineRequest: jest.fn(),
  getOfferShipment: jest.fn(),
  getPrestataireIncomingRequests: jest.fn(),
  getPrestataireOffer: jest.fn(),
  getPrestataireOffers: jest.fn(),
  resendOffer: jest.fn(),
  shipOffer: jest.fn(),
  submitOffer: jest.fn(),
}));

const mockUploadLocalImages = uploadLocalImages as jest.MockedFunction<typeof uploadLocalImages>;
const mockDeclineRequest = declineRequest as jest.MockedFunction<typeof declineRequest>;
const mockGetOfferShipment = getOfferShipment as jest.MockedFunction<typeof getOfferShipment>;
const mockGetIncoming = getPrestataireIncomingRequests as jest.MockedFunction<typeof getPrestataireIncomingRequests>;
const mockGetOffer = getPrestataireOffer as jest.MockedFunction<typeof getPrestataireOffer>;
const mockGetOffers = getPrestataireOffers as jest.MockedFunction<typeof getPrestataireOffers>;
const mockResendOffer = resendOffer as jest.MockedFunction<typeof resendOffer>;
const mockShipOffer = shipOffer as jest.MockedFunction<typeof shipOffer>;
const mockSubmitOffer = submitOffer as jest.MockedFunction<typeof submitOffer>;

const pagination = { currentPage: 1, lastPage: 1, perPage: 20, total: 1, from: 1, to: 1 };
const incomingRequest = {
  id: 33,
  reference: "REQ-33",
  userId: 7,
  vehicleId: 8,
  addressId: null,
  notes: "Two requested parts",
  status: "pending",
  aiValidationTag: null,
  aiValidationReason: null,
  offersCount: 0,
  expiresAt: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  items: [
    { id: 8, requestId: 33, categoryId: 31, quantity: 1, condition: "occasion", notes: null, createdAt: "2026-08-01", updatedAt: "2026-08-01", categoryTitle: "Plaquettes" },
    { id: 9, requestId: 33, categoryId: 32, quantity: 2, condition: "en_stock", notes: null, createdAt: "2026-08-01", updatedAt: "2026-08-01", categoryTitle: "Disques" },
  ],
  images: ["https://cdn.example/request.jpg"],
} satisfies Request;
const offer = {
  id: 401,
  reference: "OFF-401",
  requestId: 33,
  requestItemId: 8,
  condition: "en_stock",
  quantity: 4,
  priceFerrailleur: 250,
  description: "Plaquettes disponibles",
  audioUrl: null,
  availability: "available",
  status: "selected",
  adminNotes: null,
  validatedAt: "2026-08-01T10:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  images: ["https://cdn.example/offer.jpg"],
  categoryTitle: "Plaquettes",
  categoryTitleAr: "Plaquettes AR",
  categoryImage: null,
  ferrailleurName: "Garage",
  shippingEligible: true,
} satisfies PrestataireOffer;
const shipment = {
  offerId: 401,
  trackingNumber: "TRACK-1",
  carrier: "Amana",
  notes: "Fragile",
  shippedAt: "2026-08-02T12:00:00.000Z",
} satisfies PrestataireShipment;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => { resolve = resolver; });
  return { promise, resolve };
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = { offerId: "33" };
  mockNextImageUris = [];
  mockFocusCleanup = null;
  await i18n.changeLanguage("fr");
  mockGetIncoming.mockResolvedValue({ success: true, data: [incomingRequest], pagination });
  mockGetOffer.mockResolvedValue({ success: true, data: offer });
  mockGetOffers.mockResolvedValue({ success: true, data: [offer], pagination });
  mockGetOfferShipment.mockResolvedValue({ success: true, data: null });
  mockUploadLocalImages.mockImplementation(async (uris) => uris.map((uri) => `tmp/mobile/14/${uri.split("/").pop()}`));
  mockSubmitOffer.mockResolvedValue({ success: true, data: { success: true, offerId: 402 } });
  mockDeclineRequest.mockResolvedValue({ success: true, data: { success: true, requestId: 33 } });
  mockResendOffer.mockResolvedValue({ success: true, data: { success: true, offerId: 401 } });
  mockShipOffer.mockResolvedValue({ success: true, data: { offerId: 401, shipped: true } });
});

it("requires a positive raw price and at least one image for every offer line", async () => {
  const screen = render(<OfferFillScreen />);
  const priceInputs = await screen.findAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"));
  fireEvent.changeText(priceInputs[0], "250");
  fireEvent.changeText(priceInputs[1], "300");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.ctaSend") }));

  expect(await screen.findAllByText(i18n.t("requestFlow.noPhoto"))).toHaveLength(2);
  expect(mockUploadLocalImages).not.toHaveBeenCalled();
  expect(mockSubmitOffer).not.toHaveBeenCalled();
});

it("uploads multi-line local images in order, submits raw prices only, and retries 422 without re-uploading", async () => {
  mockNextImageUris = ["file:///a.jpg", "content://picker/b.png"];
  mockSubmitOffer
    .mockRejectedValueOnce(new ApiClientError("Validation failed", 422, { "lines.0.priceFerrailleur": ["Prix refusé"] }))
    .mockResolvedValueOnce({ success: true, data: { success: true, offerId: 402 } });
  const screen = render(<OfferFillScreen />);
  const addButtons = await screen.findAllByRole("button", { name: i18n.t("requestFlow.addImage") });
  fireEvent.press(addButtons[0]);
  fireEvent.press(addButtons[1]);
  const priceInputs = screen.getAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"));
  fireEvent.changeText(priceInputs[0], "250");
  fireEvent.changeText(priceInputs[1], "300.5");
  const submit = screen.getByRole("button", { name: i18n.t("partner.fill.ctaSend") });
  fireEvent.press(submit);

  expect(await screen.findByText("Prix refusé")).toBeTruthy();
  expect(mockUploadLocalImages).toHaveBeenCalledWith(["file:///a.jpg", "content://picker/b.png"]);
  expect(mockSubmitOffer).toHaveBeenCalledWith(33, {
    lines: [
      { requestItemId: 8, priceFerrailleur: 250, condition: "occasion", description: null, images: ["tmp/mobile/14/a.jpg"] },
      { requestItemId: 9, priceFerrailleur: 300.5, condition: "en_stock", description: null, images: ["tmp/mobile/14/b.png"] },
    ],
  });
  expect(mockSubmitOffer.mock.calls[0]?.[1]).not.toEqual(expect.objectContaining({ priceClient: expect.anything() }));

  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.ctaSend") }));
  await waitFor(() => expect(mockSubmitOffer).toHaveBeenCalledTimes(2));
  expect(mockUploadLocalImages).toHaveBeenCalledTimes(1);
});

it("declines with the selected reason and comment once", async () => {
  mockParams = { offerId: "33", state: "decline" };
  const pending = deferred<Awaited<ReturnType<typeof declineRequest>>>();
  mockDeclineRequest.mockReturnValue(pending.promise);
  const screen = render(<OfferFillScreen />);
  await screen.findAllByText("Plaquettes");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.decline.reason1") }));
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.decline.commentPlaceholder")), "Pas en stock");
  const decline = screen.getByRole("button", { name: i18n.t("partner.decline.ctaConfirm") });
  fireEvent.press(decline);
  fireEvent.press(decline);

  expect(mockDeclineRequest).toHaveBeenCalledTimes(1);
  expect(mockDeclineRequest).toHaveBeenCalledWith(33, { reason: i18n.t("partner.decline.reason1"), comment: "Pas en stock" });
  pending.resolve({ success: true, data: { success: true, requestId: 33 } });
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
});

it("resends the existing backend offer once without uploading its public URLs", async () => {
  mockParams = { offerId: "33", mode: "resend", existingOfferId: "401" };
  const pending = deferred<Awaited<ReturnType<typeof resendOffer>>>();
  mockResendOffer.mockReturnValue(pending.promise);
  const screen = render(<OfferFillScreen />);
  const resend = await screen.findByRole("button", { name: i18n.t("partner.fill.ctaResend") });
  fireEvent.press(resend);
  fireEvent.press(resend);

  expect(mockResendOffer).toHaveBeenCalledTimes(1);
  expect(mockResendOffer).toHaveBeenCalledWith(401);
  expect(mockGetIncoming).not.toHaveBeenCalled();
  expect(mockUploadLocalImages).not.toHaveBeenCalled();
  pending.resolve({ success: true, data: { success: true, offerId: 401 } });
  expect(await screen.findByText(i18n.t("partner.fill.successTitleResend"))).toBeTruthy();
});

it("loads a new-offer request returned after the first incoming page", async () => {
  mockParams = { offerId: "44" };
  const pageTwoRequest = {
    ...incomingRequest,
    id: 44,
    reference: "REQ-44",
    items: [{ ...incomingRequest.items[0], id: 18, requestId: 44, categoryTitle: "Page two part" }],
  } satisfies Request;
  mockGetIncoming.mockResolvedValueOnce({
    success: true,
    data: [incomingRequest, pageTwoRequest],
    pagination: { ...pagination, total: 2, lastPage: 2 },
  });

  const screen = render(<OfferFillScreen />);

  expect(await screen.findAllByText("Page two part")).not.toHaveLength(0);
  expect(mockGetIncoming).toHaveBeenCalledTimes(1);
});

it.each(["0", "-1", "9007199254740992", "abc"])("rejects invalid request id %s without an API call", async (offerId) => {
  mockParams = { offerId };
  const screen = render(<OfferFillScreen />);

  expect(await screen.findByText(i18n.t("partner.fill.notFound"))).toBeTruthy();
  expect(mockGetIncoming).not.toHaveBeenCalled();
  expect(mockGetOffer).not.toHaveBeenCalled();
});

it("rejects an unsafe offer detail id without an API call", async () => {
  mockParams = { offerId: "9007199254740992" };
  const screen = render(<OfferDetailScreen />);

  expect(await screen.findByText(i18n.t("partner.offerDetail.notFound"))).toBeTruthy();
  expect(mockGetOffer).not.toHaveBeenCalled();
  expect(mockGetOfferShipment).not.toHaveBeenCalled();
  expect(mockGetOffers).not.toHaveBeenCalled();
});

it("rejects an invalid shipment id without an API call", async () => {
  mockParams = { offerId: "0" };
  const screen = render(<OfferShipScreen />);

  expect(await screen.findByText(i18n.t("partner.offerDetail.loadError"))).toBeTruthy();
  expect(mockGetOffer).not.toHaveBeenCalled();
  expect(mockGetOfferShipment).not.toHaveBeenCalled();
});

it("uses shipment read-back instead of offer notes to decide whether shipping is available", async () => {
  mockParams = { offerId: "401" };
  mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, adminNotes: "expédié manuellement" } });
  const screen = render(<OfferDetailScreen />);

  expect(await screen.findByRole("button", { name: i18n.t("partner.offerDetail.ctaShip") })).toBeTruthy();
  expect(mockGetOfferShipment).toHaveBeenCalledWith(401);
});

it("does not infer shipped state from a route param when shipment read-back is empty", async () => {
  mockParams = { offerId: "401", state: "shipped" };
  const screen = render(<OfferShipScreen />);

  expect(await screen.findByRole("button", { name: i18n.t("partner.ship.readyCta") })).toBeTruthy();
});

it("hides shipment actions when the backend marks a selected offer ineligible", async () => {
  mockParams = { offerId: "401" };
  mockGetOffer.mockResolvedValue({ success: true, data: { ...offer, shippingEligible: false } });
  const detail = render(<OfferDetailScreen />);
  await detail.findAllByText("Plaquettes disponibles");
  expect(detail.queryByRole("button", { name: i18n.t("partner.offerDetail.ctaShip") })).toBeNull();
  detail.unmount();

  const shipping = render(<OfferShipScreen />);
  await shipping.findAllByText("Plaquettes disponibles");
  expect(shipping.queryByRole("button", { name: i18n.t("partner.ship.readyCta") })).toBeNull();
});

it("dismisses shipment modals when the route loses focus", async () => {
  mockParams = { offerId: "401" };
  const screen = render(<OfferShipScreen />);
  fireEvent.press(await screen.findByRole("button", { name: i18n.t("partner.ship.readyCta") }));
  expect(screen.getByRole("button", { name: i18n.t("partner.ship.ctaConfirm") })).toBeTruthy();
  act(() => { mockFocusCleanup?.(); });
  expect(screen.queryByRole("button", { name: i18n.t("partner.ship.ctaConfirm") })).toBeNull();
});

it("blocks shipping for a non-selected offer and renders canonical condition and quantity", async () => {
  mockParams = { offerId: "401" };
  mockGetOffer.mockResolvedValue({ success: true, data: { ...offer, status: "validated" } });
  const detail = render(<OfferDetailScreen />);

  expect(await detail.findByText(i18n.t("partner.fill.conditionEnStock"))).toBeTruthy();
  expect(detail.getByText("4")).toBeTruthy();
  expect(detail.queryByRole("button", { name: i18n.t("partner.offerDetail.ctaShip") })).toBeNull();
  detail.unmount();

  const shipping = render(<OfferShipScreen />);
  expect(await shipping.findByText(i18n.t("partner.fill.conditionEnStock"))).toBeTruthy();
  expect(shipping.getByText("4")).toBeTruthy();
  expect(shipping.queryByRole("button", { name: i18n.t("partner.ship.readyCta") })).toBeNull();
});

it("formats offer dates with the active Arabic locale", async () => {
  await i18n.changeLanguage("ar");
  mockParams = { offerId: "401" };
  const screen = render(<OfferDetailScreen />);

  expect(await screen.findByText("01 غشت 2026")).toBeTruthy();
});

it("validates shipment fields, sends them once, and renders the shipment read-back", async () => {
  mockParams = { offerId: "401" };
  mockGetOfferShipment
    .mockResolvedValueOnce({ success: true, data: null })
    .mockResolvedValueOnce({ success: true, data: shipment });
  const screen = render(<OfferShipScreen />);
  fireEvent.press(await screen.findByRole("button", { name: i18n.t("partner.ship.readyCta") }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.ship.ctaConfirm") }));
  expect(await screen.findByText(i18n.t("partner.ship.errorRequired"))).toBeTruthy();
  expect(mockShipOffer).not.toHaveBeenCalled();

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.ship.trackingPlaceholder")), " TRACK-1 ");
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.ship.carrierPlaceholder")), " Amana ");
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.ship.notesPlaceholder")), " Fragile ");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.ship.ctaConfirm") }));
  const confirm = screen.getByRole("button", { name: i18n.t("partner.ship.confirmCta") });
  fireEvent.press(confirm);
  fireEvent.press(confirm);

  await waitFor(() => expect(mockShipOffer).toHaveBeenCalledTimes(1));
  expect(mockShipOffer).toHaveBeenCalledWith(401, { trackingNumber: "TRACK-1", carrier: "Amana", notes: "Fragile" });
  await waitFor(() => expect(mockGetOfferShipment).toHaveBeenCalledTimes(2));
  expect(await screen.findByText("TRACK-1")).toBeTruthy();
});

it("maps Laravel shipment validation fields and preserves the entered shipment", async () => {
  mockParams = { offerId: "401" };
  mockShipOffer.mockRejectedValueOnce(new ApiClientError("Validation failed", 422, {
    trackingNumber: ["Référence refusée"],
    carrier: ["Transporteur refusé"],
    notes: ["Remarque refusée"],
  }));
  const screen = render(<OfferShipScreen />);
  fireEvent.press(await screen.findByRole("button", { name: i18n.t("partner.ship.readyCta") }));
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.ship.trackingPlaceholder")), "TRACK-X");
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.ship.carrierPlaceholder")), "Carrier X");
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.ship.notesPlaceholder")), "Notes X");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.ship.ctaConfirm") }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.ship.confirmCta") }));

  expect(await screen.findByText("Référence refusée")).toBeTruthy();
  expect(screen.getByText("Transporteur refusé")).toBeTruthy();
  expect(screen.getByText("Remarque refusée")).toBeTruthy();
  expect(screen.getByDisplayValue("TRACK-X")).toBeTruthy();
  expect(screen.getByDisplayValue("Carrier X")).toBeTruthy();
  expect(screen.getByDisplayValue("Notes X")).toBeTruthy();
  expect(mockGetOfferShipment).toHaveBeenCalledTimes(1);
});
