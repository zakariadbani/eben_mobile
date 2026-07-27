import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
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

describe("LanguagePicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a centered language label and a visible select affordance", () => {
    const { getByTestId, getByText } = render(<LanguagePicker />);

    expect(getByText("Fran\u00e7ais")).toBeTruthy();
    expect(getByTestId("language-picker-chevron")).toBeTruthy();
  });

  it("updates and persists the selected language", async () => {
    const { getByTestId, getByText } = render(<LanguagePicker />);

    fireEvent(getByTestId("language-picker"), "valueChange", "ar");

    await waitFor(() => {
      expect(getByText("\u0627\u0644\u0639\u0631\u0628\u064a\u0629")).toBeTruthy();
      expect(i18n.changeLanguage).toHaveBeenCalledWith("ar");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("language", "ar");
    });
  });
});