import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, ScrollView, StyleSheet } from "react-native";

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
import { formatPartnerDateTime } from "@/components/screens/prestataire/PartnerDetailBlocks";
import { offerStatusLabelKey, statusColor } from "@/helpers/partnerStatus";
import OfferDetailScreen from "../offers/[offerId]";
import OfferFillScreen from "../offers/[offerId]/fill";
import OfferShipScreen from "../offers/[offerId]/ship";
import Colors from "@/constants/Colors";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string | undefined> = {};
let mockNextImageUris: string[] = [];
let mockFocusCleanup: (() => void) | null = null;
let mockFocusCallback: (() => void | (() => void)) | null = null;

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
      mockFocusCallback = callback;
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
  brandName: null,
  brandNameAr: null,
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
  mockFocusCallback = null;
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

it("shows only the requested part in the header when opened with itemId, with a single offer line", async () => {
  const requestWithBrand = {
    ...incomingRequest,
    items: [
      { ...incomingRequest.items[0], brandId: 1, brandName: "RIDEX", brandNameAr: "ريدكس" },
      { ...incomingRequest.items[1], brandId: 2, brandName: "Brembo", brandNameAr: "بريمبو" },
    ],
  };
  mockGetIncoming.mockResolvedValue({ success: true, data: [requestWithBrand], pagination });
  mockParams = { offerId: "33", itemId: "9" };
  const screen = render(<OfferFillScreen />);

  expect(await screen.findAllByText("Disques")).toHaveLength(1);
  expect(screen.getAllByText(i18n.t("requestList.brand", { value: "Brembo" }))).toHaveLength(1);
  expect(screen.queryByText("Plaquettes")).toBeNull();
  expect(screen.queryByText(i18n.t("requestList.brand", { value: "RIDEX" }))).toBeNull();
  expect(screen.getAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"))).toHaveLength(1);
  expect(screen.getByText(i18n.t("partner.ship.vehicleFallback"))).toBeTruthy();
});

it("falls back to the default header when itemId does not match any request line", async () => {
  const requestWithBrand = {
    ...incomingRequest,
    items: [
      { ...incomingRequest.items[0], brandId: 1, brandName: "RIDEX", brandNameAr: "ريدكس" },
      { ...incomingRequest.items[1], brandId: 2, brandName: "Brembo", brandNameAr: "بريمبو" },
    ],
  };
  mockGetIncoming.mockResolvedValue({ success: true, data: [requestWithBrand], pagination });
  mockParams = { offerId: "33", itemId: "9999" };
  const screen = render(<OfferFillScreen />);

  expect(await screen.findAllByText("Plaquettes")).toHaveLength(1);
  expect(screen.getAllByText(i18n.t("requestList.brand", { value: "RIDEX" }))).toHaveLength(1);
  expect(screen.queryByText("Disques")).toBeNull();
  expect(screen.getAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"))).toHaveLength(1);
});

/** Adding an offer folds the previous lines; reopen one by tapping its "Offre N" header. */
const addOfferLineAndExpandAll = (screen: ReturnType<typeof render>) => {
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.addAnotherOffer") }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.offerLabel", { count: 1 }) }));
};

it("renders the request images in the shared hero slider", async () => {
  const screen = render(<OfferFillScreen />);

  expect(await screen.findByTestId("image-slider")).toBeTruthy();
  expect(screen.queryByText(i18n.t("requestFlow.noPhoto"))).toBeNull();
});

