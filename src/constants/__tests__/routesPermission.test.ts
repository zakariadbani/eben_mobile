import {
  canAccessRoute,
  getUnauthenticatedRedirect,
} from "../routesPermission";

describe("route permissions", () => {
  it.each([
    ["guest", undefined, "(prestataire)/dashboard"],
    ["guest profile", undefined, "(client)/settings/index"],
    ["guest profile edit", undefined, "(client)/settings/profile/index"],
    ["guest request list", undefined, "(client)/requests/index"],
    ["guest cart", undefined, "(client)/cart/index"],
    ["guest unavailable legal", undefined, "(auth)/legal"],
    ["guest unavailable waitlist", undefined, "(auth)/prestataire/waitlist"],
    ["client unapproved legal", "client" as const, "(client)/settings/pages/Legal"],
    ["client", "client" as const, "(prestataire)/dashboard"],
    ["prestataire", "prestataire" as const, "(client)/settings/index"],
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
    ["(client)/search/index"],
    ["(client)/products/[productId]"],
    ["(client)/products/[productId]/reviews"],
    ["(client)/requests/login-to-send"],
  ])("allows guest preview of %s", (route) => {
    expect(canAccessRoute(route)).toBe(true);
  });

  it("allows each authenticated role to access its own private routes", () => {
    expect(canAccessRoute("(client)/settings/index", "client")).toBe(true);
    expect(canAccessRoute("(client)/settings", "client")).toBe(true);
    expect(canAccessRoute("(client)/requests/[requestId]", "client")).toBe(true);
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
