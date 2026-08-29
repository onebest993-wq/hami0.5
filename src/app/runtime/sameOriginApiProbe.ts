/**
 * كشف سريع: هل يوجد خادم /api على نفس النطاق؟
 * على Netlify static يُرجع index.html → unavailable → لا مهلة طويلة لكل طلب.
 */
/*
 * `bffAuthFlags` لا `bffAuthClient`: الثانية تُعيد تصدير هذه الدالّة حرفياً
 * (`export { isBffAuthEnabled } from './bffAuthFlags'`) وتستورد `SecureAPIClient`،
 * وذاك يستورد هذا الملفّ — فكان الاستيراد من المحور يُغلق دائرة على نواة الشبكة
 * والمصادقة: المسبار ← العميل ← المسبار.
 *
 * والدائرة هنا ليست مسألة ترتيب: عطل TDZ في هذه الحلقة يُسقط كل نداء API في
 * التطبيق، ووقع نظيره فعلاً في حلقة `executionDossierBlobPersistence` — دالّة سهم
 * `const` استُدعيت قبل تعريفها لأن الحلقة قلبت ترتيب التهيئة.
 *
 * الورقة تُستورد من الورقة. لا يتغيّر سلوك ولا هوية دالّة.
 *
 * ملاحظة: توفر الـ API لا يعتمد على VITE_BFF_AUTH ولا على فتح الواجهة بدون دخول.
 * فتح الشِل (`VITE_SHELL_AUTH_OPEN`) يتخطى بوابة الدخول فقط. إن وُجد `/api`
 * على نفس الأصل (Vite JSON healthz) يبقى التوقيع يعمل — وإلا تُعامل الاستضافة
 * الثابتة كـ unavailable بعد المسبار، لا قبله.
 */

export type SameOriginApiState = 'pending' | 'available' | 'unavailable';

/** healthz عام — لا يعتمد على جلسة؛ يميّز Vite/BFF عن استضافة SPA الثابتة */
const PROBE_PATH = '/api/public/healthz';
/** Vite قد يترجم route لأول مرة أبطأ من مهلة قصيرة */
const PROBE_TIMEOUT_MS = 5_000;
const PROBE_RETRIES = 1;

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

function isAbortError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const name = 'name' in error ? String((error as { name?: unknown }).name ?? '') : '';
    const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
    return name === 'AbortError' || /aborted|AbortError/i.test(message);
}

async function probeOnce(): Promise<SameOriginApiState> {
    let timer = 0;
    try {
        const timeout = new Promise<never>((_, reject) => {
            timer = window.setTimeout(() => {
                const err = new Error('probe timeout');
                err.name = 'AbortError';
                reject(err);
            }, PROBE_TIMEOUT_MS);
        });
        const res = await Promise.race([
            fetch(PROBE_PATH, {
                method: 'GET',
                credentials: 'include',
                headers: { Accept: 'application/json' },
            }),
            timeout,
        ]);
        const contentType = res.headers.get('content-type') ?? '';
        // JSON من الخادم = متاح. HTML = SPA ثابت بلا API.
        return contentType.includes('application/json') ? 'available' : 'unavailable';
    } finally {
        window.clearTimeout(timer);
    }
}

export async function probeSameOriginApi(): Promise<SameOriginApiState> {
    if (state !== 'pending') return state;
    if (typeof window === 'undefined') {
        state = 'unavailable';
        return state;
    }
    if (probePromise) return probePromise;

    probePromise = (async () => {
        let lastError: unknown = null;
        for (let attempt = 0; attempt <= PROBE_RETRIES; attempt += 1) {
            try {
                state = await probeOnce();
                return state;
            } catch (error) {
                lastError = error;
                // إجهاض مؤقت (مهلة/تنقّل) — أعد المحاولة قبل الحكم نهائياً
                if (attempt < PROBE_RETRIES && isAbortError(error)) {
                    await new Promise((resolve) => window.setTimeout(resolve, 200));
                    continue;
                }
                state = 'unavailable';
                return state;
            }
        }
        void lastError;
        state = 'unavailable';
        return state;
    })().finally(() => {
        probePromise = null;
    });

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