it("adds a second offer line for the same part and removes it again", async () => {
  const screen = render(<OfferFillScreen />);
  expect(await screen.findAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"))).toHaveLength(1);
  expect(screen.queryByRole("button", { name: i18n.t("partner.fill.removeOffer", { count: 1 }) })).toBeNull();

  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.addAnotherOffer") }));
  // The previous offer folds and the added one opens; the trash only sits on the added offer.
  expect(screen.getAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"))).toHaveLength(1);
  expect(screen.getByRole("button", { name: i18n.t("partner.fill.offerLabel", { count: 1 }) }).props.accessibilityState).toEqual({ expanded: false });
  expect(screen.getByRole("button", { name: i18n.t("partner.fill.offerLabel", { count: 2 }) }).props.accessibilityState).toEqual({ expanded: true });
  expect(screen.queryByRole("button", { name: i18n.t("partner.fill.removeOffer", { count: 1 }) })).toBeNull();

  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.removeOffer", { count: 2 }) }));
  // Removing the open offer reopens the remaining one.
  expect(screen.getAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"))).toHaveLength(1);
  expect(screen.getByRole("button", { name: i18n.t("partner.fill.offerLabel", { count: 1 }) }).props.accessibilityState).toEqual({ expanded: true });
  expect(screen.queryByRole("button", { name: i18n.t("partner.fill.removeOffer", { count: 1 }) })).toBeNull();
  expect(screen.queryByText(i18n.t("partner.fill.offerLabel", { count: 2 }))).toBeNull();
});

it("labels the client's request note with the general note key", async () => {
  const screen = render(<OfferFillScreen />);

  expect(await screen.findByText(i18n.t("partner.fill.clientGeneralNote"))).toBeTruthy();
  expect(screen.getByText("Two requested parts")).toBeTruthy();
});

it("requires a positive raw price and at least one image for every offer line", async () => {
  const screen = render(<OfferFillScreen />);
  expect(await screen.findAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"))).toHaveLength(1);
  addOfferLineAndExpandAll(screen);
  const priceInputs = screen.getAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"));
  expect(priceInputs).toHaveLength(2);
  expect(screen.getByText(i18n.t("partner.fill.openDetailTitle"))).toBeTruthy();
  expect(screen.queryByText(i18n.t("partner.fill.title"))).toBeNull();
  const sendButton = () => screen.getByRole("button", { name: i18n.t("partner.fill.ctaSend") });
  expect(sendButton().props.accessibilityState).toEqual({ disabled: true });
  fireEvent.changeText(priceInputs[0], "250");
  fireEvent.changeText(priceInputs[1], "300");
  expect(sendButton().props.accessibilityState).toEqual({ disabled: true });
  // Tapping the still-disabled CTA reveals what is missing instead of submitting.
  fireEvent.press(sendButton());

  expect(await screen.findAllByText(i18n.t("requestFlow.noPhoto"))).toHaveLength(2);
  expect(mockUploadLocalImages).not.toHaveBeenCalled();
  expect(mockSubmitOffer).not.toHaveBeenCalled();

  mockNextImageUris = ["file:///a.jpg", "file:///b.jpg"];
  const addButtons = screen.getAllByRole("button", { name: i18n.t("requestFlow.addImage") });
  fireEvent.press(addButtons[0]);
  expect(sendButton().props.accessibilityState).toEqual({ disabled: true });
  fireEvent.press(addButtons[1]);
  expect(screen.queryAllByText(i18n.t("requestFlow.noPhoto"))).toHaveLength(0);
  expect(sendButton().props.accessibilityState).toEqual({ disabled: false });

  fireEvent.changeText(priceInputs[1], "0");
  expect(sendButton().props.accessibilityState).toEqual({ disabled: true });
});

it("keeps the Dhs suffix inside the price field without a TTC echo and shows the Arabic countdown", async () => {
  mockGetIncoming.mockResolvedValue({
    success: true,
    data: [{ ...incomingRequest, expiresAt: new Date(Date.now() + 30 * 60_000 + 30_000).toISOString() }],
    pagination,
  });
  const screen = render(<OfferFillScreen />);
  const [priceInput] = await screen.findAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"));
  fireEvent.changeText(priceInput!, "300");

  expect(screen.getByText(i18n.t("partner.currency"))).toBeTruthy();
  expect(screen.queryByText("300.00 Dhs TTC")).toBeNull();
  const timer = screen.getByText(`0h 30min ${i18n.t("partner.fill.timerRestante")}`);
  expect(timer.props.style).toEqual(expect.arrayContaining([{ color: Colors.red }]));
  screen.unmount();

  await i18n.changeLanguage("ar");
  const arabic = render(<OfferFillScreen />);
  expect(await arabic.findByText("0 س 30 دقيقة متبقية")).toBeTruthy();
  expect(arabic.getByText(i18n.t("partner.fill.openDetailTitle"))).toBeTruthy();
});

it("surfaces a generic upload failure immediately", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  mockNextImageUris = ["file:///a.jpg", "file:///b.jpg"];
  mockUploadLocalImages.mockRejectedValueOnce(new Error("upload failed"));
  const screen = render(<OfferFillScreen />);
  await screen.findAllByRole("button", { name: i18n.t("requestFlow.addImage") });
  addOfferLineAndExpandAll(screen);
  const addButtons = screen.getAllByRole("button", { name: i18n.t("requestFlow.addImage") });
  fireEvent.press(addButtons[0]);
  fireEvent.press(addButtons[1]);
  const priceInputs = screen.getAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"));
  fireEvent.changeText(priceInputs[0], "250");
  fireEvent.changeText(priceInputs[1], "300");

  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.ctaSend") }));

  await waitFor(() => expect(alert).toHaveBeenCalledWith(
    i18n.t("partner.fill.errorTitle"),
    i18n.t("partner.fill.errorSubmit"),
  ));
  expect(mockSubmitOffer).not.toHaveBeenCalled();
  alert.mockRestore();
});
it("uploads multi-line local images in order, submits raw prices only, and retries 422 without re-uploading", async () => {
  mockNextImageUris = ["file:///a.jpg", "content://picker/b.png"];
  mockSubmitOffer
    .mockRejectedValueOnce(new ApiClientError("Validation failed", 422, { "lines.0.priceFerrailleur": ["Prix refusé"] }))
    .mockResolvedValueOnce({ success: true, data: { success: true, offerId: 402 } });
  const screen = render(<OfferFillScreen />);
  await screen.findAllByRole("button", { name: i18n.t("requestFlow.addImage") });
  addOfferLineAndExpandAll(screen);
  const addButtons = screen.getAllByRole("button", { name: i18n.t("requestFlow.addImage") });
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
      { requestItemId: 8, priceFerrailleur: 300.5, condition: "occasion", description: null, images: ["tmp/mobile/14/b.png"] },
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
  expect(resend.props.accessibilityState).toEqual({ disabled: true });
  expect(screen.getAllByText(i18n.t("partner.fill.priceRecapLabel"))).toHaveLength(1);
  fireEvent.press(resend);
  expect(mockResendOffer).not.toHaveBeenCalled();

  const checkbox = screen.getByRole("checkbox", { name: i18n.t("partner.fill.selectOffer", { count: 1 }) });
  fireEvent.press(checkbox);
  expect(screen.getByRole("checkbox", { name: i18n.t("partner.fill.selectOffer", { count: 1 }) }).props.accessibilityState).toEqual({ checked: true });
  fireEvent.press(resend);
  fireEvent.press(resend);

  expect(mockResendOffer).toHaveBeenCalledTimes(1);
  expect(mockResendOffer).toHaveBeenCalledWith(401);
  expect(mockGetIncoming).not.toHaveBeenCalled();
  expect(mockUploadLocalImages).not.toHaveBeenCalled();
  pending.resolve({ success: true, data: { success: true, offerId: 401 } });
  expect(await screen.findByText(i18n.t("partner.fill.successTitleResend"))).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.successCta") }));
  expect(mockReplace).toHaveBeenCalledWith("/(prestataire)/offers/401?sent=1");
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

it("labels an offer with no seller photo instead of showing a different part", async () => {
  mockParams = { offerId: "401" };
  mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, images: [] } });
  const screen = render(<OfferDetailScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.noPhoto"))).toBeTruthy();
  expect(screen.queryByTestId("image-slider")).toBeNull();
});

it("shows the canonical part name once and the full description only under the remarks", async () => {
  mockParams = { offerId: "401" };
  mockGetOffer.mockResolvedValueOnce({
    success: true,
    data: { ...offer, status: "pending", brandName: "Bosch", adminNotes: "Note admin", description: "Ligne info\nLigne détail\nLigne remarque" },
  });
  const screen = render(<OfferDetailScreen />);

  expect(await screen.findAllByText("Plaquettes")).toHaveLength(1);
  expect(screen.getAllByText("Ligne info\nLigne détail\nLigne remarque")).toHaveLength(1);
  expect(screen.queryByText("Ligne info")).toBeNull();
  expect(screen.getByText(i18n.t("partner.offerDetail.remarks"))).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.ship.vehicleFallback"))).toBeTruthy();
  expect(screen.getByText(`250 ${i18n.t("partner.offerDetail.priceTtc")}`)).toBeTruthy();
  // Figma removed the brand line, the FR reference chip, the date line and the admin note box.
  expect(screen.queryByText(i18n.t("requestList.brand", { value: "Bosch" }))).toBeNull();
  expect(screen.queryByText(/OFF-401/)).toBeNull();
  expect(screen.queryByText(new RegExp(i18n.t("partner.offerDetail.date")))).toBeNull();
  expect(screen.queryByText("Note admin")).toBeNull();
});

it("renders the pending status in the helper colour with the countdown stacked under it", async () => {
  const now = jest.spyOn(Date, "now").mockReturnValue(new Date("2026-08-01T20:00:00.000Z").getTime());
  try {
    mockParams = { offerId: "401" };
    mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, status: "pending", validatedAt: null } });
    const screen = render(<OfferDetailScreen />);

    const status = await screen.findByText(i18n.t("partner.offerDetail.statusPending"));
    expect(status.props.style).toEqual(expect.arrayContaining([{ color: statusColor("pending") }]));
    const countdown = screen.getByText(i18n.t("partner.offerDetail.countdownRemaining", { value: "14h 00min" }));
    expect(countdown.props.style).toEqual(expect.arrayContaining([{ color: statusColor("pending") }]));
  } finally {
    now.mockRestore();
  }
});

