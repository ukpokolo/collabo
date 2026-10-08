const isProd = process.env.NODE_ENV === 'production';

// The realtime client connects straight to Reverb (it cannot go through the
// rewrite proxy), so its origin has to be allowed in connect-src.
const reverbScheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'http';
const reverbHost = process.env.NEXT_PUBLIC_REVERB_HOST ?? 'localhost';
const reverbPort = process.env.NEXT_PUBLIC_REVERB_PORT ?? '8080';
const wsScheme = reverbScheme === 'https' ? 'wss' : 'ws';
const defaultPort = reverbScheme === 'https' ? '443' : '80';
const reverbOrigin = `${wsScheme}://${reverbHost}${reverbPort === defaultPort ? '' : `:${reverbPort}`}`;

/**
 * The auth token lives in localStorage, so the directive that matters most is
 * connect-src: if a script ever did run, it still could not send the token to
 * a server we did not list. script-src keeps 'unsafe-inline' because Next's own
 * bootstrap is inline and a nonce would force every page to render dynamically;
 * revisit that if the app grows pages that render user-supplied HTML.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${reverbOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Browsers ignore HSTS over plain http, so this is inert in local dev.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
      {
        source: '/broadcasting/auth',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
      },
    ];
  },
};

export default nextConfig;
