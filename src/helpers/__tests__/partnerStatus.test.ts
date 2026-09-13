import Colors from "@/constants/Colors";
import i18n from "@/localization/i18n";
import {
  offerStatusLabelKey,
  orderStatusLabelKey,
  statusColor,
  statusIcon,
} from "../partnerStatus";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));

describe("offerStatusLabelKey", () => {
  it("maps offer statuses to the Figma labels", () => {
    expect(i18n.t(offerStatusLabelKey("expired"))).toBe("Offre manquée");
    expect(i18n.t(offerStatusLabelKey("pending"))).toBe("En attente");
    expect(i18n.t(offerStatusLabelKey("validated"))).toBe("En attente");
    expect(i18n.t(offerStatusLabelKey("rejected"))).toBe("Refusée");
    expect(i18n.t(offerStatusLabelKey("selected"))).toBe("Acceptée");
  });
});

describe("orderStatusLabelKey", () => {
  it("maps order statuses to the Figma labels", () => {
    expect(i18n.t(orderStatusLabelKey("processing"))).toBe("En traitement");
    expect(i18n.t(orderStatusLabelKey("shipped"))).toBe("Expédiée");
    expect(i18n.t(orderStatusLabelKey("delivered"))).toBe("Livré");
    expect(i18n.t(orderStatusLabelKey("refunded"))).toBe("Retourné");
    expect(i18n.t(orderStatusLabelKey("cancelled"))).toBe("Annulée");
  });

  it("maps purchase-order statuses to the Figma labels", () => {
    expect(i18n.t(orderStatusLabelKey("ready"))).toBe("Prêt à être collecter");
    expect(i18n.t(orderStatusLabelKey("received"))).toBe("Livré");
    expect(i18n.t(orderStatusLabelKey("preparing"))).toBe("En traitement");
    expect(i18n.t(orderStatusLabelKey("acknowledged"))).toBe("En traitement");
  });

  it("has an Arabic translation for every label key", () => {
    const keys = [
      ...(["expired", "pending", "rejected", "selected"] as const).map(offerStatusLabelKey),
      ...(["processing", "shipped", "delivered", "refunded", "cancelled", "ready"] as const).map(orderStatusLabelKey),
    ];
    keys.forEach((key) => {
      expect(i18n.exists(key, { lng: "ar" })).toBe(true);
    });
  });
});

describe("statusColor", () => {
  it("returns the Figma colour per status", () => {
    expect(statusColor("expired")).toBe(Colors.grayMidDark);
    expect(statusColor("pending")).toBe(Colors.blue);
    expect(statusColor("rejected")).toBe(Colors.redLight);
    expect(statusColor("selected")).toBe(Colors.greenDark);
    expect(statusColor("processing")).toBe(Colors.blue);
    expect(statusColor("shipped")).toBe(Colors.greenDark);
    expect(statusColor("delivered")).toBe(Colors.brand);
    expect(statusColor("ready")).toBe(Colors.blue);
    expect(statusColor("refunded")).toBe(Colors.orange);
    expect(statusColor("cancelled")).toBe(Colors.red);
  });
});

describe("statusIcon", () => {
  it("returns a Figma icon per status", () => {
    expect(statusIcon("pending")).toEqual({ name: "clock", type: "Feather" });
    expect(statusIcon("shipped")).toEqual({ name: "truck", type: "Feather" });
    expect(statusIcon("delivered")).toEqual({ name: "package", type: "Feather" });
    expect(statusIcon("refunded")).toEqual({ name: "corner-up-left", type: "Feather" });
  });
});
