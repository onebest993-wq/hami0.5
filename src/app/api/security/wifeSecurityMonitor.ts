/**
 * Server-side WIFE rejection telemetry — structured logs + counters (no UX impact).
 * Optional: set SENTRY_DSN for server-side capture via Sentry envelope API (best-effort).
 */

import { isWifeProduction } from './wifeStoreEnv.ts';

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
  | 'forum_guest_write_denied'
  | 'forum_guest_read_denied'
  | 'forum_guest_admin_denied'
  | 'execution_guest_denied'
  | 'csrf_store_unavailable'
  | 'account_locked'
  | 'account_frozen';

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

function rejectionPayload(meta: WifeRejectMeta) {
  return {
    type: 'wife_rejection',
    reason: meta.reason,
    path: requestPath(meta.request),
    method: requestMethod(meta.request),
    detail: meta.detail ?? null,
    userId: meta.userId ?? null,
    ts: new Date().toISOString(),
  };
}

function logStructured(meta: WifeRejectMeta): void {
  const payload = rejectionPayload(meta);
  if (isWifeProduction()) {
    console.warn(JSON.stringify(payload));
  } else if (process.env.WIFE_LOG_REJECTIONS === 'true') {
    console.info('[WIFE rejection]', payload);
  }
}

async function captureSentryBestEffort(meta: WifeRejectMeta): Promise<void> {
  const url = (process.env.WIFE_SECURITY_WEBHOOK_URL ?? '').trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rejectionPayload(meta)),
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
