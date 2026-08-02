# Public Catalog and Client Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every reachable public and Client journey use live Laravel resources with real IDs, persisted mutations, explicit UI states, and server-owned totals.

**Architecture:** Extend the existing resource modules rather than introducing repositories or generated clients. Screens load through resource functions, keep only view/draft state locally, and route protected guest actions to authentication. Selected/default garage data replaces fabricated vehicle IDs.

**Tech Stack:** Expo Router 3, React Native, TypeScript, i18next, Jest/jest-expo, Laravel `/api/v1` contract.

## Global Constraints

- NO COMMIT, NO PUSH, NO STAGE; leave changes in the working tree.
- Complete every task in this plan; this is one slice of the full integration goal.
- Use only the centralized transport and typed resource functions.
- No direct runtime imports from `src/api/mock` or `src/data/ws` in live screen paths.
- Guest previews call only public endpoints; protected mutations require a Client session.
- Render Basket/Order totals from the server; never compute VAT, shipping, `1.06`, or `0.94` in mobile code.
- Keep strict TypeScript and add paired French/Arabic strings for touched UI.
- Preserve explicit mock mode and its golden-state tests.

---

### Task 1: Complete public catalog resource coverage

**Files:**
- Modify: `src/api/resources/categories.ts`
- Modify: `src/api/resources/products.ts`
- Modify: `src/api/resources/vehicles.ts`
- Create: `src/api/resources/pneumatics.ts`
- Create: `src/api/resources/paymentMethods.ts`
- Modify: `src/api/index.ts`
- Modify: `src/interfaces/Category.ts`
- Modify: `src/interfaces/Product.ts`
- Modify: `src/interfaces/Vehicle.ts`
- Create: `src/interfaces/Pneumatic.ts`
- Modify: `src/interfaces/Payment.ts`
- Create: `src/api/__tests__/catalogResources.test.ts`

**Interfaces:**
- Produces: `getCategoryTree`, `getProducts(params)`, `getBrandModels(brandId)`, `searchPneumatics(params)`, and typed payment-method reads
- Consumes: the live/mock `apiClient` from the transport plan

- [ ] **Step 1: Write focused resource URL/payload tests**

Prove query omission/encoding, `perPage` usage, category-tree shape, brand-scoped models, product sort/search/featured filters, tyre filters, and payment-method envelope parsing.

```ts
await getBrandModels(7);
expect(mockGet).toHaveBeenCalledWith('/brands/7/models');

await getProducts({ categoryId: 3, sort: 'priceAsc', q: 'filtre huile' });
expect(mockGet).toHaveBeenCalledWith('/products?categoryId=3&sort=priceAsc&q=filtre+huile');
```

- [ ] **Step 2: Run the focused resource test and confirm failure**

Run: `npx jest src/api/__tests__/catalogResources.test.ts --runInBand`

Expected: FAIL for the missing or incomplete functions.

- [ ] **Step 3: Implement only the missing resource functions**

Use `URLSearchParams` and existing interfaces. Preserve backend camelCase keys and pagination envelopes; do not remap into a second DTO layer.

```ts
export const getBrandModels = (brandId: number) =>
  apiClient.get<CarModel>(`/brands/${brandId}/models`) as Promise<Paginated<CarModel>>;
```

- [ ] **Step 4: Run the focused resource test**

Run: `npx jest src/api/__tests__/catalogResources.test.ts --runInBand`

Expected: PASS.

### Task 2: Replace public catalog mocks in home, categories, results, and tyre search

**Files:**
- Modify: `src/components/screens/client/HomeScreen.tsx`
- Modify: `src/app/(client)/categories/index.tsx`
- Modify: `src/app/(client)/categories/[categoryId]/index.tsx`
- Modify: `src/app/(client)/categories/results.tsx`
- Modify: `src/app/(client)/search/index.tsx`
- Modify: `src/app/(client)/products/[productId]/index.tsx`
- Modify: `src/app/(client)/products/[productId]/reviews.tsx`
- Modify: `src/localization/fr.json`
- Modify: `src/localization/ar.json`
- Create: `src/app/(client)/__tests__/catalogJourneys.test.tsx`

