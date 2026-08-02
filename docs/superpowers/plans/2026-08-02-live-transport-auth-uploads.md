# Live Transport, Authentication, and Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock-only networking with explicit live/mock transport, implement secure Laravel authentication lifecycle, and add the missing authenticated image-upload boundary.

**Architecture:** Keep `apiClient` as the only transport and existing resource functions as screen-facing APIs. `SessionProvider` owns token/session lifecycle and registers one centralized 401 handler. Laravel adds one user-scoped upload endpoint; domain payloads accept only paths owned by the authenticated user.

**Tech Stack:** Expo SDK 51, React Native 0.74, TypeScript strict mode, Expo SecureStore, Jest/jest-expo, Laravel 11, Sanctum, PHPUnit.

## Global Constraints

- NO COMMIT, NO PUSH, NO STAGE; leave changes in the working tree.
- Do not add dependencies.
- Production Sanctum expiration remains `null`; test an explicitly expired token without changing config.
- Live mode never falls back to mock data; unknown mock calls fail explicitly.
- Backend role `ferrailleur` maps to mobile `Role.PRESTATAIRE`; the server role is authoritative.
- No secrets or deterministic passwords in tracked files, logs, screenshots, or reports.
- Preserve unrelated dirty changes in both repositories.
- Add matching French and Arabic translation keys for every touched user-facing string.

---

### Task 1: Explicit API mode and typed live transport

**Files:**
- Modify: `src/api/config.ts`
- Modify: `src/api/types.ts`
- Modify: `src/api/client.ts`
- Create: `src/api/__tests__/client.test.ts`

**Interfaces:**
- Produces: `API_MODE: 'live' | 'mock'`
- Produces: `ApiClientError extends Error` with `status: number | null` and `errors: Record<string, string[]>`
- Produces: `apiClient.setUnauthorizedHandler(handler: (() => void) | null): void`
- Preserves: `get/post/put/del` return envelopes used by all resource modules

- [ ] **Step 1: Write focused failing transport tests**

Cover live Bearer headers, JSON bodies, `FormData`, pagination, 422 field errors, malformed JSON, network failure, centralized 401 callback, explicit mock routing, and missing-mock failure. Reset token, handler, fetch mocks, and environment modules between tests.

```ts
it('sends the Bearer token and returns the Laravel envelope', async () => {
  apiClient.setToken('secret-token');
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { id: 1 } }),
  });

  await expect(apiClient.get<{ id: number }>('/profile')).resolves.toEqual({
    success: true,
    data: { id: 1 },
  });
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/profile'),
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }) }),
  );
});
```

- [ ] **Step 2: Run the focused transport test and confirm failure**

Run: `npx jest src/api/__tests__/client.test.ts --runInBand`

Expected: FAIL because live fetch, typed errors, mode selection, and the unauthorized callback do not exist.

- [ ] **Step 3: Implement the minimal transport**

Use an explicit mode with live default:

```ts
export type ApiMode = 'live' | 'mock';
export const API_MODE: ApiMode =
  process.env.EXPO_PUBLIC_API_MODE === 'mock' ? 'mock' : 'live';
```

Add one error type and make `request` branch once on `API_MODE`. In live mode, omit `Content-Type` for `FormData`, parse JSON once, throw on non-success envelopes, and call the unauthorized handler only for status 401. In mock mode, preserve golden-store/registry behavior but throw `ApiClientError` for an unregistered key.

```ts
export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}
```

- [ ] **Step 4: Run the focused test**

Run: `npx jest src/api/__tests__/client.test.ts --runInBand`

Expected: PASS.

### Task 2: Authentication resources and server-authoritative session state

