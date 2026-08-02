# Verification, Simulator Walkthrough, and Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement the report/test preparation tasks, then run simulator work serially in the primary session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove every reachable mobile journey against the live Laravel backend with deterministic data, automated checks, Android French/LTR and Arabic/RTL evidence, a coverage matrix, and the required UX audit.

**Architecture:** Seed only additive/repeatable local fixtures, run focused checks before broad shared-boundary suites, then execute a route/action manifest in the emulator. Each matrix row links the screen action to its resource, endpoint/controller, database effect, authorization, automated evidence, simulator result, and screenshot or reproducible blocker.

**Tech Stack:** Laravel Artisan/MySQL, Jest/jest-expo, Expo CLI, Android Emulator `Pixel_10`, ADB, Windows WAMP, Markdown audit artifacts.

## Global Constraints

- NO COMMIT, NO PUSH, NO STAGE; leave changes in the working tree.
- Never run `migrate:fresh`, `migrate:refresh`, database reset/drop/recreate, or reset-project tooling.
- Never print, copy, screenshot, or persist `DEV_USER_PASSWORD`, Bearer tokens, OTP hashes, or credential memory.
- Test accounts come from the existing local-only `DEV_USER_PASSWORD` environment value and fixed development identities.
- Live Expo mode uses `EXPO_PUBLIC_API_MODE=live` and `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api/v1`.
- Every reachable distinct screen is exercised in French/LTR and Arabic/RTL; repeated list rows need one representative interaction per action type.
- A journey is complete only with simulator evidence or a reproducible blocked/unsupported row.

---

### Task 1: Create the coverage and command-evidence artifacts

**Files:**
- Create: `../structure/audits/live-backend-coverage-mobile.md`
- Create: `../structure/audits/live-backend-ux-mobile.md`
- Create directory: `screenshots/live-backend/fr`
- Create directory: `screenshots/live-backend/ar`
- Create directory: `screenshots/live-backend/errors`

**Interfaces:**
- Produces coverage columns: `role`, `route`, `action/state`, `mobile resource`, `endpoint`, `backend owner`, `database effect`, `authorization`, `automated evidence`, `FR simulator`, `AR simulator`, `evidence/blocker`
- Produces UX columns: `role`, `journey/route`, `severity`, `evidence`, `why users may struggle`, `recommendation`

- [ ] **Step 1: Generate the route baseline from source**

Use `rg --files src/app` and exclude `+html.tsx`; group `(auth)`, `(client)`, `(prestataire)`, and `+not-found.tsx`. Cross-check every file against the two `_layout.tsx` registrations and `routesPermission.ts`.

- [ ] **Step 2: Add one row per meaningful action/state**

Split screens with multiple domain effects into separate rows, such as basket quantity/remove/coupon, address CRUD/default, offer submit/decline/resend/ship, and wallet request/confirm. Populate code mappings before simulator execution; leave result cells `NOT RUN` rather than implying success.

- [ ] **Step 3: Initialize the UX audit contract**

Include the required evidence fields and a severity scale: Critical blocks a journey or violates security/data integrity; High causes likely failure; Medium causes confusion/recovery cost; Low is polish/accessibility friction. Do not add speculative findings without observed evidence.

### Task 2: Confirm and seed the existing local database without destructive operations

**Files:**
- Modify only if an integration defect requires it: `../eben_backend/database/seeders/DevelopmentSeeder.php`
- Modify only if an integration defect requires it: `../eben_backend/database/seeders/DemoSeeder.php`
- Test only if modified: `../eben_backend/tests/Feature/DatabaseSeederTest.php`

**Interfaces:**
- Consumes: local `.env` `DEV_USER_PASSWORD` without printing it
- Produces: verified Client and Ferrailleur accounts plus repeatable catalog/request/offer/order/wallet/notification fixtures

- [ ] **Step 1: Confirm safe environment metadata**

Run from `../eben_backend`:

