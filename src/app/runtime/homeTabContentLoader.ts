/**
 * كاش HomeTabContent — يستبدل هيكل FirstPaint بعد وصول المقطع.
 * يُجهَّز تحت الغطاء عبر prepareHomeBootChrome حتى لا يُكشف هيكل ناقص.
 */
type HomeTabContentModule = typeof import('@/app/components/lawyer/dashboard/HomeTabContent');
type Listener = () => void;

let contentPromise: Promise<HomeTabContentModule> | null = null;
let cachedContent: HomeTabContentModule | null = null;
const listeners = new Set<Listener>();

function emitHomeTabContent(): void {
    for (const listener of listeners) listener();
}

export function getHomeTabContentSync(): HomeTabContentModule | null {
    return cachedContent;
}

export function subscribeHomeTabContent(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function ensureHomeTabContentPromise(): Promise<HomeTabContentModule> {
    if (!contentPromise) {
        contentPromise = import('@/app/components/lawyer/dashboard/HomeTabContent').then((mod) => {
            cachedContent = mod;
            emitHomeTabContent();
            return mod;
        });
    }
    return contentPromise;
}

export function prefetchHomeTabContent(): void {
    if (typeof window === 'undefined') return;
    void ensureHomeTabContentPromise().catch(() => undefined);
}

export function loadHomeTabContent(): Promise<HomeTabContentModule> {
    return ensureHomeTabContentPromise();
}
