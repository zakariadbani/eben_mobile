# Prestataire Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every reachable Prestataire journey use authenticated Laravel resources, uploaded images, server-owned price/net snapshots, and complete fulfillment/profile/wallet/notification actions.

**Architecture:** Keep the existing `prestataire.ts` resource as the namespace boundary and extend it only for contract endpoints it lacks. Screens own presentation state; Laravel owns authorization, offer/order transitions, net figures, wallet state, and OTP confirmation.

**Tech Stack:** Expo Router 3, React Native, TypeScript, i18next, Jest/jest-expo, Laravel Sanctum `/api/v1/prestataire` endpoints.

## Global Constraints

- NO COMMIT, NO PUSH, NO STAGE; leave changes in the working tree.
- Complete every task in this plan; this is one slice of the full integration goal.
- All Prestataire HTTP requests require the backend `ferrailleur` role mapped by AuthContext.
- Never accept or compute `priceClient`, `priceBc`, `netAmount`, or `netTotal` on the device.
- Upload local photos first and submit only current-user server paths.
- No direct runtime mock/fixture imports in reachable live Prestataire routes.
- Keep strict TypeScript and paired French/Arabic strings for touched UI.
- Preserve unrelated changes and explicit mock mode.

---

### Task 1: Complete the Prestataire resource contract

**Files:**
- Modify: `src/api/resources/prestataire.ts`
- Modify: `src/interfaces/PrestataireDashboard.ts`
- Modify: `src/interfaces/Wallet.ts`
- Modify: `src/interfaces/Order.ts`
- Modify: `src/interfaces/Offer.ts`
- Create: `src/api/__tests__/prestataireResources.test.ts`

**Interfaces:**
- Produces: `getPrestataireDashboardSeries(period)`
- Produces: `confirmWithdrawal(withdrawalId, code)`
- Produces: `markAllPrestataireNotificationsRead()`
- Preserves: existing dashboard, offers, shipping, order, profile, company, wallet, and notification functions

- [ ] **Step 1: Write focused endpoint/payload tests**

Cover every exported Prestataire function, status/period query encoding, multi-line offer payloads, shipment fields, profile/company fields, withdrawal confirmation, and read-all.

```ts
await getPrestataireDashboardSeries('1m');
expect(mockGet).toHaveBeenCalledWith('/prestataire/dashboard/series?period=1m');

await confirmWithdrawal(17, '123456');
expect(mockPost).toHaveBeenCalledWith('/prestataire/wallet/withdrawals/17/confirm', { code: '123456' });
```

- [ ] **Step 2: Run the focused resource test and confirm failure**

Run: `npx jest src/api/__tests__/prestataireResources.test.ts --runInBand`

Expected: FAIL for missing series, confirmation, read-all, or mismatched shapes.

- [ ] **Step 3: Add only the missing functions/types**

Use the shared envelopes and canonical literal periods `'1j' | '7j' | '1m' | '6m' | '1a' | 'max'`. `Order.netTotal` and `OrderItem.netAmount` are optional only on shared Client shapes and required when a Prestataire screen renders them.

- [ ] **Step 4: Run the focused resource test**

Run: `npx jest src/api/__tests__/prestataireResources.test.ts --runInBand`

Expected: PASS.

### Task 2: Wire dashboard, chart series, search, and offer lists

**Files:**
- Modify: `src/app/(prestataire)/dashboard.tsx`
- Modify: `src/app/(prestataire)/profile/overview.tsx`
- Modify: `src/app/(prestataire)/search/index.tsx`
- Modify: `src/app/(prestataire)/offers/index.tsx`
- Modify: `src/components/screens/prestataire/ItemIncomingRequestCard.tsx`
- Modify: `src/components/screens/prestataire/ItemPartnerOfferCard.tsx`
- Modify: `src/localization/fr.json`
- Modify: `src/localization/ar.json`
- Create: `src/app/(prestataire)/__tests__/dashboardOffersJourneys.test.tsx`

**Interfaces:**
- Consumes: Task 1 stats, series, incoming requests, and offers functions
- Produces: loading, refresh, empty, filter, retry, period-switch, and drill-down states

- [ ] **Step 1: Write dashboard/list tests**

Cover stats load, all six metrics in series buckets, period switching with one call, refresh/retry, empty incoming requests/offers, local search/filter, and card navigation using real IDs.

```tsx
fireEvent.press(getByRole('button', { name: '1 mois' }));
await waitFor(() => expect(mockGetSeries).toHaveBeenLastCalledWith('1m'));
expect(mockGetSeries).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest "src/app/(prestataire)/__tests__/dashboardOffersJourneys.test.tsx" --runInBand`

Expected: FAIL for mock assumptions, missing series, or incomplete states.

- [ ] **Step 3: Reconcile screens with live envelopes**

Load stats and current-period series independently so one failure does not erase the other. Search/filter the fetched incoming-request list locally unless the contract exposes server filters. Navigate with response IDs only.

- [ ] **Step 4: Run dashboard/list tests**

Run: `npx jest "src/app/(prestataire)/__tests__/dashboardOffersJourneys.test.tsx" --runInBand`

