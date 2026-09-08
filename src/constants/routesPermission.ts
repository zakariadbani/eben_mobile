// ---------------------------------------------------------------------------
// Route permission map
//
// Every route registered in a _layout.tsx MUST appear here under the
// appropriate role key. The root _layout.tsx guard compares the active
// segment string against these lists on every navigation event.
//
// Segment format: group name WITHOUT leading slash, e.g. "(client)/index"
// not "/(client)/index". Expo Router's useSegments().join("/") produces
// this format.
//
// "public" routes are accessible regardless of role (including guests).
// "guest"  routes are accessible only when unauthenticated (unused for now).
// ---------------------------------------------------------------------------

export type AllowedRole = "guest" | "client" | "prestataire" | "public";
export type AuthenticatedRole = Exclude<AllowedRole, "guest" | "public">;

const allowedRoutes: Record<AllowedRole, string[]> = {
  // -------------------------------------------------------------------------
  // Unauthenticated-only routes (currently unused — kept as extension point)
  // -------------------------------------------------------------------------
  guest: [],

  // -------------------------------------------------------------------------
  // CLIENT routes
  // All screens inside (client)/** that an authenticated client may visit.
  // -------------------------------------------------------------------------
  client: [
    // Root group
    "(client)",

    // Home tab
    "(client)/index",

    // Search / Categories tab
    "(client)/categories/index",
    "(client)/categories/[categoryId]/index",
    "(client)/categories/results",

    // Tyre / part search screens
    "(client)/search",
    "(client)/search/index",
    "(client)/search/add-car",
    "(client)/search/change-car",

    // Liste / Requests tab
    "(client)/requests/index",
    "(client)/requests/CreateRequestScreen",
    "(client)/requests/OrdersListScreen",
    "(client)/requests/success",
    "(client)/requests/login-to-send",
    "(client)/requests/[requestId]/index",
    "(client)/requests/[requestId]/offers/index",
    "(client)/requests/[requestId]/offers/[offerId]/index",

    // Cart tab
    "(client)/cart/index",

    // Payment / checkout (hidden sub-screens of cart flow)
    "(client)/payment/index",
    "(client)/payment/success",

    // Product detail + reviews/review/report
    "(client)/products/[productId]",
    "(client)/products/[productId]/reviews",
    "(client)/products/[productId]/review",
    "(client)/products/[productId]/report",

    // Profile / Settings tab
    "(client)/settings/index",
    "(client)/settings/profile/index",
    "(client)/settings/profile/verify-phone",
    "(client)/settings/orders/index",
    "(client)/settings/orders/[orderId]/index",
    "(client)/settings/archived-offers/index",
    "(client)/settings/parking/index",
    "(client)/settings/addresses/index",
    "(client)/settings/addresses/add",
    "(client)/settings/addresses/[addressId]/index",
    "(client)/settings/payment/index",
    "(client)/settings/notifications/index",
    "(client)/settings/wishlist/index",
    "(client)/settings/pages/About",
    "(client)/settings/pages/Legal",
    "(client)/settings/language/index",
  ],

  // -------------------------------------------------------------------------
  // PRESTATAIRE routes
  // All screens inside (prestataire)/** that an authenticated provider may visit.
  // -------------------------------------------------------------------------
  prestataire: [
    // Root group
    "(prestataire)",

    // Home / Dashboard tab
    "(prestataire)/dashboard",

    // Search tab — placeholder (P4+)
    "(prestataire)/search",
    "(prestataire)/search/index",

    // Orders tab — placeholder (P4)
    "(prestataire)/orders",
    "(prestataire)/orders/index",
    "(prestataire)/orders/[orderId]",

    // Offers tab — centre/emphasized
    "(prestataire)/offers",
    "(prestataire)/offers/index",

    // Profile tab + P5 sub-screens
    "(prestataire)/profile",
    "(prestataire)/profile/index",
    "(prestataire)/profile/overview",
    "(prestataire)/profile/edit",
    "(prestataire)/profile/company",
    "(prestataire)/profile/wallet",
    "(prestataire)/profile/wallet/index",
    "(prestataire)/profile/wallet/withdraw",
    "(prestataire)/profile/wallet/verification",
    "(prestataire)/profile/wallet/success",
    "(prestataire)/profile/orders-history",
    "(prestataire)/profile/offers-history",
    "(prestataire)/profile/notifications",
    "(prestataire)/profile/language",
    "(prestataire)/profile/about",
    "(prestataire)/profile/legal",

    // Legacy stub screen kept from original scaffold
    "(prestataire)/settings",

    // Offer sub-flow (drill-down from offers/index)
    "(prestataire)/offers/[offerId]",
    "(prestataire)/offers/[offerId]/fill",
    "(prestataire)/offers/[offerId]/ship",
  ],

  // -------------------------------------------------------------------------
  // PUBLIC routes
  // Accessible to all users regardless of auth state (auth flow + shared).
  // -------------------------------------------------------------------------
  public: [
    // Auth group
    "(auth)",
    "(auth)/index",
    "(auth)/language",
    "(auth)/loading",
    "(auth)/WelcomeRoleSelectionScreen",
    "(auth)/ClientAuthenticationOptionsScreen",
    "(auth)/ClientRegisterScreen",
    "(auth)/ClientLoginScreen",
    "(auth)/ForgotPasswordScreen",
    // Forgot-password sub-flow
    "(auth)/forgot-password/verification",
    "(auth)/forgot-password/new-password",
    "(auth)/forgot-password/success",
    // Registration sub-flow
    "(auth)/register/verification",
    "(auth)/register/car-selection",
    "(auth)/register/success",

    // Partner (Prestataire) onboarding + sign-in
    "(auth)/prestataire/loading",
    "(auth)/prestataire/language",
    "(auth)/prestataire/welcome",
    "(auth)/prestataire/sign-in",
    "(auth)/prestataire/forgot-password/index",
    "(auth)/prestataire/forgot-password/verification",
    "(auth)/prestataire/forgot-password/new-password",
    "(auth)/prestataire/forgot-password/success",

    // Client screens that guests may preview (e.g. browsing before login)
    "(client)",
    "(client)/index",
    "(client)/categories/index",
    "(client)/categories/[categoryId]/index",
    "(client)/categories/results",
    "(client)/search",
    "(client)/search/index",
    // Guests build a request draft locally; login is only required at send.
    "(client)/requests/index",
    "(client)/requests/CreateRequestScreen",
    "(client)/requests/login-to-send",
    // Product browsing is guest-accessible
    "(client)/products/[productId]",
    "(client)/products/[productId]/reviews",
  ],
};

export function getUnauthenticatedRedirect(route: string): string {
  return route.startsWith("(client)")
    ? "/(auth)/ClientAuthenticationOptionsScreen"
    : "/(auth)";
}

export function canAccessRoute(
  route: string,
  role?: AuthenticatedRole,
): boolean {
  const matches = (routes: string[]) =>
    routes.includes(route) || routes.includes(`${route}/index`);

  const isClientPreview = route.startsWith("(client)");

  return (
    (matches(allowedRoutes.public) && (!role || !isClientPreview)) ||
    (role
      ? matches(allowedRoutes[role] ?? [])
      : matches(allowedRoutes.guest))
  );
}
export default allowedRoutes;
