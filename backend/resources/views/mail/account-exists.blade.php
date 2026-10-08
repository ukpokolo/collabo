@component('mail::message')
# You already have an account

@if ($name)
Hi {{ $name }},
@endif

Someone just tried to sign up for Collabo with this email address, but it already has an account, so nothing was created and nothing has changed.

If that was you, you can [sign in]({{ $loginUrl }}), or [reset your password]({{ $resetUrl }}) if you've forgotten it.

If it wasn't you, you can safely ignore this email.

Thanks,<br>
{{ config('app.name') }}
@endcomponent