**Interfaces:**
- Consumes: Task 1 catalog functions
- Produces: public loading, empty, retry, results, detail, and review-list states

- [ ] **Step 1: Write focused screen tests**

Test home/category loading and retry, empty products, category/condition navigation, query-driven result loading, tyre result filters, and product detail/reviews. Assert that no protected call occurs for a guest preview.

```tsx
render(<CategoryResultsScreen />);
await waitFor(() => expect(mockGetProducts).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 12 })));
expect(queryByText('mock product')).toBeNull();
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest "src/app/(client)/__tests__/catalogJourneys.test.tsx" --runInBand`

Expected: FAIL because screens import direct fixtures or generate products locally.

- [ ] **Step 3: Replace fixture reads with resource state**

Use one load callback per screen, `useEffect` for route parameters, and explicit `loading | error | empty | data` rendering. Home may show public featured products/categories to guests; it loads personal request summaries only for a Client session.

- [ ] **Step 4: Gate protected product actions**

Basket, wishlist, review, report, and add-to-request actions check `role === Role.CLIENT`. Guests navigate to the existing login gate; authenticated Clients call their resource and reconcile the returned server state.

- [ ] **Step 5: Run the focused catalog tests**

Run: `npx jest "src/app/(client)/__tests__/catalogJourneys.test.tsx" --runInBand`

Expected: PASS.

### Task 3: Persist registration and Client garage selection

**Files:**
- Modify: `src/app/(auth)/register/car-selection.tsx`
- Modify: `src/app/(client)/search/add-car.tsx`
- Modify: `src/app/(client)/search/change-car.tsx`
- Modify: `src/app/(client)/settings/parking/index.tsx`
- Modify: `src/components/screens/client/parking/ClientAddCarForm.tsx`
- Modify: `src/api/resources/vehicles.ts`
- Create: `src/app/(client)/__tests__/vehicleJourneys.test.tsx`

**Interfaces:**
- Consumes: `getBrands`, `getBrandModels`, `getCarYears`, `getMotorizations`, `getVehicles`, `addVehicle`, `deleteVehicle`
- Produces: a real selected/default vehicle ID for request creation

- [ ] **Step 1: Write vehicle-flow tests**

Cover dependent brand→model loading, optional motorization, add persistence, delete persistence, empty garage, registration skip, and change-car selection using backend vehicle IDs.

```tsx
fireEvent(getByTestId('brand-picker'), 'onValueChange', 2);
await waitFor(() => expect(mockGetBrandModels).toHaveBeenCalledWith(2));
fireEvent.press(getByRole('button', { name: 'Ajouter' }));
await waitFor(() => expect(mockAddVehicle).toHaveBeenCalledWith(expect.objectContaining({ brandId: 2 })));
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest "src/app/(client)/__tests__/vehicleJourneys.test.tsx" --runInBand`

Expected: FAIL because model lists and several mutations are local/mock-only.

- [ ] **Step 3: Wire real vehicle catalog and mutations**

Clear dependent model selection when brand changes, disable save until required IDs/year exist, await the API, and update visible state from the returned Vehicle. Do not fabricate a default ID. Registration car selection creates the vehicle only after the Client session is active; skip leaves an empty garage.

- [ ] **Step 4: Run vehicle tests**

Run: `npx jest "src/app/(client)/__tests__/vehicleJourneys.test.tsx" --runInBand`

Expected: PASS.

### Task 4: Wire Client request draft, attachments, send, and offer acceptance

**Files:**
- Modify: `src/app/(client)/requests/index.tsx`
- Modify: `src/app/(client)/requests/CreateRequestScreen.tsx`
- Modify: `src/app/(client)/requests/verification.tsx`
- Modify: `src/app/(client)/requests/[requestId]/index.tsx`
- Modify: `src/app/(client)/requests/[requestId]/offers/index.tsx`
- Modify: `src/app/(client)/requests/[requestId]/offers/[offerId]/index.tsx`
- Modify: `src/api/resources/requests.ts`
- Modify: `src/components/common/ImageInputList.tsx`
- Create: `src/app/(client)/__tests__/requestJourneys.test.tsx`

