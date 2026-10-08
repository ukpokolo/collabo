<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gives every request an id that appears on each log line it produces (Laravel
 * adds Context to log records) and in the X-Request-Id response header, so "it
 * failed around 14:03" becomes one id you can search the logs for.
 */
class AddRequestContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = $this->idFrom($request) ?? (string) Str::uuid();

        Context::add('request_id', $id);

        $response = $next($request);
        $response->headers->set('X-Request-Id', $id);

        return $response;
    }

    /**
     * Honour an id sent by a proxy or caller, so one id can follow a request
     * across services. It ends up in logs and a response header, so anything
     * that is not a short token of safe characters is thrown away: a newline in
     * it would otherwise forge log lines.
     */
    private function idFrom(Request $request): ?string
    {
        $incoming = $request->headers->get('X-Request-Id');

        return is_string($incoming) && preg_match('/^[A-Za-z0-9._-]{8,64}$/', $incoming) ? $incoming : null;
    }
}
