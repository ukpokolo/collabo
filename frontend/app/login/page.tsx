'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';
import { useAuthSuccess } from '@/hooks/useSession';

export default function LoginPage() {
  const router = useRouter();
  const onSuccess = useAuthSuccess();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (result) => onSuccess(result),
    onError: (error) => {
      // 403 with this flag means the password was right but the address is
      // unverified — send them straight to the code screen.
      if (error instanceof ApiError && error.status === 403) {
        const payload = error.payload as { email_verification_required?: boolean } | undefined;
        if (payload?.email_verification_required) {
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
        }
      }
    },
  });

  const error = mutation.error instanceof ApiError ? mutation.error : undefined;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back — pick up where your team left off."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        {error && error.status !== 403 && !error.errors && (
          <Alert tone="error">{error.message}</Alert>
        )}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error?.fieldError('email')}
          placeholder="you@company.com"
        />

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error?.fieldError('password')}
          placeholder="••••••••"
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={mutation.isPending}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
