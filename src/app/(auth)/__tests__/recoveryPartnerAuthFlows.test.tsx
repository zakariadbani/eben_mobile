import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { ScrollView, StyleSheet } from "react-native";
import {
  AuthRoleMismatchError,
  Role,
  useSession,
} from "@/context/AuthContext";
import i18n from "@/localization/i18n";
import ForgotPasswordScreen from "../ForgotPasswordScreen";
import ForgotPasswordVerificationScreen from "../forgot-password/verification";
import ForgotPasswordNewPasswordScreen from "../forgot-password/new-password";
import PrestataireSignInScreen from "../prestataire/sign-in";
import PartnerLoadingScreen from "../prestataire/loading";
import PartnerForgotPasswordScreen from "../prestataire/forgot-password";
import PartnerForgotPasswordVerificationScreen from "../prestataire/forgot-password/verification";
import PartnerForgotPasswordNewPasswordScreen from "../prestataire/forgot-password/new-password";
import PartnerForgotPasswordSuccessScreen from "../prestataire/forgot-password/success";
import PartnerWaitlistScreen from "../prestataire/waitlist";
import PartnerWelcomeScreen from "../prestataire/welcome";
import {
  armWelcomeSplash,
  claimWelcomeSplashRedirect,
  disarmWelcomeSplash,
  isWelcomeSplashArmed,
} from "@/helpers/welcomeSplash";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDismissAll = jest.fn();
const mockLogin = jest.fn();
const mockStartPasswordReset = jest.fn();
const mockVerifyPasswordReset = jest.fn();
const mockCompletePasswordReset = jest.fn();

jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  Stack.Screen = function MockStackScreen() {
    return null;
  };
  return {
    Href: {},
    Stack,
    useRouter: () => ({
      back: mockBack,
      dismissAll: mockDismissAll,
      push: mockPush,
      replace: mockReplace,
    }),
    useLocalSearchParams: () => ({}),
  };
});

jest.mock("@/context/AuthContext", () => {
  const actual = jest.requireActual("@/context/AuthContext");
  return { ...actual, useSession: jest.fn() };
});

jest.mock("@/components/screens/shared/PhoneVerificationComponent", () => {
  const React = require("react");
  const { Button, Text, View } = require("react-native");
  return function MockPhoneVerification({
    validate,
    onResend,
    phoneNumber,
    error,
  }: {
    validate: (valid: boolean, code: string) => Promise<void>;
    onResend?: () => Promise<void>;
    phoneNumber: string;
    error?: string | null;
  }) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, phoneNumber),
      error ? React.createElement(Text, null, error) : null,
      React.createElement(Button, {
        title: "verify-reset-code",
        onPress: () => validate(true, "654321"),
      }),
      React.createElement(Button, {
        title: "resend-reset-code",
        onPress: () => onResend?.(),
      }),
    );
  };
});

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;
function sessionValue(phone: string | null = "+212600000101") {
  return {
    login: mockLogin,
    registerClient: jest.fn(),
    verifyRegistration: jest.fn(),
    resendRegistrationOtp: jest.fn(),
    pendingRegistrationPhone: null,
    pendingRegistrationOtpSent: null,
    pendingPasswordResetPhone: phone,
    startPasswordReset: mockStartPasswordReset,
    verifyPasswordReset: mockVerifyPasswordReset,
    completePasswordReset: mockCompletePasswordReset,
    refreshSessionProfile: jest.fn(),
    startPhoneChangeVerification: jest.fn(),
    resendPhoneChangeOtp: jest.fn(),
    verifyPhoneChange: jest.fn(),
    pendingPhoneChangeVerificationPhone: null,
    logOut: jest.fn(),
    session: null,
    role: "guest" as const,
    username: null,
    isLoading: false,
  };
}

function submitPhone(screen: ReturnType<typeof render>) {
  fireEvent.changeText(
    screen.getByPlaceholderText(i18n.t("auth.fields.phonePlaceholder")),
    "06 00 00 01 01",
  );
  fireEvent.press(
    screen.getByRole("button", { name: i18n.t("auth.recovery.start") }),
  );
}

