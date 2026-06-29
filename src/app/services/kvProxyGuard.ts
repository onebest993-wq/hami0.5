/**
 * حارس طلبات kv-proxy — يمنع عاصفة الطلبات التي تجمد المتصفح
 */
import { debug } from '@/app/utils/debug';

type InFlightEntry = { promise: Promise<Response>; startedAt: number };

const WINDOW_MS = import.meta.env.DEV ? 10_000 : 12_000;
const MAX_REQUESTS_PER_WINDOW = import.meta.env.DEV ? 48 : 16;
const MAX_IN_FLIGHT = import.meta.env.DEV ? 8 : 6;
const DEV_RATE_LIMIT_WAIT_MS = 2_000;

let windowStart = 0;
let windowCount = 0;
const inFlight = new Map<string, InFlightEntry>();

function requestKey(url: string, method: string, body: string): string {
    return `${method}:${url}:${body}`;
}

function pruneWindow(now: number): void {
    if (now - windowStart > WINDOW_MS) {
        windowStart = now;
        windowCount = 0;
    }
}

export function resetKvProxyGuardForTests(): void {
    windowStart = 0;
    windowCount = 0;
    inFlight.clear();
}

export async function fetchKvProxyGuarded(
    url: string,
    init: RequestInit,
    nativeFetch: typeof fetch,
): Promise<Response> {
    const now = Date.now();
    pruneWindow(now);

    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? init.body : '';

    const key = requestKey(url, method, body);
    const existing = inFlight.get(key);
    if (existing) {
        return existing.promise;
    }

    const windowWaitStarted = Date.now();
    while (windowCount >= MAX_REQUESTS_PER_WINDOW) {
        const waitMs = Math.max(50, WINDOW_MS - (Date.now() - windowStart));
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 500)));
        pruneWindow(Date.now());
        if (windowCount < MAX_REQUESTS_PER_WINDOW) break;
        if (import.meta.env.DEV && Date.now() - windowWaitStarted < DEV_RATE_LIMIT_WAIT_MS) {
            continue;
        }
        if (import.meta.env.DEV) {
            debug.warn('[KvGuard] تجاوز حد kv-proxy — تم تخطي الطلب');
        }
        return new Response(JSON.stringify({ error: 'rate_limited', localOnly: true }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    while (inFlight.size >= MAX_IN_FLIGHT) {
        if (import.meta.env.DEV) {
            debug.warn('[KvGuard] طلبات kv-proxy متزامنة كثيرة — انتظار');
        }
        await Promise.race([...inFlight.values()].map((e) => e.promise)).catch(() => undefined);
        if (inFlight.size < MAX_IN_FLIGHT) break;
    }

    windowCount += 1;

    const promise = nativeFetch(url, init).finally(() => {
        inFlight.delete(key);
    });

    inFlight.set(key, { promise, startedAt: now });
    return promise;
}

export function isKvProxyUrl(url: string): boolean {
    return url.includes('/kv-proxy');
}
