import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import i18n from "@/localization/i18n";
import UpdateAppModal from "../UpdateAppModal";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe("UpdateAppModal", () => {
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("fr");
    });
  });

  it("shows the localized title and fires onUpdate / onSkip once per press", async () => {
    await i18n.changeLanguage("fr");
    const onUpdate = jest.fn();
    const onSkip = jest.fn();
    const screen = render(<UpdateAppModal visible onUpdate={onUpdate} onSkip={onSkip} />);

    expect(screen.getByText("Nouvelle version disponible")).toBeTruthy();

    fireEvent.press(screen.getByText("Plus tard"));
    fireEvent.press(screen.getByText("Mettre à jour"));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("shows the Arabic labels when the language is switched to ar", async () => {
    await i18n.changeLanguage("ar");
    const screen = render(<UpdateAppModal visible onUpdate={jest.fn()} onSkip={jest.fn()} />);

    expect(screen.getByText("لاحقاً")).toBeTruthy();
    expect(screen.getByText("تحديث")).toBeTruthy();
  });
});
