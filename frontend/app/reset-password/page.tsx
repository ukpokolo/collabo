'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { OtpInput } from '@/components/auth/OtpInput';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { TextLink } from '@/components/ui/TextLink';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      authApi.resetPassword({ email, code, password, password_confirmation: confirmation }),
    // Resetting revokes every existing token, so there is no session to resume.
    onSuccess: () => setTimeout(() => router.push('/login'), 1200),
  });

  const error = mutation.error instanceof ApiError ? mutation.error : undefined;

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter the code we emailed you, then set a new password."
      footer={<TextLink href="/login">Back to sign in</TextLink>}
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
            {error.status === 429 ? 'Too many attempts. Wait a minute.' : error.message}
          </Alert>
        )}
        {mutation.isSuccess && (
          <Alert tone="success">{mutation.data.message} Redirecting you to sign in...</Alert>
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
        />

        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">Reset code</span>
          <OtpInput
            value={code}
            onChange={setCode}
            disabled={mutation.isPending}
            error={error?.fieldError('code')}
          />
        </div>

        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error?.fieldError('password')}
          hint="At least 8 characters, with a letter and a number."
        />

        <Field
          label="Confirm new password"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />

        <Button type="submit" fullWidth loading={mutation.isPending} disabled={code.length !== 6}>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthLayout title="Choose a new password">Loading...</AuthLayout>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
