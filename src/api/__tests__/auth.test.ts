import {
  forgotPassword,
  login,
  logout,
  register,
  resetPassword,
  sendOtp,
  submitPartnerWaitlist,
  verifyOtp,
  verifyPhone,
} from '../resources/auth';
import { apiClient } from '../client';

jest.mock('../client', () => ({
  apiClient: { post: jest.fn() },
}));

const post = apiClient.post as jest.Mock;

const user = {
  id: 1,
  name: 'Test User',
  email: null,
  phone: '+212600000000',
  role: 'client' as const,
  avatar: null,
  status: 'active' as const,
  token: 'user-token',
};

beforeEach(() => {
  post.mockReset();
});

it('posts login credentials to /auth/login', async () => {
  const payload = { phone: '+212600000000', password: 'password' };
  post.mockResolvedValue({ success: true, data: { token: 'user-token', user } });

  await expect(login(payload)).resolves.toEqual({ success: true, data: { token: 'user-token', user } });
  expect(post).toHaveBeenCalledWith('/auth/login', payload);
});

it('rejects login responses whose tokens differ', async () => {
  post.mockResolvedValue({ success: true, data: { token: 'outer-token', user } });

  await expect(login({ phone: '+212600000000', password: 'password' })).rejects.toThrow('Auth token mismatch');
});

it.each([
  ['an absent outer token', { user }],
  ['an empty outer token', { token: '', user }],
  ['an absent user token', { token: 'user-token', user: { ...user, token: undefined } }],
  ['an empty user token', { token: 'user-token', user: { ...user, token: '' } }],
  ['both tokens absent', { user: { ...user, token: undefined } }],
])('rejects login responses with %s', async (_case, data) => {
  post.mockResolvedValue({ success: true, data });

  await expect(login({ phone: '+212600000000', password: 'password' })).rejects.toThrow('Auth token mismatch');
});

it('posts registration data and normalizes the user token into a session', async () => {
  const payload = {
    role: 'client' as const,
    name: 'Test User',
    phone: '+212600000000',
    password: 'password',
    email: 'test@example.com',
  };
  post.mockResolvedValue({ success: true, data: { user } });

  await expect(register(payload)).resolves.toEqual({ success: true, data: { token: 'user-token', user } });
  expect(post).toHaveBeenCalledWith('/auth/register', payload);
});

it('posts logout with an empty body', async () => {
  post.mockResolvedValue({ success: true, data: { revoked: true } });

  await logout();

  expect(post).toHaveBeenCalledWith('/auth/logout', undefined);
});

it('posts an OTP send request to /auth/otp/send', async () => {
  const payload = { phone: '+212600000000', purpose: 'register' as const };
  post.mockResolvedValue({ success: true, data: { sent: true } });

  await sendOtp(payload);

  expect(post).toHaveBeenCalledWith('/auth/otp/send', payload);
});

it('posts an OTP verification request to /auth/otp/verify', async () => {
  const payload = { phone: '+212600000000', code: '123456', purpose: 'password_reset' as const };
  post.mockResolvedValue({ success: true, data: { verified: true } });

  await verifyOtp(payload);

  expect(post).toHaveBeenCalledWith('/auth/otp/verify', payload);
});

it('posts phone verification data to /auth/verify-phone', async () => {
  const payload = { phone: '+212600000000', code: '123456' };
  post.mockResolvedValue({ success: true, data: { verified: true } });

  await verifyPhone(payload);

  expect(post).toHaveBeenCalledWith('/auth/verify-phone', payload);
});

it('posts a phone number to /auth/forgot-password', async () => {
  const payload = { phone: '+212600000000' };
  post.mockResolvedValue({ success: true, data: { sent: true } });

  await forgotPassword(payload);

  expect(post).toHaveBeenCalledWith('/auth/forgot-password', payload);
});

it('posts reset data to /auth/reset-password', async () => {
  const payload = { phone: '+212600000000', code: '123456', password: 'new-password' };
  post.mockResolvedValue({ success: true, data: { reset: true } });

  await resetPassword(payload);

  expect(post).toHaveBeenCalledWith('/auth/reset-password', payload);
});

it('posts partner applications to /partner-waitlist', async () => {
  const payload = {
    firstName: 'Test',
    lastName: 'Partner',
    phone: '+212600000000',
    email: 'partner@example.com',
    city: 'Casablanca',
    businessType: 'garage',
    companyName: 'Test Garage',
    acceptedTerms: true as const,
  };
  post.mockResolvedValue({ success: true, data: { submitted: true } });

  await submitPartnerWaitlist(payload);

  expect(post).toHaveBeenCalledWith('/partner-waitlist', payload);
});
