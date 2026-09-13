import React from "react";
import { StyleSheet, type StyleProp, type TextStyle } from "react-native";
import type { ReactTestInstance } from "react-test-renderer";
import { render } from "@testing-library/react-native";

import i18n from "@/localization/i18n";
import { Text, arabicFamilyFor, scriptRunsOf, usesArabicFont } from "../Text";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));

const fontFamilyOf = (node: ReactTestInstance): string | undefined =>
  StyleSheet.flatten(node.props.style as StyleProp<TextStyle>)?.fontFamily;

const textOf = (node: ReactTestInstance | string): string =>
  typeof node === "string" ? node : node.children.map(textOf).join("");

/** Nested text spans of a host Text: [text, fontFamily] pairs. */
const spansOf = (node: ReactTestInstance): [string, string | undefined][] =>
  node.children
    .filter((child): child is ReactTestInstance => typeof child !== "string")
    .map((span) => [textOf(span), fontFamilyOf(span)]);

describe("Text Arabic font", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("only uses NotoNaskhArabic for Arabic script in Arabic", async () => {
    await i18n.changeLanguage("ar");
    const screen = render(
      <>
        <Text type="textTwo" translate={false}>{"أهلا"}</Text>
        <Text type="textTwo" semiBold translate={false}>{"مرحبا"}</Text>
        <Text type="textTwo" bold translate={false}>{"تفاصيل"}</Text>
        <Text type="headerTitle" translate={false}>{"عروضك"}</Text>
        <Text type="textTwo" semiBold translate={false}>{"640,00 Dhs"}</Text>
        <Text type="label" translate={false}>{"3ndk chi sou2al??"}</Text>
        <Text type="label" translate={false}>{12}</Text>
      </>,
    );

    expect(fontFamilyOf(screen.getByText("أهلا"))).toBe("NotoNaskhArabic");
    expect(fontFamilyOf(screen.getByText("مرحبا"))).toBe("NotoNaskhArabicSemiBold");
    expect(fontFamilyOf(screen.getByText("تفاصيل"))).toBe("NotoNaskhArabicBold");
    expect(fontFamilyOf(screen.getByText("عروضك"))).toBe("NotoNaskhArabicSemiBold");
    expect(fontFamilyOf(screen.getByText("640,00 Dhs"))).toBe("BarlowCondensedSemiBold");
    expect(fontFamilyOf(screen.getByText("3ndk chi sou2al??"))).toBe("Roboto");
    expect(fontFamilyOf(screen.getByText("12"))).toBe("Roboto");
    // Single-script text is not split into spans.
    expect(spansOf(screen.getByText("مرحبا"))).toEqual([]);
    expect(spansOf(screen.getByText("640,00 Dhs"))).toEqual([]);
  });

  it("keeps the type-map family in French and the Arabic family for element children", () => {
    expect(usesArabicFont("fr", "مرحبا")).toBe(false);
    expect(usesArabicFont("ar", ["REQ-", 12])).toBe(false);
    expect(usesArabicFont("ar", ["المرجع: ", "REQ-12"])).toBe(true);
    expect(usesArabicFont("ar", <Text>Demo</Text>)).toBe(true);
  });

  it("maps the type-map weight to the matching Arabic instance", () => {
    expect(arabicFamilyFor("Roboto")).toBe("NotoNaskhArabic");
    expect(arabicFamilyFor("BarlowCondensed")).toBe("NotoNaskhArabic");
    expect(arabicFamilyFor("RobotoSemiBold")).toBe("NotoNaskhArabicSemiBold");
    expect(arabicFamilyFor("BarlowCondensedSemiBold")).toBe("NotoNaskhArabicSemiBold");
    expect(arabicFamilyFor("RobotoBold")).toBe("NotoNaskhArabicBold");
    expect(arabicFamilyFor("BarlowCondensedBold")).toBe("NotoNaskhArabicBold");
  });

  it("splits mixed text into script runs, neutrals staying with the preceding run", () => {
    expect(scriptRunsOf("المرجع: REQ-JPTAI97E")).toEqual([
      { text: "المرجع: ", arabic: true },
      { text: "REQ-JPTAI97E", arabic: false },
    ]);
    expect(scriptRunsOf("23h44 - المرجع: OFF-S0FNUQW0")).toEqual([
      { text: "23h44 - ", arabic: false },
      { text: "المرجع: ", arabic: true },
      { text: "OFF-S0FNUQW0", arabic: false },
    ]);
    expect(scriptRunsOf("« Febi » العلامة")).toEqual([
      { text: "« Febi » ", arabic: false },
      { text: "العلامة", arabic: true },
    ]);
    expect(scriptRunsOf("مرحبا")).toEqual([{ text: "مرحبا", arabic: true }]);
    expect(scriptRunsOf("— (6)")).toEqual([{ text: "— (6)", arabic: false }]);
    expect(scriptRunsOf("...")).toEqual([{ text: "...", arabic: false }]);
    expect(scriptRunsOf("")).toEqual([]);
  });

  it("renders mixed Arabic / Latin text as nested spans with per-script families", async () => {
    await i18n.changeLanguage("ar");
    const screen = render(
      <>
        <Text
          type="label"
          translate={false}
          numberOfLines={1}
          testID="ref-line"
          accessibilityLabel="ref"
        >
          {"المرجع: REQ-JPTAI97E"}
        </Text>
        <Text type="labelTwo" semiBold translate={false}>{["23h44 - ", "المرجع: ", "OFF-S0FNUQW0"]}</Text>
        <Text type="label" translate={false}>{"العلامة التجارية : Febi"}</Text>
      </>,
    );

    // Full-string queries still match: nested span text concatenates.
    const ref = screen.getByText("المرجع: REQ-JPTAI97E");
    expect(ref).toBe(screen.getByTestId("ref-line"));
    expect(ref.props.numberOfLines).toBe(1);
    expect(ref.props.accessibilityLabel).toBe("ref");
    expect(fontFamilyOf(ref)).toBe("NotoNaskhArabic");
    expect(spansOf(ref)).toEqual([
      ["المرجع: ", "NotoNaskhArabic"],
      ["REQ-JPTAI97E", "Roboto"],
    ]);

    const offer = screen.getByText("23h44 - المرجع: OFF-S0FNUQW0");
    expect(spansOf(offer)).toEqual([
      ["23h44 - ", "BarlowCondensedSemiBold"],
      ["المرجع: ", "NotoNaskhArabicSemiBold"],
      ["OFF-S0FNUQW0", "BarlowCondensedSemiBold"],
    ]);

    expect(spansOf(screen.getByText("العلامة التجارية : Febi"))).toEqual([
      ["العلامة التجارية : ", "NotoNaskhArabic"],
      ["Febi", "Roboto"],
    ]);
  });

  it("translates before splitting and keeps an explicit style fontFamily unsplit", async () => {
    await i18n.changeLanguage("ar");
    const screen = render(
      <>
        <Text type="label">{"partner.offerDetail.otherOffers"}</Text>
        <Text type="label" translate={false} style={{ fontFamily: "BarlowCondensedBold" }}>{"المرجع: REQ-1"}</Text>
      </>,
    );

    expect(screen.getByText(i18n.t("partner.offerDetail.otherOffers"))).toBeTruthy();
    const forced = screen.getByText("المرجع: REQ-1");
    expect(fontFamilyOf(forced)).toBe("BarlowCondensedBold");
    expect(spansOf(forced)).toEqual([]);
  });

  it("does not split mixed text in French", () => {
    const screen = render(<Text type="label" translate={false}>{"Ref: REQ-1 المرجع"}</Text>);
    const node = screen.getByText("Ref: REQ-1 المرجع");
    expect(fontFamilyOf(node)).toBe("Roboto");
    expect(spansOf(node)).toEqual([]);
  });
});
