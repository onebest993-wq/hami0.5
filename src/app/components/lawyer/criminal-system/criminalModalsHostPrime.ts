/**
 * تجهيز مسبق لـ ModalsHost — يُستدعى عند pointerdown/فتح أي مودال
 * حتى لا يضغط المستخدم على فراغ (Suspense fallback={null}).
 */
const listeners = new Set<() => void>();
let primed = false;

export function subscribeCriminalModalsHostPrime(listener: () => void): () => void {
    listeners.add(listener);
    if (primed) {
        try {
            listener();
        } catch {
            /* ignore */
        }
    }
    return () => {
        listeners.delete(listener);
    };
}

export function primeCriminalModalsHostMount(): void {
    primed = true;
    void import('./CriminalDashboardModalsHost').catch(() => undefined);
    listeners.forEach((listener) => {
        try {
            listener();
        } catch {
            /* ignore */
        }
    });
}

export function resetCriminalModalsHostPrimeForTests(): void {
    primed = false;
    listeners.clear();
}
