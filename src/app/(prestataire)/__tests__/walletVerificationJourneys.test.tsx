import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  confirmWithdrawal,
  getPrestataireWallet,
  getWithdrawals,
  requestWithdrawal,
} from "@/api/resources/prestataire";
import i18n from "@/localization/i18n";
import { ApiClientError } from "@/api/types";
import PrestataireWalletVerificationScreen from "../profile/wallet/verification";
import PrestataireWalletScreen from "../profile/wallet";
import PrestataireWithdrawSuccessRedirect from "../profile/wallet/success";
import PrestataireWithdrawRedirect from "../profile/wallet/withdraw";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSetParams = jest.fn();
const mockReset = jest.fn();
const mockGetState = jest.fn();
const mockRedirect = jest.fn();
let mockParams: Record<string, string | undefined> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-router", () => {
  const ReactModule = require("react");
  return {
    useRouter: () => ({ replace: mockReplace, push: mockPush, setParams: mockSetParams, back: jest.fn() }),
    useNavigation: () => ({ getState: mockGetState, reset: mockReset }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (callback: () => void | (() => void)) => ReactModule.useEffect(callback, [callback]),
    Redirect: (props: { href: unknown }) => {
      mockRedirect(props);
      return null;
    },
  };
});
jest.mock("@/context/AuthContext", () => ({
  useSession: () => ({ session: { user: { phone: "+212600000102" } } }),
}));
jest.mock("@/api/resources/prestataire", () => ({
  confirmWithdrawal: jest.fn(),
  getPrestataireWallet: jest.fn(),
  getWithdrawals: jest.fn(),
  requestWithdrawal: jest.fn(),
}));
jest.mock("@/components/screens/shared/PhoneVerificationComponent", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockVerification({ validate, phoneNumber, showResend, error }: {
    validate: (valid: boolean, code: string) => Promise<void>;
    phoneNumber: string;
    showResend?: boolean;
    error?: string | null;
  }) {
    return React.createElement(Pressable, {
      accessibilityRole: "button",
      accessibilityLabel: `verify-${phoneNumber}`,
      onPress: () => validate(true, "123456"),
    }, React.createElement(Text, null, String(showResend)), error ? React.createElement(Text, null, error) : null);
  };
});

const mockConfirmWithdrawal = confirmWithdrawal as jest.MockedFunction<typeof confirmWithdrawal>;
const mockGetPrestataireWallet = getPrestataireWallet as jest.MockedFunction<typeof getPrestataireWallet>;
const mockGetWithdrawals = getWithdrawals as jest.MockedFunction<typeof getWithdrawals>;
const mockRequestWithdrawal = requestWithdrawal as jest.MockedFunction<typeof requestWithdrawal>;

const withdrawal = (id: number, status: "awaiting_verification" | "pending" | "processing" | "completed" | "rejected") => ({
  id,
  userId: 14,
  amount: 100,
  bankIban: null,
  bankName: null,
  method: "cash" as const,
  status,
  adminNotes: null,
  processedAt: null,
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
});

async function openWithdrawSheet() {
  const screen = render(<PrestataireWalletScreen />);
  await screen.findByText(i18n.t("partner.wallet.currentBalance"));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.wallet.withdraw") }));
  await waitFor(() => expect(mockGetPrestataireWallet).toHaveBeenCalledTimes(2));
  return screen;
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockGetState.mockReturnValue({
    stale: false,
    type: "tab",
    key: "partner-tabs",
    index: 3,
    routeNames: ["dashboard", "profile/index", "profile/wallet/index", "profile/wallet/verification"],
    history: [
      { type: "route", key: "dashboard-key" },
      { type: "route", key: "profile-key" },
      { type: "route", key: "wallet-key" },
      { type: "route", key: "verification-key" },
    ],
    routes: [
      { key: "dashboard-key", name: "dashboard" },
      { key: "profile-key", name: "profile/index" },
      { key: "wallet-key", name: "profile/wallet/index" },
      { key: "verification-key", name: "profile/wallet/verification" },
    ],
  });
  mockParams = { withdrawalId: "51" };
  await i18n.changeLanguage("fr");
  mockConfirmWithdrawal.mockResolvedValue({ success: true, data: withdrawal(51, "pending") });
  mockGetPrestataireWallet.mockResolvedValue({
    success: true,
    data: { balance: 6230, pendingPayout: 1450, transactions: [] },
  });
  mockGetWithdrawals.mockResolvedValue({
    success: true,
    data: [withdrawal(51, "processing")],
    pagination: { currentPage: 1, lastPage: 1, perPage: 20, total: 1, from: 1, to: 1 },
  });
  mockRequestWithdrawal.mockResolvedValue({
    success: true,
    data: {
      requiresVerification: true,
      withdrawal: { ...withdrawal(900, "awaiting_verification"), userId: 10, amount: 1000, method: "virement" },
    },
  });
});

