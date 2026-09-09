import {
  canAccessRoute,
  getUnauthenticatedRedirect,
} from "../routesPermission";

describe("route permissions", () => {
  it.each([
    ["guest", undefined, "(prestataire)/dashboard"],
    ["guest profile", undefined, "(client)/settings/index"],
    ["guest profile edit", undefined, "(client)/settings/profile/index"],
    ["guest cart", undefined, "(client)/cart/index"],
    ["guest legal", undefined, "(client)/settings/pages/Legal"],
    ["guest unavailable legal", undefined, "(auth)/legal"],
    ["guest unavailable waitlist", undefined, "(auth)/prestataire/waitlist"],
    ["client", "client" as const, "(prestataire)/dashboard"],
    ["prestataire", "prestataire" as const, "(client)/settings/index"],
    ["prestataire legal", "prestataire" as const, "(client)/settings/pages/Legal"],
    ["prestataire preview", "prestataire" as const, "(client)/index"],
  ])("denies %s access to %s", (_name, role, route) => {
    expect(canAccessRoute(route, role)).toBe(false);
  });

  it.each([
    ["(auth)/index"],
    ["(auth)/prestataire/forgot-password/index"],
    ["(auth)/prestataire/forgot-password/verification"],
    ["(auth)/prestataire/forgot-password/new-password"],
    ["(auth)/prestataire/forgot-password/success"],
    ["(client)/index"],
    ["(client)/categories/index"],
    ["(client)/categories/[categoryId]/brands"],
    ["(client)/search/index"],
    ["(client)/products/[productId]"],
    ["(client)/products/[productId]/reviews"],
    ["(client)/requests/index"],
    ["(client)/requests/CreateRequestScreen"],
    ["(client)/requests/login-to-send"],
  ])("allows guest preview of %s", (route) => {
    expect(canAccessRoute(route)).toBe(true);
  });

  it("allows each authenticated role to access its own private routes", () => {
    expect(canAccessRoute("(client)/settings/index", "client")).toBe(true);
    expect(canAccessRoute("(client)/settings", "client")).toBe(true);
    expect(canAccessRoute("(client)/categories/[categoryId]/brands", "client")).toBe(true);
    expect(canAccessRoute("(client)/requests/[requestId]", "client")).toBe(true);
    expect(canAccessRoute("(client)/settings/pages/Legal", "client")).toBe(true);
    expect(canAccessRoute("(auth)/prestataire/forgot-password")).toBe(true);
    expect(
      canAccessRoute("(prestataire)/dashboard", "prestataire"),
    ).toBe(true);
    expect(canAccessRoute("(prestataire)/profile/legal", "prestataire")).toBe(true);
  });

  it("uses the correct unauthenticated fallback for each app area", () => {
    expect(getUnauthenticatedRedirect("(client)/settings/profile/index")).toBe(
      "/(auth)/ClientAuthenticationOptionsScreen",
    );
    expect(getUnauthenticatedRedirect("(prestataire)/profile")).toBe(
      "/(auth)",
    );
  });

  it("denies malformed persisted roles without crashing", () => {
    expect(canAccessRoute("(client)/settings", "provider" as never)).toBe(false);
  });
});
