/**
 * Server-side WIFE rejection telemetry — structured logs + counters (no UX impact).
 * Optional: set SENTRY_DSN for server-side capture via Sentry envelope API (best-effort).
 */

export type WifeRejectReason =
  | 'unauthorized_token'
  | 'signature_failed'
  | 'subject_missing'
  | 'rate_limited'
  | 'device_id_missing'
  | 'stolen_token'
  | 'cloned_token'
  | 'actor_binding_failed'
  | 'forum_banned'
  | 'csrf_store_unavailable';

export type WifeRejectMeta = {
  reason: WifeRejectReason;
  request?: Request;
  detail?: string;
  userId?: string;
};

type RejectionCounter = { reason: WifeRejectReason; count: number };

const MAX_RECENT = 50;
const recentRejections: WifeRejectMeta[] = [];
const counterMap = new Map<WifeRejectReason, number>();

function isProduction(): boolean {
  return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

function requestPath(request?: Request): string {
  if (!request) return '';
  try {
    return new URL(request.url).pathname;
  } catch {
    return '';
  }
}

function requestMethod(request?: Request): string {
  return (request?.method ?? 'GET').toUpperCase();
}

function pushRecent(meta: WifeRejectMeta): void {
  recentRejections.push(meta);
  if (recentRejections.length > MAX_RECENT) recentRejections.shift();
  counterMap.set(meta.reason, (counterMap.get(meta.reason) ?? 0) + 1);
}

function logStructured(meta: WifeRejectMeta): void {
  const payload = {
    type: 'wife_rejection',
    reason: meta.reason,
    path: requestPath(meta.request),
    method: requestMethod(meta.request),
    detail: meta.detail ?? null,
    userId: meta.userId ?? null,
    ts: new Date().toISOString(),
  };
  if (isProduction()) {
    console.warn(JSON.stringify(payload));
  } else if (process.env.WIFE_LOG_REJECTIONS === 'true') {
    console.info('[WIFE rejection]', payload);
  }
}

async function captureSentryBestEffort(_meta: WifeRejectMeta): Promise<void> {
  const url = (process.env.WIFE_SECURITY_WEBHOOK_URL ?? '').trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'wife_rejection',
        reason: _meta.reason,
        path: requestPath(_meta.request),
        method: requestMethod(_meta.request),
        detail: _meta.detail ?? null,
        userId: _meta.userId ?? null,
        ts: new Date().toISOString(),
      }),
    });
  } catch {
    /* best effort */
  }
}

/** Record a WIFE/BFF auth rejection (fire-and-forget). */
export function recordWifeRejection(meta: WifeRejectMeta): void {
  pushRecent(meta);
  logStructured(meta);
  void captureSentryBestEffort(meta);
}

export function getWifeRejectionCounters(): RejectionCounter[] {
  return [...counterMap.entries()].map(([reason, count]) => ({ reason, count }));
}

export function resetWifeSecurityMonitorForTests(): void {
  recentRejections.length = 0;
  counterMap.clear();
}
