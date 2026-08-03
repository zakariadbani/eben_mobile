type ClientModule = typeof import('../client');

const originalFetch = global.fetch;
let loaded: ClientModule | undefined;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function loadClient(mode: 'live' | 'mock' = 'live'): ClientModule {
  jest.resetModules();
  if (mode === 'mock') {
    jest.doMock('../config', () => ({
      ...jest.requireActual('../config'),
      API_MODE: 'mock',
    }));
  }
  loaded = require('../client') as ClientModule;
  return loaded;
}

function mockFetch(response: { ok: boolean; status: number; json: () => Promise<unknown> }): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue(response);
  global.fetch = fetchMock as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  loaded?.apiClient.setToken(null);
  loaded?.apiClient.setUnauthorizedHandler(null);
  global.fetch = originalFetch;
  jest.dontMock('../config');
  jest.restoreAllMocks();
  jest.resetModules();
  loaded = undefined;
});

it('defaults API mode to live', () => {
  jest.resetModules();
  jest.dontMock('../config');

  expect((require('../config') as typeof import('../config')).API_MODE).toBe('live');
});

it('forces live transport in production even when mocks are requested', () => {
  const { resolveApiMode } = require('../config') as typeof import('../config');

  expect(resolveApiMode(false, 'mock')).toBe('live');
  expect(resolveApiMode(true, 'mock')).toBe('mock');
});

it('sends the Bearer token and returns the Laravel envelope', async () => {
  const { apiClient } = loadClient();
  apiClient.setToken('secret-token');
  const fetchMock = mockFetch({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { id: 1 } }),
  });

  await expect(apiClient.get<{ id: number }>('/profile')).resolves.toEqual({
    success: true,
    data: { id: 1 },
  });
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/profile'),
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }) }),
  );
});

it('serializes JSON request bodies', async () => {
  const { apiClient } = loadClient();
  const fetchMock = mockFetch({ ok: true, status: 200, json: async () => ({ success: true, data: { id: 1 } }) });

  await apiClient.post('/profiles', { name: 'Zakaria' });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: JSON.stringify({ name: 'Zakaria' }),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }),
  );
});

it('passes FormData without a Content-Type header', async () => {
  const { apiClient } = loadClient();
  const formData = new FormData();
  formData.append('photo', 'binary');
  const fetchMock = mockFetch({ ok: true, status: 200, json: async () => ({ success: true, data: { id: 1 } }) });

  await apiClient.post('/uploads', formData);

  expect(fetchMock).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ body: formData, headers: expect.not.objectContaining({ 'Content-Type': expect.anything() }) }),
  );
});

it('returns paginated Laravel envelopes unchanged', async () => {
  const { apiClient } = loadClient();
  const response = {
    success: true as const,
    data: [{ id: 1 }],
    pagination: { total: 1, perPage: 20, currentPage: 1, lastPage: 1, from: 1, to: 1 },
  };
  mockFetch({ ok: true, status: 200, json: async () => response });

  await expect(apiClient.get<{ id: number }>('/products')).resolves.toEqual(response);
});

it('exposes 422 field errors through ApiClientError', async () => {
  const { apiClient, ApiClientError } = loadClient();
  mockFetch({
    ok: false,
    status: 422,
    json: async () => ({ success: false, message: 'Validation failed', errors: { phone: ['Invalid phone number'] } }),
  });

  await expect(apiClient.post('/login', {})).rejects.toBeInstanceOf(ApiClientError);
  await expect(apiClient.post('/login', {})).rejects.toEqual(
    expect.objectContaining({
      name: 'ApiClientError',
      message: 'Validation failed',
      status: 422,
      errors: { phone: ['Invalid phone number'] },
    }),
  );
});

