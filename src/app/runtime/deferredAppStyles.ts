let scheduled = false;
let loaded = false;
let loadPromise: Promise<void> | null = null;

function startDeferredAppStylesLoad(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (loaded) return Promise.resolve();
    if (loadPromise) return loadPromise;

    scheduled = true;
    loadPromise = import('@/styles/deferred-app.css')
        .then(() => {
            loaded = true;
            try {
                document.documentElement.dataset.hamiDeferredApp = '1';
            } catch {
                /* ignore */
            }
        })
        .catch(() => {
            loadPromise = null;
        });

    return loadPromise ?? Promise.resolve();
}

/**
 * يحمّل Tailwind + حراسات runtime + lawyerHomeFx الكامل.
 * يبدأ من preamble تحت الغطاء؛ content-ready احتياطي — لا من index.html.
 */
export function scheduleDeferredAppStyles(): void {
    if (scheduled || loaded || typeof window === 'undefined') return;
    scheduled = true;
    void startDeferredAppStylesLoad();
}

/** ينتظر اكتمال deferred-app (أو يفشل بهدوء) — لكشف الإقلاع بعد استقرار الشكل */
export function ensureDeferredAppStylesLoaded(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (loaded) return Promise.resolve();
    scheduled = true;
    return startDeferredAppStylesLoad();
}

export function isDeferredAppStylesLoaded(): boolean {
    return loaded;
}

export function resetDeferredAppStylesForTests(): void {
    scheduled = false;
    loaded = false;
    loadPromise = null;
    try {
        if (typeof document !== 'undefined') {
            delete document.documentElement.dataset.hamiDeferredApp;
        }
    } catch {
        /* ignore */
    }
}
