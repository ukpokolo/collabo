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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
    onSuccess: () => {
      // The API deliberately answers the same way for unknown addresses, so
      // there is nothing here to branch on — just move to the code screen.
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 900);
    },
  });

  const error = mutation.error instanceof ApiError ? mutation.error : undefined;

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a 6-digit code."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        {error && !error.errors && (
          <Alert tone="error">
            {error.status === 429 ? 'Too many requests — wait a minute.' : error.message}
          </Alert>
        )}
        {mutation.isSuccess && <Alert tone="success">{mutation.data.message}</Alert>}

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

        <Button type="submit" fullWidth loading={mutation.isPending}>
          Send reset code
        </Button>
      </form>
    </AuthLayout>
  );
}
