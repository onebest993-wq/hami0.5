/**
 * Server-side WIFE rejection telemetry — structured logs + counters (no UX impact).
 * Optional: set SENTRY_DSN for server-side capture via Sentry envelope API (best-effort).
 */
export type WifeRejectReason = 'unauthorized_token' | 'signature_failed' | 'subject_missing' | 'rate_limited' | 'device_id_missing' | 'stolen_token' | 'cloned_token' | 'actor_binding_failed' | 'forum_banned' | 'forum_guest_write_denied' | 'forum_guest_read_denied' | 'execution_guest_denied' | 'csrf_store_unavailable';
export type WifeRejectMeta = {
    reason: WifeRejectReason;
    request?: Request;
    detail?: string;
    userId?: string;
};
type RejectionCounter = {
    reason: WifeRejectReason;
    count: number;
};
/** Record a WIFE/BFF auth rejection (fire-and-forget). */
export declare function recordWifeRejection(meta: WifeRejectMeta): void;
export declare function getWifeRejectionCounters(): RejectionCounter[];
export declare function resetWifeSecurityMonitorForTests(): void;
export {};
