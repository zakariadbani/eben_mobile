import React from "react";
import { render } from "@testing-library/react-native";
import Colors from "@/constants/Colors";
import { TabBarIcon, TabBarLabel } from "../TabBarElement";

it("allows a long Arabic tab label to wrap instead of clipping", () => {
  const label = "طلباتي السابقة الطويلة";
  const screen = render(<TabBarLabel label={label} />);

  expect(screen.getByText(label).props.numberOfLines).toBe(2);
});

it("colours the label with the brand colour only when focused", () => {
  const focused = render(<TabBarLabel label="Liste" focused />);
  expect(focused.getByText("Liste").props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ color: Colors.brand })]),
  );

  const idle = render(<TabBarLabel label="Liste" />);
  expect(idle.getByText("Liste").props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ color: Colors.gray })]),
  );
});

it("shows a count badge on the icon only when the count is positive", () => {
  const withBadge = render(<TabBarIcon name="offers" badge={3} />);
  expect(withBadge.getByTestId("tab-badge-offers")).toBeTruthy();
  expect(withBadge.getByText("3")).toBeTruthy();

  const capped = render(<TabBarIcon name="offers" badge={120} />);
  expect(capped.getByText("99+")).toBeTruthy();

  const zero = render(<TabBarIcon name="offers" badge={0} />);
  expect(zero.queryByTestId("tab-badge-offers")).toBeNull();

  const none = render(<TabBarIcon name="offers" />);
  expect(none.queryByTestId("tab-badge-offers")).toBeNull();
});