**Interfaces:**
- Consumes: selected/default vehicle from Task 3 and `uploadLocalImages` from the transport/upload plan
- Produces: backend-valid `CreateRequestPayload` with real leaf category IDs and uploaded image paths

- [ ] **Step 1: Write request-flow tests**

Cover empty garage routing, category/item selection, attachment state, upload-before-create ordering, 422 field display, create→verification→send, request detail, offers, and accept→Basket navigation.

```tsx
await act(async () => pressVerifyAndSend());
expect(mockUploadLocalImages).toHaveBeenCalledWith(['file:///part.jpg']);
expect(mockCreateRequest).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: 42, images: ['tmp/mobile/5/image.jpg'] }));
```

- [ ] **Step 2: Run the focused request test and confirm failure**

Run: `npx jest "src/app/(client)/__tests__/requestJourneys.test.tsx" --runInBand`

Expected: FAIL because current flows use direct category data, `vehicleId: 1`, and untracked picker images.

- [ ] **Step 3: Remove fabricated IDs and wire attachments**

Load the current/default vehicle from `/vehicles`, store picker URIs in state via `onAddImage`/`onRemoveImage`, upload local URIs, and submit only returned server paths. Preserve draft items locally until the backend creates the draft; the server owns the final reference/status/expiry.

- [ ] **Step 4: Wire request and offer states**

Use `/requests`, detail, offers, and accept resources for active lists and drill-down screens. Remove `dataRequests`, `dataSubCategories`, and generated request rows from live paths.

- [ ] **Step 5: Run request tests**

Run: `npx jest "src/app/(client)/__tests__/requestJourneys.test.tsx" --runInBand`

Expected: PASS.

### Task 5: Verify product mutations, basket, and COD checkout against live envelopes

**Files:**
- Modify: `src/app/(client)/products/[productId]/index.tsx`
- Modify: `src/app/(client)/products/[productId]/review.tsx`
- Modify: `src/app/(client)/products/[productId]/report.tsx`
- Modify: `src/app/(client)/cart/index.tsx`
- Modify: `src/app/(client)/payment/index.tsx`
- Modify: `src/app/(client)/payment/success.tsx`
- Modify: `src/api/resources/basket.ts`
- Modify: `src/api/resources/orders.ts`
- Modify: `src/api/resources/reviews.ts`
- Modify: `src/api/resources/report.ts`
- Modify: `src/api/resources/wishlist.ts`
- Create: `src/app/(client)/__tests__/commerceJourneys.test.tsx`

**Interfaces:**
- Consumes: Product, Basket, Address, and Order server envelopes
- Produces: Client-only mutations and a COD-only phase-one checkout

- [ ] **Step 1: Write commerce journey tests**

Cover add-to-basket, wishlist toggle, review/report validation, quantity update/removal, coupon success/failure, empty basket, address requirement, COD placement, unsupported payment rejection, network retry, and served totals.

```tsx
expect(getByTestId('order-tax')).toHaveTextContent('24,00');
expect(mockPlaceOrder).toHaveBeenCalledWith({ addressId: 9, paymentMethod: 'cod', notes: null });
```

- [ ] **Step 2: Run the focused commerce test and confirm failure**

Run: `npx jest "src/app/(client)/__tests__/commerceJourneys.test.tsx" --runInBand`

Expected: FAIL for unhandled live envelopes/states and any client-computed totals.

- [ ] **Step 3: Reconcile live mutations and server totals**

Use the Basket returned by every mutation as the next UI state. Render `subtotal`, `discountAmount`, `shippingFee`, `taxAmount`, and `total` exactly as served. Keep non-COD methods visible only as disabled/unsupported phase-one choices if the current design requires them; never submit them.

- [ ] **Step 4: Run commerce tests**

Run: `npx jest "src/app/(client)/__tests__/commerceJourneys.test.tsx" --runInBand`

Expected: PASS.

### Task 6: Complete Client profile collections and typed payment reads

