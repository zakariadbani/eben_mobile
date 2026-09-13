import React from "react";
import { render } from "@testing-library/react-native";

import PrestataireLayout from "../_layout";

let mockScreenOptions: Record<string, Record<string, unknown>> = {};

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("expo-router", () => {
  const ReactRuntime = jest.requireActual<typeof import("react")>("react");
  const Tabs = function MockTabs({ children }: { children: React.ReactNode }) {
    return ReactRuntime.createElement(ReactRuntime.Fragment, null, children);
  };

  Tabs.Screen = function MockTabsScreen({
    name,
    options,
  }: {
    name: string;
    options?: Record<string, unknown>;
  }) {
    mockScreenOptions[name] = options ?? {};
    return null;
  };

  return {
    Href: {},
    Tabs,
    usePathname: () => "/dashboard",
    useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "fr" },
  }),
}));

jest.mock("@/context/AuthContext", () => ({
  useSession: () => ({ username: "vendeur", session: { user: { avatar: null } } }),
}));

jest.mock("@/hooks/usePartnerBadges", () => ({
  refreshPartnerUnreadNotifications: jest.fn(),
  usePartnerBadges: () => ({ openRequestsCount: 0, hasUnreadNotifications: false }),
}));

describe("Prestataire tab registration", () => {
  beforeEach(() => {
    mockScreenOptions = {};
  });

  it("keeps phone verification as a hidden profile drill-down route", () => {
    render(<PrestataireLayout />);

    expect(mockScreenOptions["profile/verify-phone"]).toEqual(
      expect.objectContaining({ href: null, headerShown: false }),
    );
  });
});
