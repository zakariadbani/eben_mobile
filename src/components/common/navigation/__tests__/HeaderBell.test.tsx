import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import i18n from "@/localization/i18n";
import HeaderBell from "../HeaderBell";

const mockPush = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("HeaderBell", () => {
  beforeEach(async () => {
    mockPush.mockClear();
    await i18n.changeLanguage("fr");
  });

  it("renders the unread dot only when hasUnread is set", () => {
    const unread = render(<HeaderBell hasUnread />);
    expect(unread.getByTestId("header-bell-unread")).toBeTruthy();

    const read = render(<HeaderBell />);
    expect(read.queryByTestId("header-bell-unread")).toBeNull();
  });

  it("opens the partner notifications screen by default and honours onPress", () => {
    const screen = render(<HeaderBell />);
    fireEvent.press(screen.getByRole("button", { name: i18n.t("partner.notifications.title") }));
    expect(mockPush).toHaveBeenCalledWith("/(prestataire)/profile/notifications");

    const onPress = jest.fn();
    const custom = render(<HeaderBell onPress={onPress} testID="bell-custom" />);
    fireEvent.press(custom.getByTestId("bell-custom"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
