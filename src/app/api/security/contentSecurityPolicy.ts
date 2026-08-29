/**
 * Single source of truth for Content-Security-Policy (WIFE / Hami).
 * Dev: relaxed for Vite HMR. Production: strict — no unsafe-eval, no inline scripts.
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
    /* عامل pdf.js يُشحن معنا — لا أصل خارجي يُنفِّذ شيفرة فوق مستندات الموكّلين */
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