it("localizes the Arabic countdown and mirrors the price badge to the right", async () => {
  const now = jest.spyOn(Date, "now").mockReturnValue(new Date("2026-08-01T20:00:00.000Z").getTime());
  try {
    await i18n.changeLanguage("ar");
    mockParams = { offerId: "401" };
    mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, status: "pending", validatedAt: null } });
    const screen = render(<OfferDetailScreen />);

    expect(await screen.findByText("14 ساعة و 00 دقيقة متبقية")).toBeTruthy();
    let badge = screen.getByText(`250 ${i18n.t("partner.offerDetail.priceTtc")}`).parent;
    while (badge && StyleSheet.flatten(badge.props.style)?.alignSelf === undefined) badge = badge.parent;
    expect(StyleSheet.flatten(badge?.props.style)?.alignSelf).toBe("flex-end");
  } finally {
    now.mockRestore();
  }
});

it("colours the fill timer with the list-card thresholds and reopens folded offers that miss data", async () => {
  mockGetIncoming.mockResolvedValue({
    success: true,
    data: [{ ...incomingRequest, expiresAt: new Date(Date.now() + 13 * 3_600_000 + 30 * 60_000).toISOString() }],
    pagination,
  });
  const screen = render(<OfferFillScreen />);
  const timer = await screen.findByText(/^13h \d{2}\s?min /);
  expect(timer.props.style).toEqual(expect.arrayContaining([{ color: Colors.greenDark }]));

  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.addAnotherOffer") }));
  expect(screen.getAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"))).toHaveLength(1);
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.fill.ctaSend") }));

  expect(await screen.findAllByText(i18n.t("requestFlow.noPhoto"))).toHaveLength(2);
  expect(screen.getAllByPlaceholderText(i18n.t("partner.fill.pricePlaceholder"))).toHaveLength(2);
});

it("shows a dismissible sent toast when opened after submitting an offer", async () => {
  mockParams = { offerId: "401", sent: "1" };
  mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, status: "pending" } });
  const screen = render(<OfferDetailScreen />);

  const message = i18n.t("partner.offerDetail.sentToast", { part: "Plaquettes" });
  expect(await screen.findByText(message)).toBeTruthy();
  fireEvent.press(screen.getByTestId("partner-toast"));
  expect(screen.queryByText(message)).toBeNull();
});

