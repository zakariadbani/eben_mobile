import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { confirmWithdrawal } from "@/api/resources/prestataire";
import i18n from "@/localization/i18n";
import PrestataireWalletVerificationScreen from "../profile/wallet/verification";

const mockReplace = jest.fn();
let mockParams: Record<string, string | undefined> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@/context/AuthContext", () => ({
  useSession: () => ({ session: { user: { phone: "+212600000102" } } }),
}));
jest.mock("@/api/resources/prestataire", () => ({ confirmWithdrawal: jest.fn() }));
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

beforeEach(async () => {
  jest.clearAllMocks();
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
