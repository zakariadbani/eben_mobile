import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  confirmWithdrawal,
  getPrestataireWallet,
  requestWithdrawal,
} from "@/api/resources/prestataire";
import i18n from "@/localization/i18n";
import PrestataireWalletVerificationScreen from "../profile/wallet/verification";
import PrestataireWithdrawSuccessScreen from "../profile/wallet/success";
import PrestataireWithdrawScreen from "../profile/wallet/withdraw";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockReset = jest.fn();
const mockGetState = jest.fn();
let mockParams: Record<string, string | undefined> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useNavigation: () => ({ getState: mockGetState, reset: mockReset }),
  useLocalSearchParams: () => mockParams,
  Redirect: () => null,
}));
jest.mock("@/context/AuthContext", () => ({
  useSession: () => ({ session: { user: { phone: "+212600000102" } } }),
}));
jest.mock("@/api/resources/prestataire", () => ({
  confirmWithdrawal: jest.fn(),
  getPrestataireWallet: jest.fn(),
  requestWithdrawal: jest.fn(),
}));
jest.mock("@/components/screens/shared/PhoneVerificationComponent", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockVerification({ validate, phoneNumber, showResend }: {
    validate: (valid: boolean, code: string) => Promise<void>;
    phoneNumber: string;
    showResend?: boolean;
  }) {
    return React.createElement(Pressable, {
      accessibilityRole: "button",
      accessibilityLabel: `verify-${phoneNumber}`,
      onPress: () => validate(true, "123456"),
    }, React.createElement(Text, null, String(showResend)));
  };
});

const mockConfirmWithdrawal = confirmWithdrawal as jest.MockedFunction<typeof confirmWithdrawal>;
const mockGetPrestataireWallet = getPrestataireWallet as jest.MockedFunction<typeof getPrestataireWallet>;
const mockRequestWithdrawal = requestWithdrawal as jest.MockedFunction<typeof requestWithdrawal>;

beforeEach(async () => {
  jest.clearAllMocks();
  mockGetState.mockReturnValue({
    stale: false,
    type: "tab",
    key: "partner-tabs",
    index: 2,
    routeNames: ["dashboard", "profile/wallet/index", "profile/wallet/success"],
    history: [{ type: "route", key: "success-key" }],
    routes: [
      { key: "dashboard-key", name: "dashboard" },
      { key: "wallet-key", name: "profile/wallet/index" },
      { key: "success-key", name: "profile/wallet/success" },
    ],
  });
  mockParams = { withdrawalId: "51" };
  await i18n.changeLanguage("fr");
  mockConfirmWithdrawal.mockResolvedValue({
    success: true,
    data: {
      id: 51,
      userId: 14,
      amount: 100,
      bankIban: null,
      bankName: null,
      method: "cash",
      status: "pending",
      adminNotes: null,
      processedAt: null,
      createdAt: "2026-08-02T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    },
  });
  mockGetPrestataireWallet.mockResolvedValue({
    success: true,
    data: { balance: 6230, pendingPayout: 1450, transactions: [] },
  });
  mockRequestWithdrawal.mockResolvedValue({
    success: true,
    data: {
      requiresVerification: true,
      withdrawal: {
        id: 900,
        userId: 10,
        amount: 1000,
        bankIban: null,
        bankName: null,
        method: 'virement',
        status: 'awaiting_verification',
        adminNotes: null,
        processedAt: null,
        createdAt: '2026-08-02T12:00:00.000Z',
        updatedAt: '2026-08-02T12:00:00.000Z',
      },
    },
  });
});

it('submits the advertised localized amount without truncating thousands', async () => {
  const screen = render(<PrestataireWithdrawScreen />);
  await waitFor(() => expect(mockGetPrestataireWallet).toHaveBeenCalled());

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('partner.withdraw.amountPlaceholder')), '1.000,00');
  fireEvent.press(screen.getByText(i18n.t('partner.withdraw.methodPlaceholder')));
  fireEvent.press(screen.getByText(i18n.t('partner.withdraw.methodBank')));
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.withdraw.ctaSend') }));

  await waitFor(() => expect(mockRequestWithdrawal).toHaveBeenCalledWith(1000, 'virement'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(prestataire)/profile/wallet/verification',
    params: { amount: '1000', withdrawalId: '900' },
  });
});

it('blocks withdrawal submission when the wallet balance cannot be verified', async () => {
  mockGetPrestataireWallet.mockRejectedValueOnce(new Error('offline'));
  const screen = render(<PrestataireWithdrawScreen />);

  expect(await screen.findByText(i18n.t('partner.withdraw.walletUnavailable'))).toBeTruthy();
  expect(screen.getByRole('button', { name: i18n.t('partner.withdraw.ctaSend') }).props.accessibilityState)
    .toMatchObject({ disabled: true });
  expect(mockRequestWithdrawal).not.toHaveBeenCalled();
});

it("confirms the owned withdrawal once through Laravel and uses the session phone", async () => {
  const screen = render(<PrestataireWalletVerificationScreen />);

  const verify = screen.getByRole("button", { name: "verify-+212600000102" });

  fireEvent.press(verify);
  fireEvent.press(verify);

  await waitFor(() => expect(mockConfirmWithdrawal).toHaveBeenCalledTimes(1));
  expect(mockConfirmWithdrawal).toHaveBeenCalledWith(51, "123456");
  expect(screen.getByText("false")).toBeTruthy();
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: "/(prestataire)/profile/wallet/success",
    params: { withdrawalId: "51" },
  });
});

it("rejects an invalid withdrawal deep link before any API call", async () => {
  mockParams = { withdrawalId: "-1" };
  const screen = render(<PrestataireWalletVerificationScreen />);

  expect(screen.getByText(i18n.t("requestFlow.invalidRoute"))).toBeTruthy();
  expect(mockConfirmWithdrawal).not.toHaveBeenCalled();
});

it("keeps the withdrawal confirmation visible until the partner dismisses it", () => {
  const screen = render(<PrestataireWithdrawSuccessScreen />);

  expect(screen.getByText(i18n.t("partner.withdraw.successTitle"))).toBeTruthy();
  expect(screen.getByText(i18n.t('partner.withdraw.successBody'))).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.withdraw.successCta") }));
  expect(mockReset).toHaveBeenCalledWith(expect.objectContaining({
    index: 1,
    history: [
      { type: "route", key: "dashboard-key" },
      { type: "route", key: "wallet-key" },
    ],
  }));
});

it("returns an isolated success deep link to the wallet", () => {
  mockGetState.mockReturnValue({ type: "stack" });
  const screen = render(<PrestataireWithdrawSuccessScreen />);

  fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.withdraw.successCta") }));

  expect(mockReplace).toHaveBeenCalledWith("/(prestataire)/profile/wallet");
});
