import { http } from '@/lib/api/http';
import type { User } from '@/lib/types';

export interface AuthSuccess {
  user: User;
  token: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export type OtpPurpose = 'verify_email' | 'reset_password';

/**
 * Auth endpoints. Login/register/verify are `anonymous` because no token
 * exists yet at that point in the flow.
 */
export const authApi = {
  register: (input: RegisterInput) =>
    http<{ message: string; email: string }>('/api/auth/register', {
      method: 'POST',
      body: input,
      anonymous: true,
    }),

  verifyEmail: (email: string, code: string) =>
    http<AuthSuccess>('/api/auth/verify-email', {
      method: 'POST',
      body: { email, code },
      anonymous: true,
    }),

  resendOtp: (email: string, purpose: OtpPurpose = 'verify_email') =>
    http<{ message: string }>('/api/auth/resend-otp', {
      method: 'POST',
      body: { email, purpose },
      anonymous: true,
    }),

  login: (email: string, password: string) =>
    http<AuthSuccess>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      anonymous: true,
    }),

  forgotPassword: (email: string) =>
    http<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
      anonymous: true,
    }),

  resetPassword: (input: {
    email: string;
    code: string;
    password: string;
    password_confirmation: string;
  }) =>
    http<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: input,
      anonymous: true,
    }),

  me: (signal?: AbortSignal) => http<User>('/api/auth/user', { signal }),

  logout: () => http<{ message: string }>('/api/auth/logout', { method: 'POST' }),
};