**Files:**
- Create: `src/api/resources/auth.ts`
- Modify: `src/api/index.ts`
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/context/useStorageState.tsx`
- Modify: `src/context/__tests__/AuthContext.test.tsx`
- Modify: `src/interfaces/User.ts`

**Interfaces:**
- Produces: `AuthUser`, `AuthSession`, `RegisterPayload`, and `ResetPasswordPayload`
- Produces resource functions: `login`, `register`, `sendOtp`, `verifyPhone`, `verifyOtp`, `forgotPassword`, `resetPassword`, `logout`
- Produces context methods: asynchronous `login`, `registerClient`, `verifyRegistration`, `startPasswordReset`, `verifyPasswordReset`, `completePasswordReset`, and `logOut`
- Consumes: `apiClient.setToken` and `apiClient.setUnauthorizedHandler`

- [ ] **Step 1: Extend AuthContext tests with real lifecycle expectations**

Mock only `src/api/resources/auth.ts`, profile validation calls, and SecureStore. Prove that caller role hints cannot create sessions, `ferrailleur` maps to `prestataire`, mismatched entry roles reject and revoke, pending registration is not authenticated, relaunch installs then validates a token, 401 clears storage, and logout clears locally even when revocation fails.

```tsx
await act(async () => {
  await result.current.login('+212600000101', 'local-password', Role.CLIENT);
});
expect(result.current.session).toEqual({ token: 'token-1', user: expect.objectContaining({ role: 'client' }) });
expect(apiClient.getToken()).toBe('token-1');
```

- [ ] **Step 2: Run the named auth tests and confirm failure**

Run: `npx jest src/context/__tests__/AuthContext.test.tsx -t "server|registration|restore|401|logout" --runInBand`

Expected: FAIL because the current context is synchronous local mock authentication.

- [ ] **Step 3: Add the typed auth resource**

Normalize the backend's registration and login shapes without changing their server contract:

```ts
export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  role: 'client' | 'ferrailleur';
  avatar: string | null;
  status: 'active' | 'inactive' | 'suspended';
  token: string;
}

export const login = (phone: string, password: string) =>
  apiClient.post<{ token: string; user: AuthUser }>('/auth/login', { phone, password });
