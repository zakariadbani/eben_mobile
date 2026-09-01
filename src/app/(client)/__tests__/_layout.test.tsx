import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import ClientLayout from "../_layout";

const mockPush = jest.fn();
let mockSession: { username: string; role: string } | null = null;
let mockScreenOptions: Record<string, { header?: unknown }> = {};
let mockTabsOptions: Record<string, unknown> = {};
let mockLanguage = "fr";
let mockProfileListeners: {
  tabPress: (event: { preventDefault: () => void }) => void;
};

jest.mock("expo-router", () => {
  const ReactRuntime = require("react");
  const Tabs = function MockTabs({ children, screenOptions }: { children: React.ReactNode; screenOptions?: Record<string, unknown> }) {
    mockTabsOptions = screenOptions ?? {};
    return ReactRuntime.createElement(ReactRuntime.Fragment, null, children);
  };

  Tabs.Screen = function MockTabsScreen({
    name,
    listeners,
    options,
  }: {
    name: string;
    listeners?: typeof mockProfileListeners;
    options?: { header?: unknown };
  }) {
    if (name === "settings/index" && listeners) mockProfileListeners = listeners;
    mockScreenOptions[name] = options ?? {};
    return null;
  };

  return {
    Href: {},
    Tabs,
    useRouter: () => ({ push: mockPush }),
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: mockLanguage },
  }),
}));

jest.mock("@/context/AuthContext", () => ({
  useSession: () => ({
    session: mockSession,
    username: mockSession?.username ?? null,
  }),
}));

jest.mock("@/components/common/ConfirmModal", () => {
  const ReactRuntime = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");

  return {
    __esModule: true,
    default: ({
      visible,
      children,
      onClose,
      primaryButton,
      secondaryButton,
    }: {
      visible: boolean;
      children: React.ReactNode;
      onClose: () => void;
      primaryButton: { title: string; onPress: () => void };
      secondaryButton: { title: string; onPress: () => void };
    }) =>
      visible
        ? ReactRuntime.createElement(
            View,
            null,
            children,
            ReactRuntime.createElement(
              TouchableOpacity,
              { onPress: secondaryButton.onPress },
              ReactRuntime.createElement(Text, null, secondaryButton.title),
            ),
            ReactRuntime.createElement(
              TouchableOpacity,
              { onPress: primaryButton.onPress },
              ReactRuntime.createElement(Text, null, primaryButton.title),
            ),
            ReactRuntime.createElement(
              TouchableOpacity,
              { onPress: onClose },
              ReactRuntime.createElement(Text, null, "dismiss"),
            ),
          )
        : null,
  };
});

describe("Client Profile tab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = null;
    mockScreenOptions = {};
    mockTabsOptions = {};
    mockLanguage = "fr";
  });

  it("shows a back header on pushed product screens", () => {
    render(<ClientLayout />);

    expect(mockScreenOptions["products/[productId]/index"]?.header).toEqual(expect.any(Function));
    expect(mockScreenOptions["products/[productId]/reviews"]?.header).toEqual(expect.any(Function));
    expect(mockScreenOptions["products/[productId]/review"]?.header).toEqual(expect.any(Function));
    expect(mockScreenOptions["requests/[requestId]/offers/[offerId]/index"]?.header).toEqual(expect.any(Function));
  });
  it("blocks guest navigation and opens the authentication modal", () => {
    const preventDefault = jest.fn();
    const screen = render(<ClientLayout />);

    act(() => mockProfileListeners.tabPress({ preventDefault }));

    expect(preventDefault).toHaveBeenCalled();
    expect(screen.getByText("guestAuth.title")).toBeTruthy();

    fireEvent.press(screen.getByText("dismiss"));
    expect(screen.queryByText("guestAuth.title")).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();

    act(() => mockProfileListeners.tabPress({ preventDefault }));
    fireEvent.press(screen.getByText("guestAuth.signIn"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/(auth)/ClientLoginScreen", params: { returnTo: "/(client)/settings" } });
  });

  it("opens client registration from the guest modal", () => {
    const screen = render(<ClientLayout />);

    act(() =>
      mockProfileListeners.tabPress({ preventDefault: jest.fn() }),
    );
    fireEvent.press(screen.getByText("guestAuth.createAccount"));

    expect(mockPush).toHaveBeenCalledWith({ pathname: "/(auth)/ClientRegisterScreen", params: { returnTo: "/(client)/settings" } });
  });

  it("allows authenticated clients to open Profile", () => {
    mockSession = { username: "client", role: "client" };
    const preventDefault = jest.fn();
    const screen = render(<ClientLayout />);

    act(() => mockProfileListeners.tabPress({ preventDefault }));

    expect(preventDefault).not.toHaveBeenCalled();
    expect(screen.queryByText("guestAuth.title")).toBeNull();
  });

  it("mirrors the physical tab order in Arabic", () => {
    mockLanguage = "ar";
    render(<ClientLayout />);

    expect(mockTabsOptions.tabBarStyle).toEqual(expect.arrayContaining([
      expect.objectContaining({ transform: [{ scaleX: -1 }] }),
    ]));
    expect(mockTabsOptions.tabBarItemStyle).toEqual(expect.arrayContaining([
      expect.objectContaining({ transform: [{ scaleX: -1 }] }),
    ]));
  });
});
