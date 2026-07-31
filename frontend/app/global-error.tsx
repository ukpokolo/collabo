'use client';

/**
 * Last resort: catches failures in the root layout itself, so it must render
 * its own <html>/<body> and cannot rely on app styles or providers.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f8fafc',
          color: '#0f172a',
          padding: '1rem',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            Collabo failed to start
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 1.25rem' }}>
            An unexpected error stopped the app from rendering.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 6,
              border: 'none',
              background: '#7c3aed',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: '1rem', fontSize: '0.6875rem', color: '#94a3b8' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