it("lists the partner's other offers in a carousel that opens their detail", async () => {
  mockParams = { offerId: "401" };
  mockGetOffers.mockResolvedValue({
    success: true,
    data: [offer, { ...offer, id: 402, reference: "OFF-402", status: "rejected" }],
    pagination,
  });
  const screen = render(<OfferDetailScreen />);

  const card = await screen.findByLabelText(`${i18n.t("partner.offers.card.details")} OFF-402`);
  expect(screen.queryByLabelText(`${i18n.t("partner.offers.card.details")} OFF-401`)).toBeNull();
  expect(screen.getByText(i18n.t(offerStatusLabelKey("rejected")))).toBeTruthy();
  fireEvent.press(card);
  expect(mockPush).toHaveBeenCalledWith("/(prestataire)/offers/402");
});

it("times carousel cards with the list-card wording and thresholds, not the detail status colour", async () => {
  const now = jest.spyOn(Date, "now").mockReturnValue(new Date("2026-08-01T20:00:00.000Z").getTime());
  try {
    mockParams = { offerId: "401" };
    mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, status: "pending", validatedAt: null } });
    mockGetOffers.mockResolvedValue({
      success: true,
      data: [
        offer,
        // 18h left → green; 30 min left → red (24 h window from validatedAt ?? createdAt).
        { ...offer, id: 402, reference: "OFF-402", status: "pending", validatedAt: null, createdAt: "2026-08-01T14:00:00.000Z" },
        { ...offer, id: 403, reference: "OFF-403", status: "validated", validatedAt: "2026-07-31T20:30:00.000Z" },
      ],
      pagination,
    });
    const screen = render(<OfferDetailScreen />);

    const green = await screen.findByText("18h 00min restante");
    expect(green.props.style).toEqual(expect.arrayContaining([{ color: Colors.greenDark }]));
    const red = screen.getByText("0h 30min restante");
    expect(red.props.style).toEqual(expect.arrayContaining([{ color: Colors.red }]));
    // The main status countdown keeps the Figma detail wording in the status colour.
    const main = screen.getByText(i18n.t("partner.offerDetail.countdownRemaining", { value: "14h 00min" }));
    expect(main.props.style).toEqual(expect.arrayContaining([{ color: statusColor("pending") }]));
  } finally {
    now.mockRestore();
  }
});

