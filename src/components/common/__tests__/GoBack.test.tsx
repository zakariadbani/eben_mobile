import React from "react";
import { render } from "@testing-library/react-native";
import i18n from "@/localization/i18n";
import GoBack from "../GoBack";

jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn().mockResolvedValue(null) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));

describe("GoBack", () => {
  beforeEach(async () => { await i18n.changeLanguage("ar"); });

  it("announces a localized back action instead of its icon name", () => {
    const screen = render(<GoBack />);
    expect(screen.getByRole("button", { name: i18n.t("accessibility.back") })).toBeTruthy();
  });
});