**Files:**
- Modify: `src/app/(client)/settings/profile/index.tsx`
- Modify: `src/app/(client)/settings/addresses/index.tsx`
- Modify: `src/app/(client)/settings/addresses/add.tsx`
- Modify: `src/app/(client)/settings/addresses/[addressId]/index.tsx`
- Modify: `src/app/(client)/settings/orders/index.tsx`
- Modify: `src/app/(client)/settings/orders/[orderId]/index.tsx`
- Modify: `src/app/(client)/settings/archived-offers/index.tsx`
- Modify: `src/app/(client)/settings/notifications/index.tsx`
- Modify: `src/app/(client)/settings/wishlist/index.tsx`
- Modify: `src/app/(client)/settings/payment/index.tsx`
- Modify: `src/api/resources/addresses.ts`
- Modify: `src/api/resources/notifications.ts`
- Modify: `src/api/resources/users.ts`
- Create: `src/app/(client)/__tests__/profileJourneys.test.tsx`

**Interfaces:**
- Consumes: existing address/profile/order/notification/wishlist resources and Task 1 payment-method resource
- Produces: live loading/empty/error/mutation states for every Client settings collection

- [ ] **Step 1: Write focused collection tests**

Cover profile update, address CRUD/default, order list/detail/cancel where exposed, empty/full notifications and read-all, wishlist removal, archived offers, and payment-method display without raw `apiClient` use.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest "src/app/(client)/__tests__/profileJourneys.test.tsx" --runInBand`

Expected: FAIL for missing states or raw transport usage.

- [ ] **Step 3: Complete resource-backed state and error handling**

Await mutations, reconcile returned data, expose retry on network/API failure, and preserve legitimate empty states. Do not add payment-method editing controls that the screen does not currently expose.

- [ ] **Step 4: Run profile tests**

Run: `npx jest "src/app/(client)/__tests__/profileJourneys.test.tsx" --runInBand`

Expected: PASS.

### Task 7: Remove remaining live Client fixture dependencies and localize touched states

**Files:**
- Modify only remaining hits under: `src/app/(client)` and `src/components/screens/client`
- Modify: `src/localization/fr.json`
- Modify: `src/localization/ar.json`
- Modify: `src/constants/__tests__/routesPermission.test.ts` only if intended access changes

**Interfaces:**
- Produces: zero direct mock/fixture dependencies on reachable live paths
- Preserves: explicit mock infrastructure under `src/api/mock`

- [ ] **Step 1: Run the source gate**

Run: `rg -n "@/api/mock|@/data/ws|mock[A-Z]|vehicleId:\s*1|TVA_RATE|0\.94|1\.06" "src/app/(client)" src/components/screens/client`

Expected before cleanup: remaining direct fixture, fabricated-ID, or pricing hits.

- [ ] **Step 2: Remove only runtime data-path hits**

Replace remaining live data with resources or local static presentation values. Do not delete golden mocks or fixture-only tests. Replace touched hard-coded French error/loading/empty copy with matching localization keys.

- [ ] **Step 3: Re-run the source gate**

Expected: no live fixture, fabricated vehicle ID, or pricing calculation hits; any comment/test-only hit is explicitly classified.

## Final verification

- [ ] Run `npx jest src/api/__tests__/catalogResources.test.ts "src/app/(client)/__tests__/catalogJourneys.test.tsx" "src/app/(client)/__tests__/vehicleJourneys.test.tsx" "src/app/(client)/__tests__/requestJourneys.test.tsx" "src/app/(client)/__tests__/commerceJourneys.test.tsx" "src/app/(client)/__tests__/profileJourneys.test.tsx" --runInBand`.
- [ ] Run existing focused regressions: `npx jest "src/app/(client)/__tests__/_layout.test.tsx" src/constants/__tests__/routesPermission.test.ts src/api/mock/__tests__/goldenStore.test.ts --runInBand`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npx eslint "src/app/(client)" src/components/screens/client src/api/resources --ext .ts,.tsx`.
- [ ] Parse both localization JSON files and confirm every added key exists in French and Arabic.
- [ ] Review the diff for guest/protected boundaries, live-only errors, server totals, strict types, and unrelated files.
