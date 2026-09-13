import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import ClientLayout, { clientSectionFromPath } from "../_layout";
import { getBasket, getNotifications } from "@/api";
import { setClientHasUnreadNotifications } from "@/hooks/useClientUnreadNotifications";
import type { Notification } from "@/interfaces/Notification";
import type { Basket } from "@/interfaces/Basket";

// ClientLayout now also mounts RequestDraftProvider (AsyncStorage-backed).
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// ClientTabs reads useSafeAreaInsets() directly (no <SafeAreaProvider> in
// this render tree); the library's own jest mock resolves it to zeroed
// insets instead of throwing "No safe area value available."
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

const mockPush = jest.fn();
let mockSession: { username: string; role: string; user?: { avatar: string | null } } | null = null;
type TabRenderer = (props: { focused: boolean; color: string }) => React.ReactElement | null;
let mockScreenOptions: Record<string, {
  header?: unknown;
  tabBarBadge?: number;
  tabBarIcon?: TabRenderer;
  tabBarLabel?: TabRenderer;
}> = {};
let mockTabsOptions: Record<string, unknown> = {};
let mockLanguage = "fr";
let mockPathname = "/";
let mockSearchParams: { from?: string } = {};
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
    options?: { header?: unknown; tabBarBadge?: number; tabBarIcon?: TabRenderer; tabBarLabel?: TabRenderer };
  }) {
    if (name === "settings/index" && listeners) mockProfileListeners = listeners;
    mockScreenOptions[name] = options ?? {};
    return null;
  };

  return {
    Href: {},
    Tabs,
    useRouter: () => ({ push: mockPush }),
    usePathname: () => mockPathname,
    useGlobalSearchParams: () => mockSearchParams,
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

jest.mock("@/api", () => ({ getBasket: jest.fn(), getNotifications: jest.fn() }));

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
const mockGetNotifications = getNotifications as jest.MockedFunction<typeof getNotifications>;

describe("Client Profile tab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = null;
    mockScreenOptions = {};
    mockTabsOptions = {};
    mockLanguage = "fr";
    mockPathname = "/";
    mockSearchParams = {};
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
      id: 1, userId: 5, requestId: null, premium: false, premiumFee: 0, subtotal: 0, discountAmount: 0, shippingFee: 0, taxAmount: 0, total: 0,
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
      id: 2, userId: 5, requestId: null, premium: false, premiumFee: 0, subtotal: 0, discountAmount: 0, shippingFee: 0, taxAmount: 0, total: 0,
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

  it("shows the Figma unread dot on the Home header bell once unread notifications load", async () => {
    mockSession = { username: "zak", role: "client", user: { avatar: null } };
    setClientHasUnreadNotifications(false);
    const unread = { id: 1, isRead: false } as Notification;
    mockGetNotifications.mockResolvedValue({
      success: true,
      data: [unread],
      pagination: { currentPage: 1, lastPage: 1, perPage: 20, total: 1, from: 1, to: 1 },
    });
    render(<ClientLayout />);

    const renderHeader = mockScreenOptions["index"]!.header as () => React.ReactElement;
    const header = render(renderHeader());
    expect(header.queryByTestId("header-bell-unread")).toBeNull();

    await waitFor(() => expect(header.getByTestId("header-bell-unread")).toBeTruthy());
    fireEvent.press(header.getByTestId("header-bell"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(client)/settings/notifications",
      params: { from: "home" },
    });
  });

  it("keeps the Liste tab active on nested request screens with icon-only inactive tabs", () => {
    mockPathname = "/requests/23/offers/27";
    render(<ClientLayout />);

    const listIcon = render(mockScreenOptions["requests/index"]!.tabBarIcon!({ focused: false, color: "" })!);
    expect(listIcon.UNSAFE_root.findAll((node) => node.props.name === "liste_active").length).toBeGreaterThan(0);
    expect(mockScreenOptions["requests/index"]!.tabBarLabel!({ focused: false, color: "" })).not.toBeNull();
    // Figma: inactive tabs show their icon only.
    expect(mockScreenOptions["index"]!.tabBarLabel!({ focused: false, color: "" })).toBeNull();
    expect(mockScreenOptions["cart/index"]!.tabBarLabel!({ focused: false, color: "" })).toBeNull();
  });
});

describe("clientSectionFromPath", () => {
  it.each([
    ["/", undefined, "home"],
    ["/(client)", undefined, "home"],
    ["/requests/23", undefined, "list"],
    ["/(client)/requests/23/offers", undefined, "list"],
    ["/requests/23/offers/27", undefined, "list"],
    ["/settings/notifications", undefined, "profile"],
    ["/settings/notifications", "home", "home"],
    ["/cart", undefined, "cart"],
    ["/categories/10", undefined, "search"],
    ["/unknown", undefined, null],
  ])("maps %s with origin %s to %s", (pathname, from, section) => {
    expect(clientSectionFromPath(pathname, from)).toBe(section);
  });
});