it("submits the advertised localized amount from the withdraw sheet without truncating thousands", async () => {
  const screen = await openWithdrawSheet();

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t("partner.withdraw.amountPlaceholder")), "1.000,00");
  fireEvent.press(screen.getByText(i18n.t("partner.withdraw.methodPlaceholder")));
  fireEvent.press(screen.getByText(i18n.t("partner.withdraw.methodBank")));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.withdraw.ctaSend") }));

  await waitFor(() => expect(mockRequestWithdrawal).toHaveBeenCalledWith(1000, "virement"));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(prestataire)/profile/wallet/verification",
    params: { amount: "1000", withdrawalId: "900" },
  });
});

it("shows the Figma balance card and marks the in-progress withdrawal row instead of a separate withdrawals card", async () => {
  mockGetPrestataireWallet.mockResolvedValue({
    success: true,
    data: {
      balance: 102560,
      pendingPayout: 0,
      transactions: [
        { id: 7, userId: 14, type: "debit", amount: 100, reference: "WDL-51-RESERVE", description: "Reservation", createdAt: "2026-08-12T10:00:00.000Z" },
        { id: 6, userId: 14, type: "credit", amount: 2000, reference: "PO-81", description: "Paiement commande", createdAt: "2026-08-11T10:00:00.000Z" },
      ],
    },
  });
  const screen = render(<PrestataireWalletScreen />);

  expect(await screen.findByText("102.560,00 Dhs")).toBeTruthy();
  expect(screen.getByLabelText(i18n.t("partner.wallet.withdrawalStatus.processing"))).toBeTruthy();
  expect(screen.queryByTestId("tx-processing-6")).toBeNull();
  expect(screen.getByText("+2.000,00 dhs")).toBeTruthy();
  expect(screen.queryByText(i18n.t("partner.wallet.withdrawalsTitle"))).toBeNull();
  expect(mockGetWithdrawals).toHaveBeenCalledTimes(1);
});

it("localizes known wallet ledger references in Arabic without rewriting unknown descriptions", async () => {
  await i18n.changeLanguage("ar");
  mockGetPrestataireWallet.mockResolvedValueOnce({
    success: true,
    data: {
      balance: 6230,
      pendingPayout: 1450,
      transactions: [
        { id: 1, userId: 14, type: "credit", amount: 300, reference: "PO-81", description: "Paiement commande", createdAt: "2026-08-12T10:00:00.000Z" },
        { id: 2, userId: 14, type: "debit", amount: 25, reference: "QA-KEEP", description: "QA durable", createdAt: "2026-08-11T10:00:00.000Z" },
      ],
    },
  });
  const screen = render(<PrestataireWalletScreen />);

  expect(await screen.findByText(i18n.t("partner.wallet.transaction.orderPayment"))).toBeTruthy();
  expect(screen.queryByText("Paiement commande")).toBeNull();
  expect(screen.getByText("QA durable")).toBeTruthy();
});

it("filters wallet transactions to debits from the toolbar funnel", async () => {
  mockGetPrestataireWallet.mockResolvedValue({
    success: true,
    data: {
      balance: 6230,
      pendingPayout: 0,
      transactions: [
        { id: 1, userId: 14, type: "credit", amount: 300, reference: "OTHER-1", description: "Credit line", createdAt: "2026-08-12T10:00:00.000Z" },
        { id: 2, userId: 14, type: "debit", amount: 25, reference: "OTHER-2", description: "Debit line", createdAt: "2026-08-11T10:00:00.000Z" },
      ],
    },
  });
  const screen = render(<PrestataireWalletScreen />);
  await screen.findByText("Credit line");

  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.history.filter") }));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.wallet.filter.debit") }));

  await waitFor(() => expect(screen.queryByText("Credit line")).toBeNull());
  expect(screen.getByText("Debit line")).toBeTruthy();
});