it('wraps malformed JSON as an ApiClientError', async () => {
  const { apiClient, ApiClientError } = loadClient();
  mockFetch({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token'); } });

  await expect(apiClient.get('/broken')).rejects.toBeInstanceOf(ApiClientError);
  await expect(apiClient.get('/broken')).rejects.toMatchObject({ status: 200, errors: {} });
});

it('wraps network failures as an ApiClientError', async () => {
  const { apiClient, ApiClientError } = loadClient();
  global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as typeof fetch;

  await expect(apiClient.get('/offline')).rejects.toBeInstanceOf(ApiClientError);
  await expect(apiClient.get('/offline')).rejects.toMatchObject({ status: null, errors: {} });
});

it('calls the unauthorized handler only for 401 responses', async () => {
  const { apiClient } = loadClient();
  const onUnauthorized = jest.fn();
  apiClient.setUnauthorizedHandler(onUnauthorized);
  mockFetch({ ok: false, status: 401, json: async () => ({ success: false, message: 'Unauthenticated' }) });

  await expect(apiClient.get('/profile')).rejects.toMatchObject({ status: 401 });

  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

it('ignores a stale authenticated 401 after a newer token is installed', async () => {
  const { apiClient } = loadClient();
  const onUnauthorized = jest.fn();
  const response = deferred<Response>();
  global.fetch = jest.fn().mockReturnValue(response.promise) as typeof fetch;
  apiClient.setUnauthorizedHandler(onUnauthorized);
  apiClient.setToken('older-token');

  const olderRequest = apiClient.get('/profile');
  apiClient.setToken('newer-token');
  response.resolve({
    ok: false,
    status: 401,
    json: async () => ({ success: false, message: 'Unauthenticated' }),
  } as Response);

  await expect(olderRequest).rejects.toMatchObject({ status: 401 });
  expect(onUnauthorized).not.toHaveBeenCalled();
  expect(apiClient.getToken()).toBe('newer-token');
});

it('ignores a stale unauthenticated 401 after a token is installed', async () => {
  const { apiClient } = loadClient();
  const onUnauthorized = jest.fn();
  const response = deferred<Response>();
  global.fetch = jest.fn().mockReturnValue(response.promise) as typeof fetch;
  apiClient.setUnauthorizedHandler(onUnauthorized);

  const olderLogin = apiClient.post('/auth/login', {});
  apiClient.setToken('newly-installed-token');
  response.resolve({
    ok: false,
    status: 401,
    json: async () => ({ success: false, message: 'Invalid credentials' }),
  } as Response);

  await expect(olderLogin).rejects.toMatchObject({ status: 401 });
  expect(onUnauthorized).not.toHaveBeenCalled();
  expect(apiClient.getToken()).toBe('newly-installed-token');
});

it('uses the mock registry only when mock mode is explicit', async () => {
  const { apiClient } = loadClient('mock');
  const fetchMock = jest.fn();
  global.fetch = fetchMock as typeof fetch;

  await expect(apiClient.get('/profile')).resolves.toMatchObject({ success: true });
  expect(fetchMock).not.toHaveBeenCalled();
});

it('supports the Client home product queries in mock mode', async () => {
  const { apiClient } = loadClient('mock');

  await expect(
    apiClient.get('/products?categoryId=100&condition=en_stock&featured=1&perPage=6'),
  ).resolves.toMatchObject({ success: true, data: expect.any(Array) });
  await expect(
    apiClient.get('/products?categoryId=100&condition=occasion&sort=recent&perPage=6'),
  ).resolves.toMatchObject({ success: true, data: expect.any(Array) });
});
it('supports Android auth recovery and Prestataire dashboard mock paths', async () => {
  const { apiClient } = loadClient('mock');
  const phone = '+212612345678';

  await expect(apiClient.post('/auth/register', { role: 'client', name: 'Test Client', phone, password: 'password123' }))
    .resolves.toMatchObject({ success: true, data: { user: { phone } } });
  await apiClient.post('/auth/otp/send', { phone, purpose: 'register' });
  await expect(apiClient.post('/auth/verify-phone', { phone, code: '123456' }))
    .resolves.toMatchObject({ data: { verified: true } });
  await apiClient.post('/auth/forgot-password', { phone });
  await apiClient.post('/auth/otp/verify', { phone, purpose: 'password_reset', code: '123456' });
  await expect(apiClient.post('/auth/reset-password', { phone, code: '123456', password: 'new-password123' }))
    .resolves.toMatchObject({ data: { success: true } });
  await expect(apiClient.get('/prestataire/dashboard/series?period=6m'))
    .resolves.toMatchObject({ data: { period: '6m', buckets: [] } });
  await expect(apiClient.post('/prestataire/notifications/read-all', {}))
    .resolves.toMatchObject({ success: true, data: { updated: expect.any(Number) } });
});
it('fails unregistered mock calls instead of returning fallback data', async () => {
  const { apiClient, ApiClientError } = loadClient('mock');

  await expect(apiClient.get('/missing')).rejects.toBeInstanceOf(ApiClientError);
  await expect(apiClient.get('/missing')).rejects.toEqual(
    expect.objectContaining({
      name: 'ApiClientError',
      message: 'No mock registered for GET:/missing',
      status: null,
      errors: {},
    }),
  );
});

it('fails an unregistered PUT instead of using the method wildcard', async () => {
  const { apiClient, ApiClientError } = loadClient('mock');

  await expect(apiClient.put('/missing', {})).rejects.toBeInstanceOf(ApiClientError);
  await expect(apiClient.put('/missing', {})).rejects.toMatchObject({
    message: 'No mock registered for PUT:/missing',
    status: null,
    errors: {},
  });
});

it('preserves route-aware dynamic basket mocks', async () => {
  const { apiClient } = loadClient('mock');

  await expect(apiClient.put('/basket/items/3001', { quantity: 2 })).resolves.toMatchObject({
    success: true,
    data: expect.objectContaining({
      items: expect.arrayContaining([expect.objectContaining({ id: 3001, quantity: 2 })]),
    }),
  });
});

it.each([null, [], {}, { success: 'true', data: { id: 1 } }])(
  'rejects a parsed response without boolean success semantics: %p',
  async (payload) => {
    const { apiClient, ApiClientError } = loadClient();
    mockFetch({ ok: true, status: 200, json: async () => payload });

    await expect(apiClient.get('/malformed')).rejects.toBeInstanceOf(ApiClientError);
    await expect(apiClient.get('/malformed')).rejects.toMatchObject({
      message: 'Invalid API response',
      status: 200,
      errors: {},
    });
  },
);

it('retains only string-array validation fields', async () => {
  const { apiClient } = loadClient();
  mockFetch({
    ok: false,
    status: 422,
    json: async () => ({
      success: false,
      message: 'Validation failed',
      errors: {
        email: ['Invalid email', 42],
        phone: 'Invalid phone',
        name: ['Name is required'],
      },
    }),
  });

  await expect(apiClient.post('/login', {})).rejects.toHaveProperty(
    'errors',
    { name: ['Name is required'] },
  );
});