it("scrolls the kept-mounted detail back to the top when it regains focus", async () => {
  mockParams = { offerId: "401" };
  mockGetOffer.mockResolvedValue({ success: true, data: { ...offer, status: "pending" } });
  const screen = render(<OfferDetailScreen />);
  await screen.findByText(i18n.t("partner.offerDetail.statusPending"));
  const scrollTo = jest.mocked(ScrollView.prototype.scrollTo);
  scrollTo.mockClear();

  act(() => {
    mockFocusCleanup?.();
    mockFocusCallback?.();
  });

  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
});

it("offers the existing resend flow from a rejected offer detail", async () => {
  mockParams = { offerId: "401" };
  mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, status: "rejected" } });
  const screen = render(<OfferDetailScreen />);

  fireEvent.press(await screen.findByRole("button", { name: i18n.t("partner.offerDetail.ctaResend") }));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(prestataire)/offers/33/fill",
    params: { mode: "resend", existingOfferId: "401" },
  });
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

  expect(await screen.findByText(i18n.t("partner.offerDetail.notFound"))).toBeTruthy();
  expect(mockGetOffer).not.toHaveBeenCalled();
  expect(mockGetOfferShipment).not.toHaveBeenCalled();
});

it("uses shipment read-back instead of offer notes to decide whether shipping is available", async () => {
  mockParams = { offerId: "401" };
  mockGetOffer.mockResolvedValueOnce({ success: true, data: { ...offer, adminNotes: "expédié manuellement" } });
  const screen = render(<OfferDetailScreen />);

  // The detail route renders the same Ship it layout as the ship route for an accepted offer.
  expect(await screen.findByRole("button", { name: i18n.t("partner.ship.readyCta") })).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.ship.prepareStatus"))).toBeTruthy();
  expect(screen.getByText(`${i18n.t("partner.offerDetail.ref")} OFF-401`)).toBeTruthy();
  expect(screen.queryByRole("button", { name: i18n.t("partner.offerDetail.ctaShip") })).toBeNull();
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
  expect(detail.queryByRole("button", { name: i18n.t("partner.ship.readyCta") })).toBeNull();
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
  expect(detail.queryByRole("button", { name: i18n.t("partner.ship.readyCta") })).toBeNull();
  detail.unmount();

  const shipping = render(<OfferShipScreen />);
  expect(await shipping.findByText(i18n.t("partner.fill.conditionEnStock"))).toBeTruthy();
  expect(shipping.getByText("4")).toBeTruthy();
  expect(shipping.queryByRole("button", { name: i18n.t("partner.ship.readyCta") })).toBeNull();
});