it("blocks withdrawal submission when the wallet balance cannot be re-verified in the sheet", async () => {
  const screen = render(<PrestataireWalletScreen />);
  await screen.findByText(i18n.t("partner.wallet.currentBalance"));
  mockGetPrestataireWallet.mockRejectedValueOnce(new Error("offline"));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.wallet.withdraw") }));

  expect(await screen.findByText(i18n.t("partner.withdraw.walletUnavailable"))).toBeTruthy();
  expect(screen.getByRole("button", { name: i18n.t("partner.withdraw.ctaSend") }).props.accessibilityState)
    .toMatchObject({ disabled: true });
  expect(mockRequestWithdrawal).not.toHaveBeenCalled();
});

it("opens the withdraw sheet from the legacy deep-link param and clears it", async () => {
  mockParams = { withdraw: "1" };
  const screen = render(<PrestataireWalletScreen />);

  expect(await screen.findByText(i18n.t("partner.withdraw.formTitle"))).toBeTruthy();
  expect(mockSetParams).toHaveBeenCalledWith({ withdraw: undefined });
});

it("confirms the owned withdrawal once through Laravel and returns to the wallet without the OTP step in history", async () => {
  const screen = render(<PrestataireWalletVerificationScreen />);

  const verify = screen.getByRole("button", { name: "verify-+212600000102" });

  fireEvent.press(verify);
  fireEvent.press(verify);

  await waitFor(() => expect(mockConfirmWithdrawal).toHaveBeenCalledTimes(1));
  expect(mockConfirmWithdrawal).toHaveBeenCalledWith(51, "123456");
  expect(screen.getByText("false")).toBeTruthy();
  expect(mockReset).toHaveBeenCalledWith(expect.objectContaining({
    index: 2,
    history: [
      { type: "route", key: "dashboard-key" },
      { type: "route", key: "profile-key" },
      { type: "route", key: "wallet-key" },
    ],
  }));
});

it("returns an isolated verification deep link to the wallet", async () => {
  mockGetState.mockReturnValue({ type: "stack" });
  const screen = render(<PrestataireWalletVerificationScreen />);

  fireEvent.press(screen.getByRole("button", { name: "verify-+212600000102" }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(prestataire)/profile/wallet"));
  expect(mockReset).not.toHaveBeenCalled();
});

it("localizes a rejected withdrawal OTP instead of exposing the backend English message", async () => {
  mockConfirmWithdrawal.mockRejectedValueOnce(new ApiClientError("The verification code is invalid.", 422, {
    code: ["The verification code is invalid."],
  }));
  const screen = render(<PrestataireWalletVerificationScreen />);

  fireEvent.press(screen.getByRole("button", { name: "verify-+212600000102" }));

  expect(await screen.findByText(i18n.t("auth.otp.invalid"))).toBeTruthy();
  expect(screen.queryByText("The verification code is invalid.")).toBeNull();
});

it("rejects an invalid withdrawal deep link before any API call", async () => {
  mockParams = { withdrawalId: "-1" };
  const screen = render(<PrestataireWalletVerificationScreen />);

  expect(screen.getByText(i18n.t("requestFlow.invalidRoute"))).toBeTruthy();
  expect(mockConfirmWithdrawal).not.toHaveBeenCalled();
});

it("redirects the legacy success and withdraw routes to the wallet", () => {
  render(<PrestataireWithdrawSuccessRedirect />);
  expect(mockRedirect).toHaveBeenLastCalledWith({ href: "/(prestataire)/profile/wallet" });

  render(<PrestataireWithdrawRedirect />);
  expect(mockRedirect).toHaveBeenLastCalledWith({
    href: { pathname: "/(prestataire)/profile/wallet", params: { withdraw: "1" } },
  });
});
