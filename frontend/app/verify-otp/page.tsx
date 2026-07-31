'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { OtpInput } from '@/components/auth/OtpInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { TextButton, TextLink } from '@/components/ui/TextLink';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';
import { useAuthSuccess } from '@/hooks/useSession';

function VerifyOtpForm() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const onSuccess = useAuthSuccess();

  const [code, setCode] = useState('');

  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(email, code),
    onSuccess: (result) => onSuccess(result),
  });

  const resend = useMutation({
    mutationFn: () => authApi.resendOtp(email, 'verify_email'),
    onSuccess: () => setCode(''),
  });

  const error = verify.error instanceof ApiError ? verify.error : undefined;
  const resendError = resend.error instanceof ApiError ? resend.error : undefined;

  if (!email) {
    return (
      <AuthLayout title="Verify your email">
        <Alert tone="error">
          No email address in the link. Start from <TextLink href="/signup">sign up</TextLink>.
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Enter your code"
      subtitle={
        <>
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. It
          expires in 10 minutes.
        </>
      }
      footer={<TextLink href="/login">Back to sign in</TextLink>}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          verify.mutate();
        }}
      >
        {error && !error.errors && <Alert tone="error">{error.message}</Alert>}
        {resend.isSuccess && !resendError && <Alert tone="success">{resend.data.message}</Alert>}

        <OtpInput
          value={code}
          onChange={setCode}
          disabled={verify.isPending}
          error={error?.fieldError('code')}
        />

        <Button type="submit" fullWidth loading={verify.isPending} disabled={code.length !== 6}>
          Verify and continue
        </Button>

        <div className="text-center">
          <TextButton
            onClick={() => resend.mutate()}
            disabled={resend.isPending}
            className="text-xs"
          >
            {resend.isPending ? 'Sending...' : "Didn't get it? Send a new code"}
          </TextButton>
          {resendError && (
            <p className="mt-1 text-xs text-danger-foreground">
              {resendError.status === 429
                ? 'Too many requests. Wait a minute and try again.'
                : resendError.message}
            </p>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<AuthLayout title="Enter your code">Loading...</AuthLayout>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
