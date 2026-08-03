import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import i18n from "@/localization/i18n";
import AudioPlayer from "../AudioPlayer";
import ImageSlider from "../ImageSlider";
import PickerInput from "../PickerInput";

const mockCreateAsync = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("expo-av", () => ({
  Audio: {
    Sound: {
      createAsync: (...args: unknown[]) => mockCreateAsync(...args),
    },
  },
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage("ar");
});

it("gives the audio control a localized name and playback state", () => {
  const screen = render(<AudioPlayer uri="https://cdn.example.test/note.mp3" />);

  const control = screen.getByRole("button", { name: i18n.t("requestFlow.audio") });
  expect(control.props.accessibilityState).toMatchObject({ selected: false, busy: false });
});

it("sizes image pages from their rendered container and describes each image", () => {
  const screen = render(<ImageSlider images={["https://cdn.example.test/1.jpg", "https://cdn.example.test/2.jpg"]} />);

  fireEvent(screen.getByTestId("image-slider"), "layout", {
    nativeEvent: { layout: { width: 328, height: 220, x: 0, y: 0 } },
  });

  expect(screen.getByTestId("image-slide-0").props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ width: 328 })]),
  );
  expect(screen.getByLabelText(`${i18n.t("requestFlow.images")} 1/2`)).toBeTruthy();
});

it("announces picker items using their localized display value", async () => {
  const screen = render(
    <PickerInput
      label="Filtrer"
      items={[{ id: 1, title: "Fermer" }]}
      onSelectItem={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByRole("button", { name: i18n.t("Filtrer") }));

  await act(async () => undefined);
  expect(screen.getAllByRole("button", { name: i18n.t("Fermer") })).toEqual(
    expect.arrayContaining([expect.objectContaining({ props: expect.objectContaining({ accessibilityState: { selected: false } }) })]),
  );
});
