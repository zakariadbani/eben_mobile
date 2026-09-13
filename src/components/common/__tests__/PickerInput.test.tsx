import React from "react";
import { StyleSheet } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

import Colors from "@/constants/Colors";
import i18n from "@/localization/i18n";
import Icon from "../Icon";
import PickerInput from "../PickerInput";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const items = [
  { id: 1, title: "Tout" },
  { id: 2, title: "Mécanique" },
  { id: 3, title: "Carrosserie" },
];

describe("PickerInput", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows the placeholder prop and falls back to the localized default", () => {
    const withProp = render(
      <PickerInput items={items} onSelectItem={jest.fn()} placeholder="Choisir une catégorie" />,
    );
    expect(withProp.getByText("Choisir une catégorie")).toBeTruthy();
    expect(withProp.queryByText("Sélectionner ...")).toBeNull();

    const withoutProp = render(<PickerInput items={items} onSelectItem={jest.fn()} />);
    expect(withoutProp.getByText(i18n.t("Sélectionner ..."))).toBeTruthy();
  });

  it("opens a popover without header or close button and highlights the selected row", async () => {
    const screen = render(
      <PickerInput
        label="Filtrer"
        items={items}
        selectedItem={items[0]}
        onSelectItem={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Filtrer" }));
    await act(async () => undefined);

    expect(screen.getByTestId("picker-popover")).toBeTruthy();
    expect(screen.queryByRole("button", { name: i18n.t("Fermer"), })).toBeTruthy(); // backdrop only
    expect(screen.queryByText(i18n.t("Fermer"))).toBeNull(); // no footer button text

    const rowNamed = (name: string) => {
      const row = screen
        .getAllByRole("button", { name })
        .find((node) => node.props.accessibilityState?.selected !== undefined);
      if (!row) throw new Error(`no picker row named ${name}`);
      return row;
    };

    const selectedRow = rowNamed("Tout");
    expect(selectedRow.props.accessibilityState).toEqual({ selected: true });
    expect(StyleSheet.flatten(selectedRow.props.style).backgroundColor).toBe(Colors.primary);

    const otherRow = rowNamed("Mécanique");
    expect(otherRow.props.accessibilityState).toEqual({ selected: false });
    expect(StyleSheet.flatten(otherRow.props.style).backgroundColor).not.toBe(Colors.primary);
  });

  it("selects a row, closes the popover, and reports the item", async () => {
    const onSelectItem = jest.fn();
    const screen = render(<PickerInput items={items} onSelectItem={onSelectItem} />);

    fireEvent.press(screen.getByRole("button", { name: i18n.t("Sélectionner ...") }));
    await act(async () => undefined);
    fireEvent.press(screen.getByRole("button", { name: "Carrosserie" }));
    await act(async () => undefined);

    expect(onSelectItem).toHaveBeenCalledWith(items[2]);
    expect(screen.queryByTestId("picker-popover")).toBeNull();
  });

  it("sizes the chevron and centres it vertically on the trailing edge in Arabic", async () => {
    await i18n.changeLanguage("ar");
    const screen = render(<PickerInput items={items} selectedItem={items[0]} onSelectItem={jest.fn()} chevronSize={34} />);

    const chevron = screen.UNSAFE_getByType(Icon);
    expect(chevron.props).toEqual(expect.objectContaining({ name: "chevron-down", size: 34 }));
    let box = chevron.parent;
    while (box && StyleSheet.flatten(box.props.style)?.position !== "absolute") box = box.parent;
    expect(StyleSheet.flatten(box!.props.style)).toEqual(expect.objectContaining({
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 6,
      justifyContent: "center",
    }));
  });
});