Expected: PASS.

### Task 3: Complete offer detail, submit, decline, resend, and shipping

**Files:**
- Modify: `src/app/(prestataire)/offers/[offerId]/index.tsx`
- Modify: `src/app/(prestataire)/offers/[offerId]/fill.tsx`
- Modify: `src/app/(prestataire)/offers/[offerId]/ship.tsx`
- Modify: `src/components/common/ImageInputList.tsx`
- Modify: `src/api/resources/prestataire.ts`
- Create: `src/app/(prestataire)/__tests__/offerFulfillmentJourneys.test.tsx`

**Interfaces:**
- Consumes: `uploadLocalImages` and all offer/shipment resources
- Produces: backend-valid `SubmitOfferPayload` containing only `requestItemId`, raw `priceFerrailleur`, condition, description, and server image paths

- [ ] **Step 1: Write offer-flow tests**

Cover incoming request detail, required price and images, multi-line uploads preserving order, no client-price submission, 422 field display, decline reason/comment, resend without re-uploading persisted remote images, shipment validation, and shipment read-back.

```tsx
await submitVisibleOffer();
expect(mockSubmitOffer).toHaveBeenCalledWith(33, {
  lines: [expect.objectContaining({ requestItemId: 8, priceFerrailleur: 250, images: ['tmp/mobile/9/a.jpg'] })],
});
expect(mockSubmitOffer.mock.calls[0][1]).not.toEqual(expect.objectContaining({ priceClient: expect.anything() }));
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest "src/app/(prestataire)/__tests__/offerFulfillmentJourneys.test.tsx" --runInBand`

Expected: FAIL because current local URIs are submitted directly and error mapping is incomplete.

- [ ] **Step 3: Upload local offer images before submission**

For new offers, upload every device URI and replace it with the returned path. For resend, send the existing backend offer through `/resend` and do not submit its public image URLs as new paths. Disable duplicate submits while uploads or mutations run.

- [ ] **Step 4: Reconcile decline/resend/ship transitions**

Use returned success/offer IDs and shipment state to update or navigate. Do not infer backend status transitions in the UI.

- [ ] **Step 5: Run offer-flow tests**

Run: `npx jest "src/app/(prestataire)/__tests__/offerFulfillmentJourneys.test.tsx" --runInBand`

Expected: PASS.

### Task 4: Replace mobile net calculations with server snapshots

**Files:**
- Modify: `src/app/(prestataire)/orders/index.tsx`
- Modify: `src/app/(prestataire)/orders/[orderId]/index.tsx`
- Modify: `src/app/(prestataire)/profile/orders-history.tsx`
- Modify: `src/app/(prestataire)/profile/offers-history.tsx`
- Create: `src/app/(prestataire)/__tests__/orderHistoryJourneys.test.tsx`

**Interfaces:**
- Consumes: `/prestataire/orders`, order detail, offers history, `Order.netTotal`, and `OrderItem.netAmount`
- Produces: exact displayed server net figures and status filters

- [ ] **Step 1: Write order/history tests with deliberately non-derivable snapshots**

Use fixtures where `netTotal` cannot equal any local `0.94/1.06` calculation and assert the served value appears unchanged.

```tsx
mockGetOrders.mockResolvedValue(paginated([{ id: 1, total: 100, netTotal: 73.41 }]));
render(<PrestataireOrders />);
await waitFor(() => expect(getByText('73,41')).toBeTruthy());
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest "src/app/(prestataire)/__tests__/orderHistoryJourneys.test.tsx" --runInBand`

Expected: FAIL because three screens compute net values locally.

- [ ] **Step 3: Delete local margin helpers and render snapshots**

Display `order.netTotal` and line `netAmount`. A missing required Prestataire net field is a contract error state, not a reason to recompute.

- [ ] **Step 4: Run order/history tests and pricing grep**

Run: `npx jest "src/app/(prestataire)/__tests__/orderHistoryJourneys.test.tsx" --runInBand`

Run: `rg -n "0\.94|1\.06|priceBc\s*=|netTotal\s*=" "src/app/(prestataire)"`

Expected: tests PASS and no runtime calculation hits.

### Task 5: Complete profile and company mutations

**Files:**
- Modify: `src/app/(prestataire)/profile/index.tsx`
- Modify: `src/app/(prestataire)/profile/edit.tsx`
- Modify: `src/app/(prestataire)/profile/company.tsx`
- Modify: `src/api/resources/prestataire.ts`
- Create: `src/app/(prestataire)/__tests__/profileCompanyJourneys.test.tsx`

**Interfaces:**
- Consumes: profile/company GET/PUT resources
- Produces: persisted profile and company state; bank fields remain write-only

- [ ] **Step 1: Write profile/company tests**

