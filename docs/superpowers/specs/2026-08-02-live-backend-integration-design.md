# EBEN Mobile Live Backend Integration Design

## Accepted outcome

Every reachable Guest, Client, and Prestataire journey uses the Laravel `/api/v1` surface in live mode or is documented as intentionally unsupported with reproducible simulator evidence. Development mock behavior remains available only when explicitly selected. Automated boundary tests, deterministic local data, Android French/LTR and Arabic/RTL walkthroughs, a route/action/API coverage matrix, and `../structure/audits/live-backend-ux-mobile.md` prove the result.

## Current-state evidence

- The Laravel application is reachable at both `http://eben.test` and `http://127.0.0.1:8000`; the configured local database is MySQL database `eben` and all existing migrations report `Ran`.
- The backend exposes 93 `/api/v1` routes and already implements the public catalog, Client, Prestataire, authentication, OTP, order, wallet, notification, and profile surfaces described by `../structure/specs/api-contract.md`.
- `src/api/client.ts` never performs HTTP. It resolves the golden mock store, then the mock registry, then silently returns an empty successful response for unknown calls.
- `src/context/AuthContext.tsx` accepts any non-empty credentials with a caller-supplied role and persists only `{username, role}`. It never calls Laravel or restores a Bearer token.
- Several screens bypass resource functions through direct mock imports, generated rows, hard-coded `vehicleId: 1`, no-op form submissions, or local-only mutations.
- The backend has no mobile image-upload endpoint. Prestataire offer photos are local device URIs that cannot be consumed by Laravel; Client request photos are displayed by the picker but not included in the request payload.
- Production Sanctum tokens intentionally have no expiry in phase one. Logout, password reset, identifier changes, inactive accounts, role middleware, and ownership checks already revoke or reject tokens.
- Pricing is canonical and server-owned: `PricingService` alone applies `1.06` and `0.94`; `OrderService` alone applies VAT and shipping. Mobile must render served totals and Prestataire net snapshots.

## Approaches considered

### 1. Big-bang transport swap

Replace the mock body with `fetch`, launch the app, and repair every failing screen in discovery order. This is initially quick but produces cascading failures: authentication, mock-only IDs, missing uploads, and direct mock imports fail at once. It makes regression attribution and simulator evidence unreliable.

### 2. Vertical integration slices — selected

Build the live transport and authentication boundary first, then integrate public/catalog, Client, and Prestataire journeys in independently testable slices. Each slice removes only its own direct mock usage, adds the smallest boundary tests, and is simulator-smoked before the next slice. This follows the existing resource layer, isolates failures, and permits explicit mock mode throughout development.

### 3. Generated API client

Generate a new client from Scramble/OpenAPI and rewrite screens around generated types. The backend already has a typed mobile resource layer that matches the shared contract, so generation would add dependencies, duplicate interfaces, and expand the diff without solving screen orchestration gaps.

## Scope and decomposition

The work is split into four implementation plans whose outputs compose into the final application:

1. Live transport, authentication, session restoration, 401 handling, and user-scoped image upload.
2. Public catalog and all Client journeys, including real vehicles, requests, products, basket, checkout, profile collections, loading/empty/error states, and server-owned totals.
3. All Prestataire journeys, including offers, uploads, fulfillment, company/profile updates, wallet OTP confirmation, notifications, dashboard series, and server-owned net figures.
4. Deterministic data, automated regression closure, Android French/LTR and Arabic/RTL walkthroughs, coverage evidence, and the UX audit.

This decomposition is sequencing, not scope reduction. Completion still requires all four plans.

## Architecture

### API mode and transport

`src/api/config.ts` defines an explicit `EXPO_PUBLIC_API_MODE` with accepted values `live` and `mock`; an absent or invalid value selects `live`. `EXPO_PUBLIC_API_BASE_URL` remains the only base-URL seam. Android local runs pass `http://10.0.2.2:8000/api/v1` without hard-coding a simulator address into source.