```

Registration extracts `data.user.token`; login asserts `data.token === data.user.token` and fails closed if the backend returns contradictory tokens.

- [ ] **Step 4: Implement session orchestration**

Persist only `{token, user}` in the existing `session` SecureStore key. Keep pending registration and recovery OTP state in memory so unverified users never gain a Client route session and OTP codes never enter URLs or durable storage. Validate restored sessions with `/profile` for Client and `/prestataire/profile` for Prestataire before releasing the root loading gate.

Ensure `setStorageItemAsync` returns its promise to callers that require ordering, while the hook setter remains compatible with current consumers.

- [ ] **Step 5: Run focused context and storage tests**

Run: `npx jest src/context/__tests__/AuthContext.test.tsx --runInBand`

Expected: PASS.

### Task 3: Wire Client and Prestataire auth screens

**Files:**
- Modify: `src/app/(auth)/ClientLoginScreen.tsx`
- Modify: `src/app/(auth)/ClientRegisterScreen.tsx`
- Modify: `src/app/(auth)/register/verification.tsx`
- Modify: `src/app/(auth)/prestataire/sign-in.tsx`
- Modify: `src/app/(auth)/ForgotPasswordScreen.tsx`
- Modify: `src/app/(auth)/forgot-password/verification.tsx`
- Modify: `src/app/(auth)/forgot-password/new-password.tsx`
- Modify: `src/app/(auth)/prestataire/forgot-password/index.tsx`
- Modify: `src/app/(auth)/prestataire/forgot-password/verification.tsx`
- Modify: `src/app/(auth)/prestataire/forgot-password/new-password.tsx`
- Modify: `src/app/(auth)/prestataire/waitlist.tsx`
- Modify: `src/localization/fr.json`
- Modify: `src/localization/ar.json`
- Create: `src/app/(auth)/__tests__/authFlows.test.tsx`

**Interfaces:**
- Consumes: the asynchronous AuthContext operations from Task 2
- Consumes: `submitPartnerWaitlist` resource added beside auth resources
- Produces: visible loading, validation, API-error, and role-mismatch behavior for every auth form

- [ ] **Step 1: Write focused journey tests**

Cover Client login, wrong-role login, Client registration → OTP, Client/Prestataire recovery, waitlist validation/persistence, and disabled double-submit behavior.

```tsx
fireEvent.changeText(getByPlaceholderText('06XXXXXXXX'), '+212600000101');
fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'local-password');
fireEvent.press(getByRole('button', { name: 'Se connecter' }));
await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('+212600000101', 'local-password', Role.CLIENT));
```

- [ ] **Step 2: Run the focused auth-flow test and confirm failure**

Run: `npx jest "src/app/(auth)/__tests__/authFlows.test.tsx" --runInBand`

Expected: FAIL because submissions are local/no-op and errors are not mapped.

- [ ] **Step 3: Replace local/no-op submissions**

Await AuthContext/resource calls, preserve current navigation, and render `ApiClientError.errors` against the matching form field. Prestataire login must pass the expected Prestataire role but accept only the backend `ferrailleur` role. Waitlist remains registration intent; it never creates a Ferrailleur account.

- [ ] **Step 4: Localize touched auth copy**

Replace hard-coded alerts and validation/loading/error labels in the touched files with paired `fr.json` and `ar.json` keys. Do not refactor unrelated copy.

- [ ] **Step 5: Run focused auth tests**

Run: `npx jest "src/app/(auth)/__tests__/authFlows.test.tsx" src/context/__tests__/AuthContext.test.tsx --runInBand`

Expected: PASS.

### Task 4: Add the authenticated Laravel image-upload boundary

**Files in `../eben_backend`:**
- Create: `app/Http/Requests/Api/V1/StoreImageUploadRequest.php`
- Create: `app/Http/Controllers/Api/V1/ImageUploadController.php`
- Create: `routes/Api/V1/uploads.php`
- Modify: `app/Services/UploadService.php`
- Modify: `app/Http/Requests/Api/V1/StorePartRequestRequest.php`
- Modify: `app/Http/Requests/Api/V1/SubmitOfferRequest.php`
- Create: `tests/Feature/Api/V1/ImageUploadApiTest.php`
- Modify: `tests/Feature/Api/V1/RequestOfferApiTest.php`
- Modify: `tests/Feature/Api/V1/AuthApiTest.php`
- Modify: `../structure/specs/api-contract.md`

**Interfaces:**
- Produces: `POST /api/v1/uploads/images` → `ApiResponse<{path: string}>`
- Produces: `UploadService::storeMobileImage(UploadedFile $file, int $userId): string`
- Constrains: request/offer image paths to `tmp/mobile/{authenticatedUserId}/...`

- [ ] **Step 1: Write focused failing Laravel tests**

Test unauthenticated rejection, inactive/unverified rejection, Client/Ferrailleur success, type/size validation, collision-safe paths, another user's path rejection in request/offer payloads, and a Sanctum config-expiration test that yields 401 for an old token.

```php
public function test_client_upload_is_scoped_to_the_authenticated_user(): void
{
    Storage::fake('public');
    $user = User::factory()->verified()->client()->create();

    $this->actingAs($user, 'sanctum')->postJson('/api/v1/uploads/images', [
        'image' => UploadedFile::fake()->image('part.webp'),
    ])->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('data.path', fn (string $path): bool => str_starts_with($path, "tmp/mobile/{$user->id}/"));
}
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `php artisan test tests/Feature/Api/V1/ImageUploadApiTest.php --stop-on-failure`

Expected: FAIL because the route/request/controller do not exist.

- [ ] **Step 3: Implement the upload request, service method, controller, and route**

Use the existing image disk and configured size limit. The route must apply `auth:sanctum`, `api.account`, and `role:client|ferrailleur,sanctum` using the repository's existing multi-role middleware syntax.

