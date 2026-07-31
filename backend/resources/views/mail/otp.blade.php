@component('mail::message')
# {{ $isReset ? 'Reset your password' : 'Verify your email' }}

@if ($name)
Hi {{ $name }},
@endif

@if ($isReset)
Use this code to choose a new password:
@else
Use this code to finish setting up your Collabo account:
@endif

@component('mail::panel')
# {{ $code }}
@endcomponent

This code expires in **{{ $minutes }} minutes** and can only be used once.

If you didn't request this, you can safely ignore this email — nothing has changed on your account.

Thanks,<br>
{{ config('app.name') }}
@endcomponent
