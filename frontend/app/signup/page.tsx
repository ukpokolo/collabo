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

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const mutation = useMutation({
    mutationFn: () => authApi.register(form),
    // No token yet — the account is unusable until the emailed code is entered.
    onSuccess: (result) => router.push(`/verify-otp?email=${encodeURIComponent(result.email)}`),
  });

  const error = mutation.error instanceof ApiError ? mutation.error : undefined;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="We'll email you a 6-digit code to confirm it's you."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
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
        {error && !error.errors && <Alert tone="error">{error.message}</Alert>}

        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          required
          value={form.name}
          onChange={update('name')}
          error={error?.fieldError('name')}
          placeholder="Ada Lovelace"
        />

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={update('email')}
          error={error?.fieldError('email')}
          placeholder="you@company.com"
        />

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update('password')}
          error={error?.fieldError('password')}
          hint="At least 8 characters, with a letter and a number."
        />

        <Field
          label="Confirm password"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          required
          value={form.password_confirmation}
          onChange={update('password_confirmation')}
          error={error?.fieldError('password_confirmation')}
        />

        <Button type="submit" fullWidth loading={mutation.isPending}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