```powershell
Get-Content .env | Where-Object { $_ -match '^(APP_ENV|APP_URL|DB_CONNECTION|DB_HOST|DB_PORT|DB_DATABASE)=' }
$configured=[bool](Get-Content .env | Where-Object { $_ -match '^DEV_USER_PASSWORD=.+$' }); Write-Output "DEV_USER_PASSWORD_CONFIGURED=$configured"
php artisan migrate:status
```

Expected: local environment, MySQL `eben`, password configured, and no pending destructive state.

- [ ] **Step 2: Preview pending migrations**

Run: `php artisan migrate --pretend`

Expected: no statements when all migrations are applied; inspect any statements before the next step.

- [ ] **Step 3: Apply only non-destructive pending migrations**

Run only when Step 2 shows additive/forward-safe statements: `php artisan migrate`

Expected: success without dropping or recreating tables.

- [ ] **Step 4: Seed deterministic actors and demo data**

Run:

```powershell
php artisan db:seed --class=DevelopmentSeeder
php artisan db:seed --class=DemoSeeder
```

Expected: both commands succeed and repeated execution remains idempotent. Do not print credentials.

- [ ] **Step 5: Verify fixture presence without PII output**

Run a count-only query through Laravel that reports boolean/count results for active verified Client/Ferrailleur roles and key domain tables. Do not select phone, email, password, tokens, OTPs, addresses, or names.

### Task 3: Run focused and shared automated verification

**Files:**
- Modify: only implementation tests created by the first three plans when failures reveal defects
- Record exact commands/results in: `../structure/audits/live-backend-coverage-mobile.md`

**Interfaces:**
- Consumes: all focused tests from the implementation plans
- Produces: command, exit code, suite/test/assertion counts, and failure attribution

- [ ] **Step 1: Run focused Jest boundaries**

Run the new boundary files explicitly:

```powershell
npx jest src/api/__tests__/client.test.ts src/api/__tests__/uploads.test.ts src/api/__tests__/catalogResources.test.ts src/api/__tests__/prestataireResources.test.ts src/context/__tests__/AuthContext.test.tsx --runInBand
npx jest "src/app/(auth)/__tests__/authFlows.test.tsx" "src/app/(client)/__tests__/catalogJourneys.test.tsx" "src/app/(client)/__tests__/vehicleJourneys.test.tsx" "src/app/(client)/__tests__/requestJourneys.test.tsx" "src/app/(client)/__tests__/commerceJourneys.test.tsx" "src/app/(client)/__tests__/profileJourneys.test.tsx" --runInBand
npx jest "src/app/(prestataire)/__tests__/dashboardOffersJourneys.test.tsx" "src/app/(prestataire)/__tests__/offerFulfillmentJourneys.test.tsx" "src/app/(prestataire)/__tests__/orderHistoryJourneys.test.tsx" "src/app/(prestataire)/__tests__/profileCompanyJourneys.test.tsx" "src/app/(prestataire)/__tests__/walletJourneys.test.tsx" "src/app/(prestataire)/__tests__/notificationJourneys.test.tsx" --runInBand
```

Fix failures at the owning boundary and rerun only the affected file first.

- [ ] **Step 2: Run shared mobile checks**

Run:

```powershell
npx tsc --noEmit
npm run lint
npx jest --runInBand --watchAll=false
```

Broader Jest is warranted because transport and AuthContext are shared by every route. Record generated/out-of-scope lint failures separately only after proving changed source is clean.

- [ ] **Step 3: Run focused Laravel API tests**

Run the exact auth/upload/request/offer/commerce/profile/Prestataire tests touched by implementation. Fix and rerun the smallest named method first.

- [ ] **Step 4: Run shared backend checks**

Run:

```powershell
vendor/bin/pint --test
vendor/bin/phpstan
php artisan test tests/Feature/Api/V1 --stop-on-failure
```

The full API feature directory is warranted because shared validation/auth/upload behavior affects multiple controllers. Run the complete Laravel suite only if a shared service/base-controller change or an API regression requires broader diagnosis.

### Task 4: Start and verify the Android live environment

**Files:**
- No source files
- Record commands/results in: `../structure/audits/live-backend-coverage-mobile.md`

**Interfaces:**
- Produces: running `Pixel_10`, reachable Laravel from Android, Expo live bundle, and clean initial logs