`src/api/client.ts` remains the single transport. In mock mode it uses the current golden store and registry, but an unknown mock throws instead of manufacturing success. In live mode it:

- sends JSON by default and `FormData` without manually setting a multipart boundary;
- attaches `Authorization: Bearer <token>` when a token exists;
- parses the standard success, pagination, and error envelopes;
- throws a typed `ApiClientError` carrying HTTP status, message, and validation fields;
- treats malformed JSON and network failures as explicit errors;
- invokes one registered unauthorized callback on HTTP 401.

Resource functions remain the public API for screens. Query strings use `URLSearchParams`; no new HTTP dependency is added.

### Authentication and session lifecycle

`SessionData` becomes `{token, user}` where the backend role `ferrailleur` maps to mobile `Role.PRESTATAIRE` and `client` maps to `Role.CLIENT`. Unknown, admin, inactive, or mismatched roles are rejected rather than guessed from the login screen.

The session provider owns login, logout, registration completion, password-recovery state, token installation, restoration validation, and the 401 callback:

- login calls `/auth/login`, validates the server role against the entry journey, stores the token/user in SecureStore, and installs the Bearer token;
- registration calls `/auth/register` then `/auth/otp/send`; the returned unverified token remains pending and is not an active role session;
- phone verification calls `/auth/verify-phone` and promotes the pending token/user to the active session;
- forgot-password sends an OTP, verifies it without placing the code in route parameters, then resets the password; reset revokes all tokens and returns to login;
- app relaunch restores the token, installs it before protected requests, validates it against `/profile` or `/prestataire/profile`, and keeps the root guard loading until validation finishes;
- any 401 atomically clears the token and persisted session and routes to authentication;
- logout attempts server revocation and always clears local secrets in a `finally` path.

The production no-expiry policy remains unchanged because it is a locked phase-one contract. Expired and revoked tokens are indistinguishable to the mobile client at the HTTP boundary, so a Laravel token created with an explicit past expiry proves the same centralized 401 behavior without silently changing production security policy.

### Authorization boundaries

Mobile route permissions remain a usability boundary; Laravel middleware and ownership policies remain the security boundary. Guest previews call only public endpoints. Client and Prestataire screens reject cross-role sessions even when deep-linked. A guest action requiring authentication routes to the correct login gate rather than issuing a protected API request.

### Upload boundary

Laravel adds one authenticated `POST /api/v1/uploads/images` endpoint for Client and Ferrailleur tokens. It accepts one `image` file, permits JPEG/PNG/WebP, uses the existing configured 5 MiB limit, and stores a collision-safe path under `tmp/mobile/{userId}`. The success envelope returns the storage-relative `{path}`; persisted request and offer resources already expose public URLs.

Request and offer image validation accepts only current-user paths under that prefix, preventing one user from attaching another user's upload. The mobile resource converts each local `file://`/`content://` URI to `FormData`, uploads before the domain mutation, and submits only server paths. Existing remote URLs from persisted resources are not re-uploaded during Prestataire resend.

No new upload table or background cleanup system is introduced. The user-scoped random path and domain-row association cover the current journeys; orphan cleanup can be added when observed storage volume warrants it.

### Resource and screen integration

Existing interfaces and resource functions stay authoritative. Missing resource calls are added beside related functions; screens are changed only where they currently bypass the layer or lack live-state orchestration.

- Public/catalog: categories, category tree, brands/models, motorizations, years, pneumatics, product lists/details/reviews.
- Client: garage/default selection, request draft/send/offers, wishlist, basket/coupon, COD checkout, addresses, profile, notifications, payment-method display, and orders.
- Prestataire: dashboard/series, incoming requests, offer create/decline/resend/ship, orders, profile/company, wallet/withdrawal confirmation, and notifications/read-all.

Direct imports from `src/api/mock` and `src/data/ws` are removed from live data paths. They may remain inside explicit mock infrastructure and purely static UI fixture tests. The hard-coded vehicle ID is replaced by the current/default vehicle selected from `/vehicles`; an empty garage routes to add-car instead of fabricating ownership.

