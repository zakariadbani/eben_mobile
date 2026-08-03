import React from "react";
import { render } from "@testing-library/react-native";
import { TabBarLabel } from "../TabBarElement";

it("allows a long Arabic tab label to wrap instead of clipping", () => {
  const label = "\u0637\u0644\u0628\u0627\u062a\u064a \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0627\u0644\u0637\u0648\u064a\u0644\u0629";
  const screen = render(<TabBarLabel label={label} />);

  expect(screen.getByText(label).props.numberOfLines).toBe(2);
});
