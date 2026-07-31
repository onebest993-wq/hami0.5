/**
 * تسخين فهرس إضابير التنفيذ مبكراً (عند جاهزية اللوحة / نية الـ hub)
 * حتى يكون أول فتح للمخزن بلا «جاري تحميل الإضابير».
 */
type EagerHydrateResult = {
    owner: string | null;
    key: string;
    rows: unknown[];
};

function normalizeOwner(userId: string | null | undefined): string | null {
    const id = String(userId ?? '').trim();
    return id || null;
}

const EAGER_HYDRATE_TIMEOUT_MS = 12_000;

let inFlight: { owner: string | null; promise: Promise<EagerHydrateResult> } | null = null;
let lastResult: EagerHydrateResult | null = null;

export function resetExecutionFilesEagerHydrateForTests(): void {
    inFlight = null;
    lastResult = null;
}

export function getExecutionFilesEagerHydrateIfReady(
    userId: string | null | undefined,
): EagerHydrateResult | null {
    const owner = normalizeOwner(userId);
    if (lastResult && lastResult.owner === owner) return lastResult;
    return null;
}

export function startExecutionFilesEagerHydrate(userId: string | null | undefined): void {
    if (typeof window === 'undefined') return;
    const owner = normalizeOwner(userId);
    if (lastResult && lastResult.owner === owner) return;
    if (inFlight && inFlight.owner === owner) return;

    inFlight = {
        owner,
        promise: import('@/app/utils/executionFilesStorage')
            .then((m) => m.hydrateExecutionFilesStorageForOwner(userId))
            .then((hydrated) => {
                const result: EagerHydrateResult = {
                    owner,
                    key: hydrated.key,
                    rows: hydrated.rows,
                };
                lastResult = result;
                if (inFlight?.owner === owner) inFlight = null;
                return result;
            })
            .catch(() => {
                if (inFlight?.owner === owner) inFlight = null;
                const empty: EagerHydrateResult = { owner, key: '', rows: [] };
                lastResult = empty;
                return empty;
            }),
    };
}

export function awaitExecutionFilesEagerHydrate(
    userId: string | null | undefined,
    timeoutMs = EAGER_HYDRATE_TIMEOUT_MS,
): Promise<EagerHydrateResult> {
    const owner = normalizeOwner(userId);
    const ready = getExecutionFilesEagerHydrateIfReady(userId);
    if (ready) return Promise.resolve(ready);

    const hydratePromise = (() => {
        startExecutionFilesEagerHydrate(userId);
        if (inFlight && inFlight.owner === owner) return inFlight.promise;
        // fallback — سباق نادر
        return import('@/app/utils/executionFilesStorage')
            .then(async (m) => {
                const hydrated = await m.hydrateExecutionFilesStorageForOwner(userId);
                const result: EagerHydrateResult = {
                    owner,
                    key: hydrated.key,
                    rows: hydrated.rows,
                };
                lastResult = result;
                return result;
            })
            .catch(() => {
                const empty: EagerHydrateResult = { owner, key: '', rows: [] };
                lastResult = empty;
                return empty;
            });
    })();

    if (timeoutMs <= 0) return hydratePromise;

    const timeoutPromise = new Promise<EagerHydrateResult>((resolve) => {
        setTimeout(() => resolve({ owner, key: '', rows: [] }), timeoutMs);
    });

    return Promise.race([hydratePromise, timeoutPromise]);
}

/** بعد إنشاء/حفظ إضبارة — أبطل الكاش حتى لا يُعاد عرض قائمة قديمة */
export function invalidateExecutionFilesEagerHydrate(): void {
    lastResult = null;
    inFlight = null;
}