### Error, loading, and empty states

Screens distinguish loading, legitimate empty data, validation errors, authorization loss, and network/server failure. `ApiClientError.errors` maps backend camelCase fields to existing form controls. Retry repeats the same resource call. Live mode never falls through to mock data after a network or contract failure.

All new or touched user-visible strings receive matching French and Arabic keys. Existing manual RTL primitives remain the project convention; each distinct touched screen is simulator-checked in both locales. Global `I18nManager.forceRTL` remains disabled because enabling it requires a native restart and conflicts with the app's runtime language-switching design.

## Backend and contract changes

The backend is changed only for evidence-backed mismatches:

- add the authenticated image-upload route/controller/request and current-user path validation;
- normalize any response or validation mismatch found by live mobile tests;
- add focused endpoint tests for uploads, auth expiry/401 behavior, and any repaired contract boundary;
- update `../structure/specs/api-contract.md` for the upload endpoint and any confirmed response change.

No admin CRUD surface, new dependency, destructive migration, role conversion, refresh-token endpoint, or pricing change is planned. Prestataire onboarding remains the public waitlist; account creation remains an admin-controlled operation.

## Deterministic local data

The existing `DevelopmentSeeder` remains the credential boundary: it reads `DEV_USER_PASSWORD` only from the local environment, creates the fixed Client and Ferrailleur identities, verifies their phones, and assigns Sanctum roles. `DemoSeeder` provides repeatable catalog, request, offer, order, wallet, notification, and state-transition fixtures. Commands never print the password, and no credential is added to tracked source or reports.

Migrations are inspected with `php artisan migrate:status` and `php artisan migrate --pretend` before any non-destructive `php artisan migrate`. Database reset, drop, refresh, and recreation commands remain forbidden.

## Verification strategy

Each boundary starts with one focused failing test, then the minimum implementation, then the named focused test:

- Jest: API mode, live request headers/envelopes/errors, mock missing-handler failure, SecureStore restore, server-authoritative roles, registration/OTP/reset, 401 clearing, and changed resource payloads.
- Laravel: image authorization/validation/ownership, auth expiration configuration behavior, and any contract repair.
- Static checks: changed-source ESLint during iteration, then `npm run lint`; backend `vendor/bin/pint --test` and `vendor/bin/phpstan` when backend code changes.
- Shared logic gates: the affected Jest suites and relevant Laravel API files; broader suites only when shared transport/auth or backend base behavior warrants them.
- Runtime: Android emulator with Laravel at `10.0.2.2:8000`, explicit live mode, deterministic accounts, and no secret-bearing command output.

The simulator matrix covers every distinct reachable route and primary action in French/LTR and Arabic/RTL, plus validation failure, empty, loading, network failure, API error, unauthorized/cross-role access, logout, invalid token, test-expired token, and app relaunch. Screenshots and command evidence are stored outside source secrets and referenced by the UX audit.

## Rollout and rollback

Live mode is the default but mock mode remains an explicit environment selection, so developers can isolate UI work without a backend. Each vertical slice changes existing seams and can be reverted independently. Backend additions are additive and require no destructive migration. A failing live slice is fixed in place; it never falls back to mock data.

## Ship criteria

- Every route/action row has a resource function, endpoint/controller, database effect, authorization rule, automated evidence, and simulator evidence or a reproducible unsupported reason.
- Both deterministic roles can log in, relaunch, use every protected journey, receive centralized 401 handling, log out, and remain unable to cross role boundaries.
- Every live screen has explicit loading, empty, validation, and network/API failure behavior appropriate to its action.
- No live path imports direct mock data, uses fabricated IDs, computes canonical totals/margins, or silently succeeds after a missing backend response.
- French/LTR and Arabic/RTL Android walkthrough evidence exists for every distinct screen.
- The route/action/API matrix, exact command/result log, blockers, screenshots, and `../structure/audits/live-backend-ux-mobile.md` are complete.
- No secrets, staging, commits, pushes, deploys, database resets, drops, or recreations occur.
