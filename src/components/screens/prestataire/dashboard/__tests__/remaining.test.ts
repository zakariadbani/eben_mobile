import Colors from "@/constants/Colors";
import i18n from "@/localization/i18n";
import { getPartnerCountdown, partnerCountdownLabel } from "@/components/screens/prestataire/PartnerDetailBlocks";
import { remainingColor, remainingLabel, remainingMinutes } from "../remaining";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/api/resources/prestataire", () => ({
  getPrestataireOffers: jest.fn(),
}));
jest.mock("@/components/common/AudioPlayer", () => () => null);
jest.mock("@/components/common/ImageSlider", () => () => null);

const NOW = Date.parse("2026-09-13T10:00:00.000Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const inMs = (ms: number) => new Date(NOW + ms).toISOString();

describe("remainingLabel", () => {
  it("keeps the Figma hours / zero-padded minutes format under 24 h", () => {
    expect(remainingLabel(inMs(30 * MINUTE), false, NOW)).toBe("0h 30min restante");
    expect(remainingLabel(inMs(5 * HOUR + 7 * MINUTE), false, NOW)).toBe("5h 07min restante");
    expect(remainingLabel(inMs(DAY - MINUTE), false, NOW)).toBe("23h 59min restante");
    expect(remainingLabel(inMs(50 * MINUTE), true, NOW)).toBe("0 س 50 دقيقة متبقية");
    expect(remainingLabel(inMs(-HOUR), false, NOW)).toBe("0h 00min restante");
  });

  it("switches to days and hours from 24 h", () => {
    expect(remainingLabel(inMs(DAY), false, NOW)).toBe("1j 0h restante");
    expect(remainingLabel(inMs(27 * DAY + 12 * HOUR + 49 * MINUTE), false, NOW)).toBe("27j 12h restante");
    expect(remainingLabel(inMs(660 * HOUR + 49 * MINUTE), false, NOW)).toBe("27j 12h restante");
    expect(remainingLabel(inMs(27 * DAY + 12 * HOUR), true, NOW)).toBe("27 يوم و 12 ساعة متبقية");
  });

  it("does not depend on the current UI language", async () => {
    await i18n.changeLanguage("ar");
    expect(remainingLabel(inMs(2 * DAY + 3 * HOUR), false, NOW)).toBe("2j 3h restante");
    await i18n.changeLanguage("fr");
    expect(remainingLabel(inMs(2 * DAY + 3 * HOUR), true, NOW)).toBe("2 يوم و 3 ساعة متبقية");
  });

  it("keeps the minute count and colour thresholds", () => {
    expect(remainingMinutes(inMs(90 * MINUTE + 30_000), NOW)).toBe(90);
    expect(remainingColor(inMs(59 * MINUTE), NOW)).toBe(Colors.red);
    expect(remainingColor(inMs(90 * MINUTE), NOW)).toBe(Colors.noticeUnread);
    expect(remainingColor(inMs(2 * DAY), NOW)).toBe(Colors.greenDark);
    expect(remainingColor(null, NOW)).toBe(Colors.gray);
  });
});

describe("getPartnerCountdown", () => {
  const base = new Date(NOW).toISOString();

  it("formats hours and minutes inside the 24 h window", () => {
    expect(getPartnerCountdown(base, 24, NOW + 10 * HOUR)).toBe("14h 00min");
    expect(getPartnerCountdown(base, 24, NOW + 24 * HOUR)).toBeNull();
    expect(getPartnerCountdown("not-a-date", 24, NOW)).toBeNull();
  });

  it("formats days and hours from 24 h left", () => {
    expect(getPartnerCountdown(base, 24, NOW)).toBe("1j 0h");
    expect(getPartnerCountdown(base, 700, NOW + 39 * HOUR + 11 * MINUTE)).toBe("27j 12h");
  });

  it("localizes both formats through i18n", () => {
    const fr = i18n.getFixedT("fr");
    const ar = i18n.getFixedT("ar");
    expect(partnerCountdownLabel(base, fr, NOW + 10 * HOUR)).toBe("14h 00min");
    expect(partnerCountdownLabel(base, ar, NOW + 10 * HOUR)).toBe("14 ساعة و 00 دقيقة");
    expect(partnerCountdownLabel(new Date(NOW + 3 * DAY).toISOString(), fr, NOW)).toBe("4j 0h");
    expect(partnerCountdownLabel(new Date(NOW + 3 * DAY).toISOString(), ar, NOW)).toBe("4 يوم و 0 ساعة");
  });
});
