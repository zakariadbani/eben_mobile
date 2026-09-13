import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LanguagePicker from "@/components/common/LanguagePicker";
import i18n from "@/localization/i18n";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/localization/i18n", () => ({
  language: "fr",
  t: (key: string) => key,
  changeLanguage: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "fr" },
    t: (key: string) => key,
  }),
}));

const FRENCH = "Français";
const ARABIC = "العربية";

describe("LanguagePicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a centered label and chevron without the native picker", async () => {
    const screen = render(<LanguagePicker />);
    await act(async () => undefined);

    expect(screen.getByText(FRENCH)).toBeTruthy();
    expect(screen.getByTestId("language-picker-chevron")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choisissez votre langue" })).toBeTruthy();
    expect(screen.queryByTestId("picker-popover")).toBeNull();
  });

  it("opens the JS popover and updates and persists the selected language", async () => {
    const screen = render(<LanguagePicker />);
    await act(async () => undefined);

    fireEvent.press(screen.getByTestId("language-picker"));
    await act(async () => undefined);
    expect(screen.getByTestId("picker-popover")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: ARABIC }));

    await waitFor(() => {
      expect(i18n.changeLanguage).toHaveBeenCalledWith("ar");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("language", "ar");
    });
    expect(screen.queryByTestId("picker-popover")).toBeNull();
    expect(screen.getByText(ARABIC)).toBeTruthy();
    expect(screen.queryByText(FRENCH)).toBeNull();
  });

  it("restores the persisted language on mount", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("ar");
    const screen = render(<LanguagePicker variant="secondary" />);

    expect(await screen.findByText(ARABIC)).toBeTruthy();
    expect(i18n.changeLanguage).toHaveBeenCalledWith("ar");
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
