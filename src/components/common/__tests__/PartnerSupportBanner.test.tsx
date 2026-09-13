import React from "react";
import { Linking } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import i18n from "@/localization/i18n";
import PartnerSupportBanner from "../PartnerSupportBanner";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("PartnerSupportBanner", () => {
  const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(true);

  beforeEach(async () => {
    openUrl.mockClear();
    await i18n.changeLanguage("fr");
  });

  it("renders the Figma copy and dials the support number", () => {
    const screen = render(<PartnerSupportBanner />);

    expect(screen.getByText("3ndk chi sou2al??")).toBeTruthy();
    expect(screen.getByText(i18n.t("partner.dashboard.supportBody"))).toBeTruthy();
    expect(screen.getByText(i18n.t("partner.dashboard.supportPhone"))).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.dashboard.supportCall") }));
    expect(openUrl).toHaveBeenCalledWith(`tel:${i18n.t("partner.dashboard.supportPhone").replace(/\s/g, "")}`);
  });

  it("keeps the same title in Arabic and lets a screen override the phone", async () => {
    await i18n.changeLanguage("ar");
    const screen = render(<PartnerSupportBanner phone="06 66 77 88 99" />);

    expect(screen.getByText("3ndk chi sou2al??")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.dashboard.supportCall") }));
    expect(openUrl).toHaveBeenCalledWith("tel:0666778899");
  });
});