- [ ] **Step 1: Start the emulator and wait for boot**

```powershell
$sdk=Join-Path $env:LOCALAPPDATA 'Android\Sdk'
Start-Process (Join-Path $sdk 'emulator\emulator.exe') -ArgumentList '-avd','Pixel_10'
& (Join-Path $sdk 'platform-tools\adb.exe') wait-for-device
& (Join-Path $sdk 'platform-tools\adb.exe') shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done; input keyevent 82'
```

Expected: `adb devices -l` lists one emulator and `getprop sys.boot_completed` returns `1`.

- [ ] **Step 2: Prove Android can reach Laravel**

Use the emulator browser or a temporary ADB shell network probe against `http://10.0.2.2:8000/api/v1/categories`. Expected: HTTP 200 standard envelope.

- [ ] **Step 3: Start Expo in explicit live mode**

```powershell
$env:EXPO_PUBLIC_API_MODE='live'
$env:EXPO_PUBLIC_API_BASE_URL='http://10.0.2.2:8000/api/v1'
npx expo start --android --clear
```

Keep the process running and capture its output. Expected: app opens on the emulator with no mock-mode banner or silent mock requests.

- [ ] **Step 4: Establish log/screenshot commands**

Use the resolved ADB path for `logcat -c`, filtered ReactNativeJS capture, activity relaunch, offline toggles, and screenshots. Screenshot names use `<role>-<route>-<state>.png` under the locale directory.

### Task 5: Walk Guest and authentication journeys in French and Arabic

**Files:**
- Modify implementation files only when observed defects require fixes
- Update: `../structure/audits/live-backend-coverage-mobile.md`
- Update: `../structure/audits/live-backend-ux-mobile.md`
- Add evidence: `screenshots/live-backend/fr/*`, `screenshots/live-backend/ar/*`, `screenshots/live-backend/errors/*`

**Interfaces:**
- Covers: splash/loading/language/welcome/role selection, Client auth options/login/register/OTP/recovery, Prestataire welcome/waitlist/login/recovery, legal, public browse, validation, invalid credentials, rate/error states

- [ ] **Step 1: Execute the full French/LTR auth manifest**

Start from cleared app data only when the target is application-local SecureStore state; do not clear backend data. Use deterministic Client registration data distinct from seeded login accounts, complete OTP using a safe local test mechanism without logging the code, verify role routing, then remove or retain the created test record according to non-destructive test cleanup rules.

- [ ] **Step 2: Execute Prestataire waitlist and login**

Prove waitlist submission persists/idempotently handles duplicate phone and never creates a Ferrailleur account. Log in with the seeded Ferrailleur without exposing its password.

- [ ] **Step 3: Repeat every distinct auth screen in Arabic/RTL**

Verify translation, text alignment, row/icon direction, input usability, keyboard behavior, validation, and navigation. Record French leakage or clipped/overlapping content in the UX audit.

### Task 6: Walk every Client route and primary action in French and Arabic

**Files/evidence:** same audit and screenshot locations as Task 5

**Interfaces:**
- Covers: home, categories/tree/results, tyres, products/reviews/review/report, garage add/change/delete, requests create/upload/send/detail/offers/accept, cart quantity/remove/coupon, COD checkout/address, profile, orders, archived offers, notifications, wishlist, payment display, language/about/legal, logout/relaunch

- [ ] **Step 1: Run the French/LTR Client matrix**

For each route row, capture initial load, one representative success action, legitimate empty state when available, validation failure, and retryable API/network failure. Use backend/database read-only checks to confirm the expected mutation without printing PII.

- [ ] **Step 2: Verify security and lifecycle branches**

Attempt Guest→Client protected and Client→Prestataire deep links, revoke the current token in the local database without displaying it, return to the app, and prove centralized 401 logout. Relaunch after a valid login and prove SecureStore restoration and profile validation.

- [ ] **Step 3: Repeat every distinct Client screen in Arabic/RTL**

Repeat primary actions where direction or keyboard interaction changes; for identical backend actions, link the Arabic visual/interaction evidence to the already verified database effect.