it("renders the Arabic shipped layout with the ref above the name, sent date and condition line", async () => {
  await i18n.changeLanguage("ar");
  mockParams = { offerId: "401" };
  mockGetOfferShipment.mockResolvedValue({ success: true, data: shipment });
  const screen = render(<OfferDetailScreen />);

  expect(await screen.findByText("Plaquettes AR")).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.ship.shippedDetailTitle"))).toBeTruthy();
  expect(screen.getByText(`${i18n.t("partner.offers.card.ref")} OFF-401`)).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.ship.shippedStatus"))).toBeTruthy();
  expect(screen.getByText(formatPartnerDateTime(shipment.shippedAt))).toBeTruthy();
  expect(screen.getByText(`${i18n.t("partner.offerDetail.ref")} TRACK-1`)).toBeTruthy();
  expect(screen.getByText(`${i18n.t("partner.offerDetail.condition")} ${i18n.t("partner.fill.conditionEnStock")}`)).toBeTruthy();
  expect(screen.queryByRole("button", { name: i18n.t("partner.ship.readyCta") })).toBeNull();
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

  // Figma sheet (255-39950) only has the reference field.
  expect(screen.queryByPlaceholderText(i18n.t("partner.ship.carrierPlaceholder"))).toBeNull();
  expect(screen.queryByPlaceholderText(i18n.t("partner.ship.notesPlaceholder"))).toBeNull();
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.ship.trackingPlaceholder")), " TRACK-1 ");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.ship.ctaConfirm") }));
  const confirm = screen.getByRole("button", { name: i18n.t("partner.ship.confirmCta") });
  fireEvent.press(confirm);
  fireEvent.press(confirm);

  await waitFor(() => expect(mockShipOffer).toHaveBeenCalledTimes(1));
  expect(mockShipOffer).toHaveBeenCalledWith(401, { trackingNumber: "TRACK-1" });
  await waitFor(() => expect(mockGetOfferShipment).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(`${i18n.t("partner.offerDetail.ref")} TRACK-1`)).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.ship.shippedStatus"))).toBeTruthy();
  expect(screen.getByText(i18n.t("partner.ship.readyToast", { part: "Plaquettes" }))).toBeTruthy();
  expect(screen.queryByRole("button", { name: i18n.t("partner.ship.readyCta") })).toBeNull();
});

it("maps Laravel shipment validation errors and preserves the entered reference", async () => {
  mockParams = { offerId: "401" };
  mockShipOffer
    .mockRejectedValueOnce(new ApiClientError("Validation failed", 422, { trackingNumber: ["Référence refusée"] }))
    .mockRejectedValueOnce(new ApiClientError("Validation failed", 422, { offer: ["Offre déjà expédiée"] }));
  const screen = render(<OfferShipScreen />);
  fireEvent.press(await screen.findByRole("button", { name: i18n.t("partner.ship.readyCta") }));
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.ship.trackingPlaceholder")), "TRACK-X");
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.ship.ctaConfirm") }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.ship.confirmCta") }));

  expect(await screen.findByText("Référence refusée")).toBeTruthy();
  expect(screen.getByDisplayValue("TRACK-X")).toBeTruthy();

  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.ship.ctaConfirm") }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.ship.confirmCta") }));
  expect(await screen.findByText("Offre déjà expédiée")).toBeTruthy();
  expect(screen.getByDisplayValue("TRACK-X")).toBeTruthy();
  expect(mockGetOfferShipment).toHaveBeenCalledTimes(1);
});
