import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import i18n from "@/localization/i18n";
import PartnerHistoryToolbar from "../PartnerHistoryToolbar";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));

it("exposes a named 48dp clear-search control", async () => {
  await i18n.changeLanguage("ar");
  const screen = render(
    <PartnerHistoryToolbar
      monthLabel="غشت 2026"
      count={2}
      query="OFF"
      onQueryChange={jest.fn()}
    />,
  );

  const clear = screen.getByRole("button", { name: i18n.t("partner.search.clear") });
  expect(StyleSheet.flatten(clear.props.style)).toMatchObject({ minWidth: 48, minHeight: 48 });
});
