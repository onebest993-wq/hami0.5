/**
 * كشف سريع: هل يوجد خادم /api على نفس النطاق؟
 * على Netlify static يُرجع index.html → unavailable → لا مهلة 12ث لكل طلب.
 */
import { isBffAuthEnabled } from '@/app/utils/bffAuthClient';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';

export type SameOriginApiState = 'pending' | 'available' | 'unavailable';

const PROBE_PATH = '/api/auth/session';
const PROBE_TIMEOUT_MS = 2_000;

let state: SameOriginApiState = 'pending';
let probePromise: Promise<SameOriginApiState> | null = null;

export function getSameOriginApiState(): SameOriginApiState {
    return state;
}

export function isSameOriginApiBlocked(): boolean {
    return state === 'unavailable';
}

export function isSameOriginApiAvailable(): boolean {
    return state === 'available';
}

export async function probeSameOriginApi(): Promise<SameOriginApiState> {
    if (state !== 'pending') return state;
    if (typeof window === 'undefined') {
        state = 'unavailable';
        return state;
    }
    if (!isBffAuthEnabled() || isShellAuthBypassed()) {
        state = 'unavailable';
        return state;
    }
    if (probePromise) return probePromise;

    probePromise = (async () => {
        try {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
            const res = await fetch(PROBE_PATH, {
                method: 'GET',
                credentials: 'include',
                signal: controller.signal,
                headers: { Accept: 'application/json' },
            });
            window.clearTimeout(timer);
            const contentType = res.headers.get('content-type') ?? '';
            state = res.ok && contentType.includes('application/json') ? 'available' : 'unavailable';
        } catch {
            state = 'unavailable';
        } finally {
            probePromise = null;
        }
        return state;
    })();

    return probePromise;
}

export async function whenSameOriginApiReady(): Promise<boolean> {
    if (state === 'available') return true;
    if (state === 'unavailable') return false;
    return (await probeSameOriginApi()) === 'available';
}

/** للاختبارات فقط */
export function resetSameOriginApiProbeForTests(): void {
    state = 'pending';
    probePromise = null;
}