function submitNewPassword(screen: ReturnType<typeof render>) {
  fireEvent.changeText(
    screen.getByLabelText(i18n.t("auth.recovery.newPassword")),
    "new-password",
  );
  fireEvent.changeText(
    screen.getByLabelText(i18n.t("auth.recovery.repeatPassword")),
    "new-password",
  );
  fireEvent.press(
    screen.getByRole("button", { name: i18n.t("auth.recovery.confirm") }),
  );
}

it("localizes the native recovery submit accessibility label", async () => {
  await i18n.changeLanguage("ar");
  const screen = render(<ForgotPasswordScreen />);
  const submit = screen.getByRole("button", { name: i18n.t("auth.recovery.start") });

  expect(submit.props.accessibilityLabel).toBe(i18n.t("auth.recovery.start"));
});

beforeEach(async () => {
  jest.clearAllMocks();
  disarmWelcomeSplash();
  await i18n.changeLanguage("fr");
  mockLogin.mockResolvedValue(Role.PRESTATAIRE);
  mockStartPasswordReset.mockResolvedValue(undefined);
  mockVerifyPasswordReset.mockResolvedValue(undefined);
  mockCompletePasswordReset.mockResolvedValue(undefined);
  mockedUseSession.mockReturnValue(sessionValue());
});

it("awaits Prestataire login and navigates only after a successful role match", async () => {
  let resolveLogin: (role: Role) => void = () => undefined;
  mockLogin.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveLogin = resolve;
    }),
  );
  const screen = render(<PrestataireSignInScreen />);

  fireEvent.changeText(
    screen.getByPlaceholderText(i18n.t("auth.fields.phonePlaceholder")),
    "06 00 00 01 01",
  );
  fireEvent.changeText(screen.getByPlaceholderText("......"), "password123");
  fireEvent.press(
    screen.getByRole("button", { name: i18n.t("auth.login.submit") }),
  );

  await waitFor(() =>
    expect(mockLogin).toHaveBeenCalledWith(
      "+212600000101",
      "password123",
      Role.PRESTATAIRE,
    ),
  );
  expect(mockReplace).not.toHaveBeenCalled();
  // Armed before login() resolves: the root guard sees the session first.
  expect(isWelcomeSplashArmed(Role.PRESTATAIRE)).toBe(true);
  expect(
    screen.getByRole("button", {
      name: i18n.t("auth.login.submitting"),
    }).props.accessibilityState,
  ).toMatchObject({ busy: true, disabled: true });

  await act(async () => resolveLogin(Role.PRESTATAIRE));
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/prestataire/loading"),
  );
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

it("leaves the partner splash redirect to the root guard when it already issued it", async () => {
  let resolveLogin: (role: Role) => void = () => undefined;
  mockLogin.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveLogin = resolve;
    }),
  );
  const screen = render(<PrestataireSignInScreen />);

  fireEvent.changeText(
    screen.getByPlaceholderText(i18n.t("auth.fields.phonePlaceholder")),
    "0600000101",
  );
  fireEvent.changeText(screen.getByPlaceholderText("......"), "password123");
  fireEvent.press(
    screen.getByRole("button", { name: i18n.t("auth.login.submit") }),
  );
  await waitFor(() => expect(mockLogin).toHaveBeenCalled());

  // The session appeared: the root layout guard claims the splash redirect first.
  expect(claimWelcomeSplashRedirect()).toBe("/(auth)/prestataire/loading");
  await act(async () => resolveLogin(Role.PRESTATAIRE));

  expect(mockReplace).not.toHaveBeenCalled();
  expect(isWelcomeSplashArmed(Role.PRESTATAIRE)).toBe(true);
});

it("clears the partner splash hand-off when the splash mounts and opens the dashboard after it", () => {
  jest.useFakeTimers();
  try {
    armWelcomeSplash(Role.PRESTATAIRE);
    mockedUseSession.mockReturnValue({
      ...sessionValue(),
      session: { token: "token" },
      role: Role.PRESTATAIRE,
      username: "Karim Benali",
    } as unknown as ReturnType<typeof useSession>);

    const screen = render(<PartnerLoadingScreen />);

    expect(isWelcomeSplashArmed()).toBe(false);
    expect(screen.getByText("PARTNERS")).toBeTruthy();
    expect(screen.getByText(i18n.t("Bienvenue {{name}}", { name: "Karim" }))).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockReplace).toHaveBeenCalledWith("/(prestataire)/dashboard");
  } finally {
    jest.useRealTimers();
  }
});

