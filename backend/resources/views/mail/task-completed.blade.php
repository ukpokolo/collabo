@component('mail::message')
# A task assigned to you is done

**{{ $title }}** on *{{ $boardName }}* was marked done{{ $completedBy ? ' by '.$completedBy : '' }}.

@component('mail::button', ['url' => $url])
Open the task
@endcomponent

Thanks,<br>
{{ config('app.name') }}
@endcomponent