Cover load, edit validation, submit, retry, avatar upload if the current form exposes it, specialization IDs, ICE/RC/IF fields, write-only bank input, and server returned state.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest "src/app/(prestataire)/__tests__/profileCompanyJourneys.test.tsx" --runInBand`

Expected: FAIL because profile edit currently does not call `updatePrestataireProfile`.

- [ ] **Step 3: Wire mutations and field errors**

Submit only editable fields, map validation fields to inputs, and replace visible state with the response resource. Never expect bank RIB/name to be echoed back.

- [ ] **Step 4: Run profile/company tests**

Run: `npx jest "src/app/(prestataire)/__tests__/profileCompanyJourneys.test.tsx" --runInBand`

Expected: PASS.

### Task 6: Complete wallet withdrawal and OTP confirmation

**Files:**
- Modify: `src/app/(prestataire)/profile/wallet/index.tsx`
- Modify: `src/app/(prestataire)/profile/wallet/withdraw.tsx`
- Modify: `src/app/(prestataire)/profile/wallet/verification.tsx`
- Modify: `src/app/(prestataire)/profile/wallet/success.tsx`
- Modify: `src/api/resources/prestataire.ts`
- Create: `src/app/(prestataire)/__tests__/walletJourneys.test.tsx`

**Interfaces:**
- Consumes: wallet, withdrawal history, request-withdrawal, and confirm-withdrawal resources
- Produces: server-driven `requiresVerification` branch and confirmed Withdrawal state

- [ ] **Step 1: Write wallet tests**

Cover balance/history loading, min/available validation, server validation, `requiresVerification: false` direct success, `true` OTP route, invalid/expired code, confirmation success, retry, and relaunch back to wallet when ephemeral verification context is absent.

```tsx
mockRequestWithdrawal.mockResolvedValue(api({ withdrawal: { id: 91 }, requiresVerification: true }));
await submitWithdrawal();
expect(mockRouter.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: expect.stringContaining('verification') }));
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest "src/app/(prestataire)/__tests__/walletJourneys.test.tsx" --runInBand`

Expected: FAIL because OTP verification is local navigation only.

- [ ] **Step 3: Wire request and confirm transitions**

Keep only `withdrawalId` in route params; keep the OTP code in component memory. Call confirm, render backend validation, and navigate success only after a returned confirmed/pending Withdrawal.

- [ ] **Step 4: Run wallet tests**

Run: `npx jest "src/app/(prestataire)/__tests__/walletJourneys.test.tsx" --runInBand`

Expected: PASS.

### Task 7: Complete notifications and remove remaining live fixtures

**Files:**
- Modify: `src/app/(prestataire)/profile/notifications.tsx`
- Modify only remaining live fixture hits under: `src/app/(prestataire)` and `src/components/screens/prestataire`
- Modify: `src/localization/fr.json`
- Modify: `src/localization/ar.json`
- Create: `src/app/(prestataire)/__tests__/notificationJourneys.test.tsx`

**Interfaces:**
- Consumes: notification list/read/read-all functions
- Produces: empty/full/filter/read/retry states and zero live fixture dependencies

- [ ] **Step 1: Write notification tests**

Cover empty/full lists, individual read, read-all updated count, local type filter, retry, and unauthorized clearing through the shared transport.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest "src/app/(prestataire)/__tests__/notificationJourneys.test.tsx" --runInBand`

Expected: FAIL for missing read-all and incomplete live states.

- [ ] **Step 3: Wire notifications and localize states**

Use returned notifications/read state and update visible rows without fabricating entities. Add paired localization keys for touched loading, empty, retry, and API-error copy.

- [ ] **Step 4: Run the live source gate**

Run: `rg -n "@/api/mock|@/data/ws|mock[A-Z]|0\.94|1\.06" "src/app/(prestataire)" src/components/screens/prestataire`

Expected: no reachable runtime data/pricing hits; comments and explicit mock tests are classified and removed when misleading.

- [ ] **Step 5: Run notification tests**

Run: `npx jest "src/app/(prestataire)/__tests__/notificationJourneys.test.tsx" --runInBand`

Expected: PASS.

## Final verification

- [ ] Run `npx jest src/api/__tests__/prestataireResources.test.ts "src/app/(prestataire)/__tests__/dashboardOffersJourneys.test.tsx" "src/app/(prestataire)/__tests__/offerFulfillmentJourneys.test.tsx" "src/app/(prestataire)/__tests__/orderHistoryJourneys.test.tsx" "src/app/(prestataire)/__tests__/profileCompanyJourneys.test.tsx" "src/app/(prestataire)/__tests__/walletJourneys.test.tsx" "src/app/(prestataire)/__tests__/notificationJourneys.test.tsx" --runInBand`.
- [ ] Run existing focused regressions: `npx jest src/components/screens/shared/__tests__/PhoneVerificationComponent.test.ts src/components/__tests__/WithRole.test.tsx src/constants/__tests__/routesPermission.test.ts --runInBand`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npx eslint "src/app/(prestataire)" src/components/screens/prestataire src/api/resources/prestataire.ts --ext .ts,.tsx`.
- [ ] Parse both localization JSON files and confirm every new key exists in French and Arabic.
- [ ] Review the diff for Ferrailleur authorization, user-scoped uploads, raw-provider-price-only submissions, server net fields, strict types, and unrelated files.