### Task 7: Walk every Prestataire route and primary action in French and Arabic

**Files/evidence:** same audit and screenshot locations as Task 5

**Interfaces:**
- Covers: dashboard/series, search, incoming/active/accepted/sent offers, offer detail/upload/submit/decline/resend/ship/shipment, orders/detail, profile/overview/edit/company, histories, wallet/request/OTP/confirmation/history, notifications/read/read-all, language/about/legal, logout/relaunch

- [ ] **Step 1: Run the French/LTR Prestataire matrix**

Exercise each state transition against seeded data and verify its database/API result. Confirm submitted payloads contain only raw provider prices and rendered order/history nets match stored server snapshots.

- [ ] **Step 2: Verify role and failure branches**

Attempt Prestataire→Client protected deep links; exercise 422, 403, 401, network failure, empty lists, invalid/expired withdrawal OTP, duplicate submit protection, and app relaunch.

- [ ] **Step 3: Repeat every distinct Prestataire screen in Arabic/RTL**

Verify chart labels, price/number readability, form order, image controls, status chips, long Arabic copy, keyboard interaction, and navigation direction.

### Task 8: Fix defects, rerun owning checks, and close evidence

**Files:**
- Modify only files owning reproducible defects
- Update both audit documents and evidence screenshots

**Interfaces:**
- Produces: green focused checks and retested simulator rows for every fix

- [ ] **Step 1: Classify each defect by boundary**

Assign transport/auth/resource/screen/backend/contract/seed/localization/RTL ownership. Fix the root shared boundary when sibling callers share the failure.

- [ ] **Step 2: Run the smallest owning automated check**

Name the exact method/file in the coverage log. Escalate to broader checks only for shared logic or when focused diagnosis fails.

- [ ] **Step 3: Retest the exact simulator journey in both affected locales**

Replace stale screenshots, record the successful action/database result, and preserve before-fix evidence only when it supports a UX finding.

### Task 9: Completion audit and final reports

**Files:**
- Finalize: `../structure/audits/live-backend-coverage-mobile.md`
- Finalize: `../structure/audits/live-backend-ux-mobile.md`

**Interfaces:**
- Produces: requirement-by-requirement completion evidence and intentionally unsupported/blocker list

- [ ] **Step 1: Audit every explicit goal requirement**

For each numbered requirement and deliverable, point to current file/runtime/test evidence. Treat missing or indirect evidence as incomplete and continue work.

- [ ] **Step 2: Close matrix result cells**

No row may remain `NOT RUN`. Valid terminal values are `PASS` with evidence or `BLOCKED/UNSUPPORTED` with reproduction command/steps, HTTP/status output, screenshot when relevant, and concrete next action.

- [ ] **Step 3: Finalize UX findings**

Every confusing point includes role, journey/route, severity, evidence/screenshot, user impact, and a concrete recommendation. Separate defects fixed during integration from remaining improvement recommendations.

- [ ] **Step 4: Record exact commands and results**

Include migration status/pretend/apply, seeding, focused/broad Jest, TypeScript, lint, Laravel tests, Pint, PHPStan, Expo, emulator/ADB, and simulator result summaries. Never include credential values or tokens.

## Final verification

- [ ] Every Guest/auth, Client, and Prestataire route/action row is PASS or reproducibly blocked/unsupported.
- [ ] Every distinct screen has French/LTR and Arabic/RTL simulator evidence.
- [ ] Authentication evidence covers registration, OTP, recovery, persistence, Bearer headers, logout, invalid/revoked token, test-expired token, and role boundaries.
- [ ] Upload evidence covers Client request and Prestataire offer images with user ownership.
- [ ] Pricing evidence confirms no mobile margin/VAT/net computation.
- [ ] Live mode evidence confirms a network/contract failure never falls back to mock data.
- [ ] Automated commands are rerun after the final defect and results are current.
- [ ] Both audit documents exist, contain no secrets, and match the current app/backend state.
- [ ] Final diffs contain no destructive commands, generated secret files, staging, commits, pushes, or deploys.