it("lets the first Se connecter tap submit while the keyboard is open", () => {
  const screen = render(<PrestataireSignInScreen />);

  const scrollViews = screen.UNSAFE_getAllByType(ScrollView);
  expect(scrollViews.length).toBeGreaterThan(0);
  scrollViews.forEach((scrollView) =>
    expect(scrollView.props.keyboardShouldPersistTaps).toBe("handled"),
  );
});

it("shows typed Prestataire role mismatch and generic login errors", async () => {
  mockLogin.mockRejectedValueOnce(
    new AuthRoleMismatchError(Role.PRESTATAIRE, Role.CLIENT),
  );
  const mismatch = render(<PrestataireSignInScreen />);
  fireEvent.changeText(
    mismatch.getByPlaceholderText(i18n.t("auth.fields.phonePlaceholder")),
    "0600000101",
  );
  fireEvent.changeText(mismatch.getByPlaceholderText("......"), "password123");
  fireEvent.press(
    mismatch.getByRole("button", { name: i18n.t("auth.login.submit") }),
  );
  expect(
    await mismatch.findByText(i18n.t("auth.prestataire.login.roleMismatch")),
  ).toBeTruthy();
  mismatch.unmount();

  mockLogin.mockRejectedValueOnce(new Error("storage failed"));
  const generic = render(<PrestataireSignInScreen />);
  fireEvent.changeText(
    generic.getByPlaceholderText(i18n.t("auth.fields.phonePlaceholder")),
    "0600000101",
  );
  fireEvent.changeText(generic.getByPlaceholderText("......"), "password123");
  fireEvent.press(
    generic.getByRole("button", { name: i18n.t("auth.login.submit") }),
  );
  expect(await generic.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  // A failed sign-in never leaves a splash hand-off behind.
  expect(isWelcomeSplashArmed()).toBe(false);
});



it.each(["fr", "ar"])(
  "keeps Prestataire onboarding focused on sign-in in %s",
  async (language) => {
    await i18n.changeLanguage(language);
    const screen = render(<PartnerWelcomeScreen />);

    expect(
      StyleSheet.flatten(screen.getByTestId("partner-welcome-back").props.style),
    ).toMatchObject(language === "ar" ? { right: 8 } : { left: 8 });
    expect(screen.queryByText(i18n.t("Acheteur"))).toBeNull();
    expect(screen.queryByText(i18n.t("Vendeur"))).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: i18n.t("S'inscrire sur la liste d'attente"),
      }),
    ).toBeNull();
    expect(
      screen.queryByText(i18n.t("Voir la version de démonstration")),
    ).toBeNull();
    expect(screen.queryByText(i18n.t("Conditions et nos accords."))).toBeNull();
    expect(screen.getByText(i18n.t("Si vous avez un compte"))).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("Connectez-vous") }),
    );
    expect(mockPush).toHaveBeenCalledWith("/(auth)/prestataire/sign-in");
  },
);

