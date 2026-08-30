/**
 * تفريغ الخيط الرئيسي بين خطوات تحليل الشيفرة.
 *
 * `import()` على Capacitor يُحل من القرص فوراً ثم parse + compile على الـ main
 * thread. دفعة متوازية بعد المنزل = مهمة طويلة وتقطيع في التمرير، حتى بلا شبكة.
 * النية/الفتح لا تمرّ من هنا.
 *
 * الأصل: مهلة idle أطول حتى لا نبدأ التحليل التالي أثناء التمرير.
 * الشاشة مخفية: نوقف التحليل (CPU/حرارة) حتى تعود أو تنتهي مهلة الأمان.
 */
const WEB_IDLE_TIMEOUT_MS = 48;
const NATIVE_IDLE_TIMEOUT_MS = 160;
const HIDDEN_WARM_WAIT_MS = 10_000;

function isNativeShellDom(): boolean {
    return typeof document !== 'undefined' && document.documentElement.dataset.hamiNative === '1';
}

export function yieldToMainIdleTimeoutMs(): number {
    return isNativeShellDom() ? NATIVE_IDLE_TIMEOUT_MS : WEB_IDLE_TIMEOUT_MS;
}

function waitIfDocumentHidden(): Promise<void> {
    if (typeof document === 'undefined' || !document.hidden) return Promise.resolve();

    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            document.removeEventListener('visibilitychange', onVis);
            window.clearTimeout(timer);
            resolve();
        };
        const onVis = () => {
            if (!document.hidden) finish();
        };
        document.addEventListener('visibilitychange', onVis);
        const timer = window.setTimeout(finish, HIDDEN_WARM_WAIT_MS);
    });
}

function idleOnce(timeoutMs: number): Promise<{ timeRemaining?: () => number } | void> {
    const sched = (
        globalThis as { scheduler?: { yield?: () => Promise<void> } }
    ).scheduler;
    if (typeof sched?.yield === 'function') {
        return sched.yield();
    }

    if (typeof requestIdleCallback === 'function') {
        return new Promise((resolve) => {
            requestIdleCallback((deadline) => resolve(deadline), { timeout: timeoutMs });
        });
    }

    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

export async function yieldToMain(): Promise<void> {
    if (typeof window === 'undefined') return;
    await waitIfDocumentHidden();
    const timeoutMs = yieldToMainIdleTimeoutMs();
    const deadline = await idleOnce(timeoutMs);
    if (
        deadline &&
        typeof deadline.timeRemaining === 'function' &&
        deadline.timeRemaining() < 8
    ) {
        await idleOnce(timeoutMs);
    }
}

export async function runWarmSteps(
    steps: Array<() => void | Promise<unknown>>,
    isCancelled?: () => boolean,
): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
        if (isCancelled?.()) return;
        try {
            await steps[i]();
        } catch {
            /* تسخين أفضل-جهد */
        }
        if (i < steps.length - 1) {
            await yieldToMain();
        }
    }
}
