import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import ClientLayout from "../_layout";
import { getBasket } from "@/api";
import type { Basket } from "@/interfaces/Basket";

const mockPush = jest.fn();
let mockSession: { username: string; role: string } | null = null;
let mockScreenOptions: Record<string, { header?: unknown; tabBarBadge?: number }> = {};
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
    options?: { header?: unknown; tabBarBadge?: number };
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
  Role: { CLIENT: "client", PRESTATAIRE: "prestataire" },
  useSession: () => ({
    session: mockSession,
    username: mockSession?.username ?? null,
    role: mockSession?.role ?? "guest",
  }),
}));

jest.mock("@/api", () => ({ getBasket: jest.fn() }));

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

const mockGetBasket = getBasket as jest.MockedFunction<typeof getBasket>;

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

  it("shows the cart item count as a tab badge for a signed-in client", async () => {
    mockSession = { username: "client", role: "client" };
    const basket: Basket = {
      id: 1, userId: 5, requestId: null, subtotal: 0, discountAmount: 0, shippingFee: 0, taxAmount: 0, total: 0,
      createdAt: "2026-01-01", updatedAt: "2026-01-01",
      items: [{ id: 1, basketId: 1, offerId: 1, categoryId: 1, quantity: 3, unitPrice: 10, createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
    };
    mockGetBasket.mockResolvedValue({ success: true, data: basket });

    render(<ClientLayout />);

    await waitFor(() => expect(mockScreenOptions["cart/index"]?.tabBarBadge).toBe(3));
  });

  it("shows no cart tab badge for a signed-in client with an empty basket", async () => {
    mockSession = { username: "client", role: "client" };
    const emptyBasket: Basket = {
      id: 2, userId: 5, requestId: null, subtotal: 0, discountAmount: 0, shippingFee: 0, taxAmount: 0, total: 0,
      createdAt: "2026-01-01", updatedAt: "2026-01-01",
      items: [],
    };
    let resolveBasket!: (value: Awaited<ReturnType<typeof getBasket>>) => void;
    mockGetBasket.mockReturnValue(new Promise((resolve) => { resolveBasket = resolve; }));

    render(<ClientLayout />);
    await act(async () => {
      resolveBasket({ success: true, data: emptyBasket });
      await Promise.resolve();
    });

    expect(mockScreenOptions["cart/index"]?.tabBarBadge).toBeUndefined();
  });
});