it.each(["fr", "ar"])(
  "keeps Prestataire sign-in focused on login and password recovery in %s",
  async (language) => {
    await i18n.changeLanguage(language);
    const screen = render(<PrestataireSignInScreen />);

    expect(screen.queryByText(i18n.t("auth.login.noAccount"))).toBeNull();
    expect(
      screen.queryByText(i18n.t("auth.prestataire.login.joinWaitlist")),
    ).toBeNull();
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("auth.login.forgotPassword") }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      "/(auth)/prestataire/forgot-password",
    );
  },
);
it("runs Client password recovery without putting secrets in route params", async () => {
  mockedUseSession.mockReturnValue(sessionValue());
  const start = render(<ForgotPasswordScreen />);
  submitPhone(start);
  await waitFor(() =>
    expect(mockStartPasswordReset).toHaveBeenCalledWith("+212600000101"),
  );
  expect(mockPush).toHaveBeenCalledWith("/(auth)/forgot-password/verification");
  expect(JSON.stringify(mockPush.mock.calls)).not.toContain("0600000101");
  start.unmount();

  const verify = render(<ForgotPasswordVerificationScreen />);
  expect(verify.getByText("06 00 00 01 01")).toBeTruthy();
  fireEvent.press(verify.getByText("verify-reset-code"));
  await waitFor(() =>
    expect(mockVerifyPasswordReset).toHaveBeenCalledWith("654321"),
  );
  expect(mockPush).toHaveBeenLastCalledWith(
    "/(auth)/forgot-password/new-password",
  );
  expect(JSON.stringify(mockPush.mock.calls)).not.toContain("654321");

  fireEvent.press(verify.getByText("resend-reset-code"));
  await waitFor(() =>
    expect(mockStartPasswordReset).toHaveBeenCalledWith("+212600000101"),
  );
  verify.unmount();

  const reset = render(<ForgotPasswordNewPasswordScreen />);
  submitNewPassword(reset);
  await waitFor(() =>
    expect(mockCompletePasswordReset).toHaveBeenCalledWith("new-password"),
  );
  expect(mockPush).toHaveBeenLastCalledWith("/(auth)/forgot-password/success");
  expect(
    mockPush.mock.calls.every(
      ([route]) => typeof route === "string" && !route.includes("?"),
    ),
  ).toBe(true);
});

it("normalizes a local Moroccan phone while preserving the Prestataire recovery route family", async () => {
  const start = render(<PartnerForgotPasswordScreen />);
  submitPhone(start);
  await waitFor(() =>
    expect(mockStartPasswordReset).toHaveBeenCalledWith("+212600000101"),
  );
  expect(mockPush).toHaveBeenCalledWith(
    "/(auth)/prestataire/forgot-password/verification",
  );
  start.unmount();

  const verify = render(<PartnerForgotPasswordVerificationScreen />);
  fireEvent.press(verify.getByText("verify-reset-code"));
  await waitFor(() => expect(mockVerifyPasswordReset).toHaveBeenCalled());
  expect(mockPush).toHaveBeenLastCalledWith(
    "/(auth)/prestataire/forgot-password/new-password",
  );
  verify.unmount();

  const reset = render(<PartnerForgotPasswordNewPasswordScreen />);
  submitNewPassword(reset);
  await waitFor(() => expect(mockCompletePasswordReset).toHaveBeenCalled());
  expect(mockReplace).toHaveBeenCalledWith(
    "/(auth)/prestataire/forgot-password/success",
  );
});

it.each(["fr", "ar"])("blocks waitlist consent in %s until official EBEN terms exist", async (language) => {
  await i18n.changeLanguage(language);
  const screen = render(<PartnerWaitlistScreen />);

  expect(screen.getByText(i18n.t("legal.unavailableTitle"))).toBeTruthy();
  expect(screen.getByText(i18n.t("legal.unavailableBody"))).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("legal.back") }));
  expect(mockBack).toHaveBeenCalled();
});

it.each(["fr", "ar"])(
  "shows the Prestataire reset success as a modal over the new-password screen in %s",
  async (language) => {
    await i18n.changeLanguage(language);
    mockedUseSession.mockReturnValue(sessionValue(null));
    const screen = render(<PartnerForgotPasswordSuccessScreen />);

    expect(
      screen.getByText(
        i18n.t(
          "Votre mot de passe a été réinitialisé, vous pouvez vous connecter en utilisant votre nouveau mot de passe maintenant.",
        ),
      ),
    ).toBeTruthy();
    // Backdrop = the new-password card, without its "no pending reset" error
    expect(screen.getByText(i18n.t("auth.recovery.newPasswordInstructions"))).toBeTruthy();
    expect(screen.queryByText(i18n.t("auth.recovery.noPending"))).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: i18n.t("Se connecter") }));
    expect(mockDismissAll).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/prestataire/sign-in");
  },
);