```php
return $this->respond(['path' => $path], 201);
```

- [ ] **Step 4: Enforce current-user path ownership in domain requests**

Generate the exact prefix from `$this->user()->getKey()` and reject remote URLs, traversal, other users' prefixes, and unscoped `tmp/` paths. Persisted remote image URLs are response-only and never valid new mutation input.

- [ ] **Step 5: Add explicit token expiration coverage**

Create a real token with `createToken('expired', ['*'], now()->subMinute())`, send its plaintext Bearer token to `/api/v1/profile`, and assert the standard 401 envelope. Do not use `Sanctum::actingAs`, which bypasses token expiry semantics, and do not change production `config/sanctum.php`.

- [ ] **Step 6: Update the shared contract**

Add the upload endpoint, accepted multipart field, size/type constraints, user-scoped path response, and request/offer ownership rule. Preserve the no-refresh and no-production-expiry decisions.

- [ ] **Step 7: Run focused Laravel tests**

Run: `php artisan test tests/Feature/Api/V1/ImageUploadApiTest.php tests/Feature/Api/V1/RequestOfferApiTest.php tests/Feature/Api/V1/AuthApiTest.php --stop-on-failure`

Expected: PASS.

### Task 5: Add mobile upload resource and URI conversion

**Files:**
- Create: `src/api/resources/uploads.ts`
- Modify: `src/api/index.ts`
- Modify: `src/api/client.ts`
- Create: `src/api/__tests__/uploads.test.ts`

**Interfaces:**
- Produces: `uploadImage(uri: string): Promise<{path: string}>`
- Produces: `uploadLocalImages(uris: string[]): Promise<string[]>`
- Preserves: existing HTTP URLs when explicitly passed as persisted read-only images; mutation callers filter them according to their flow

- [ ] **Step 1: Write URI/FormData tests**

Cover `file://` and `content://` URIs, filename fallback, MIME inference for jpg/png/webp, ordered multi-upload, partial failure propagation, and rejection of unsupported schemes.

```ts
await uploadImage('file:///tmp/part.jpg');
expect(mockPost).toHaveBeenCalledWith('/uploads/images', expect.any(FormData));
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx jest src/api/__tests__/uploads.test.ts --runInBand`

Expected: FAIL because upload resources do not exist.

- [ ] **Step 3: Implement minimal FormData conversion**

Use React Native's supported file object shape without adding a library:

```ts
form.append('image', { uri, name, type } as unknown as Blob);
```

Do not swallow upload errors or return local URIs as successful server paths.

- [ ] **Step 4: Run focused transport/upload tests**

Run: `npx jest src/api/__tests__/client.test.ts src/api/__tests__/uploads.test.ts --runInBand`

Expected: PASS.

## Final verification

- [ ] Run `npx jest src/api/__tests__/client.test.ts src/api/__tests__/uploads.test.ts src/context/__tests__/AuthContext.test.tsx "src/app/(auth)/__tests__/authFlows.test.tsx" --runInBand`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npx eslint src/api src/context "src/app/(auth)" --ext .ts,.tsx`.
- [ ] Run `php artisan test tests/Feature/Api/V1/ImageUploadApiTest.php tests/Feature/Api/V1/RequestOfferApiTest.php tests/Feature/Api/V1/AuthApiTest.php --stop-on-failure` from `../eben_backend`.
- [ ] Run `vendor/bin/pint --test` and `vendor/bin/phpstan` from `../eben_backend` after backend changes.
- [ ] Confirm `rg -n "No mock registered|return \{ success: true, data: \[\]" src/api/client.ts` finds no silent-success fallback.
- [ ] Confirm `rg -n "Invalid username or password|roleHint.*setSession" src/context src/app` finds no caller-authoritative authentication.
- [ ] Review both diffs for secrets, unrelated dirty files, role middleware, validation boundaries, and contract drift.
