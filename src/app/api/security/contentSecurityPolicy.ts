/**
 * Single source of truth for Content-Security-Policy (WIFE / Hami).
 * Dev: relaxed for Vite HMR. Production: strict أ¢â‚¬â€‌ no unsafe-eval, no inline scripts.
 */


export type CspMode = 'development' | 'production' | 'e2e-preview';

export function buildContentSecurityPolicy(mode: CspMode): string {
  const isDev = mode === 'development';
  const isE2ePreview = mode === 'e2e-preview';

  const connectSrc = [
    "'self'",
    'blob:',
    'data:',
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://sentry.io',
    'https://*.ingest.sentry.io',
    'https://*.ingest.us.sentry.io',
  ];
  if (isDev || isE2ePreview) {
    connectSrc.push('http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*');
  }

  const scriptSrc = isDev
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.sentry-cdn.com']
    : ["'self'", 'https://js.sentry-cdn.com'];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    /* ط·آ¹ط·آ§ط¸â€¦ط¸â€‍ pdf.js ط¸ظ¹ط¸عˆط·آ´ط·آ­ط¸â€  ط¸â€¦ط·آ¹ط¸â€ ط·آ§ أ¢â‚¬â€‌ ط¸â€‍ط·آ§ ط·آ£ط·آµط¸â€‍ ط·آ®ط·آ§ط·آ±ط·آ¬ط¸ظ¹ ط¸ظ¹ط¸عˆط¸â€ ط¸ظ¾ط¸ع¯ط¸â€کط·آ° ط·آ´ط¸ظ¹ط¸ظ¾ط·آ±ط·آ© ط¸ظ¾ط¸ث†ط¸â€ڑ ط¸â€¦ط·آ³ط·ع¾ط¸â€ ط·آ¯ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط¸ئ’ط¸â€کط¸â€‍ط¸ظ¹ط¸â€  */
    "worker-src 'self' blob:",
    ...(isDev || isE2ePreview ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function resolveCspMode(nodeEnv?: string, viteMode?: string): CspMode {
  const env = (nodeEnv ?? process.env.NODE_ENV ?? '').toLowerCase();
  const mode = (viteMode ?? '').toLowerCase();
  if (env === 'development' || mode === 'development') return 'development';
  return 'production';
}


