import { apiClient } from '../client';
import type { ApiResponse } from '../types';
import type { AuthUser } from '@/interfaces/User';

export interface AuthSession {
  token: string;
  /** Durable marker used to prevent simulator credentials reaching a live API. */
  source?: 'mock';
  user: AuthUser;
  /** Local-only durable marker used while a changed phone awaits public OTP verification. */
  pendingPhoneVerification?: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface RegisterPayload {
  role: 'client';
  name: string;
  phone: string;
  password: string;
  email?: string;
}

export interface ResetPasswordPayload {
  phone: string;
  code: string;
  password: string;
}

export type OtpPurpose = 'register' | 'password_reset';

export interface SendOtpPayload {
  phone: string;
  purpose: OtpPurpose;
}

export interface VerifyOtpPayload extends SendOtpPayload {
  code: string;
}

export interface VerifyPhonePayload {
  phone: string;
  code: string;
}

export interface PhonePayload {
  phone: string;
}

export interface PartnerWaitlistPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  businessType: string;
  companyName: string;
  acceptedTerms: true;
}

export interface LogoutResult {
  success: true;
}

export interface ResetPasswordResult {
  success: true;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface RegisterResponse {
  user: AuthUser;
}

export async function login(payload: LoginPayload): Promise<ApiResponse<AuthSession>> {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload);
  const { token, user } = response.data;

  if (typeof token !== 'string' || !token || typeof user.token !== 'string' || !user.token || token !== user.token) {
    throw new Error('Auth token mismatch');
  }

  return response;
}

export async function register(payload: RegisterPayload): Promise<ApiResponse<AuthSession>> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', payload);

  return { ...response, data: { user: response.data.user, token: response.data.user.token } };
}

export async function logout(): Promise<ApiResponse<LogoutResult>> {
  return apiClient.post<LogoutResult>('/auth/logout', undefined);
}

export async function sendOtp(payload: SendOtpPayload): Promise<ApiResponse<{ sent: true }>> {
  return apiClient.post<{ sent: true }>('/auth/otp/send', payload);
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<ApiResponse<{ verified: true }>> {
  return apiClient.post<{ verified: true }>('/auth/otp/verify', payload);
}

export async function verifyPhone(payload: VerifyPhonePayload): Promise<ApiResponse<{ verified: true }>> {
  return apiClient.post<{ verified: true }>('/auth/verify-phone', payload);
}

export async function forgotPassword(payload: PhonePayload): Promise<ApiResponse<{ sent: true }>> {
  return apiClient.post<{ sent: true }>('/auth/forgot-password', payload);
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<ApiResponse<ResetPasswordResult>> {
  return apiClient.post<ResetPasswordResult>('/auth/reset-password', payload);
}

export async function submitPartnerWaitlist(
  payload: PartnerWaitlistPayload,
): Promise<ApiResponse<{ submitted: true }>> {
  return apiClient.post<{ submitted: true }>('/partner-waitlist', payload);
}
