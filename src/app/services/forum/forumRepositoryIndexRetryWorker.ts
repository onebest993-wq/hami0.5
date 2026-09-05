import { flushForumRepositoryIndexQueue } from '@/app/services/forum/forumRepositoryIndexQueue';

/** فوري، ثم 2ث / 8ث / 20ث، وبعدها كل دقيقة طالما سطح المنتدى مفتوحاً. */
const RETRY_DELAYS_MS = [0, 2_000, 8_000, 20_000, 60_000] as const;

let stopActive: (() => void) | null = null;

export function startForumRepositoryIndexRetryWorker(): void {
    if (typeof window === 'undefined') return;
    if (stopActive) return;
    stopActive = runForumRepositoryIndexRetryWorker();
}

export function stopForumRepositoryIndexRetryWorker(): void {
    stopActive?.();
    stopActive = null;
}

function runForumRepositoryIndexRetryWorker(): () => void {
    let cancelled = false;
    let timer: number | null = null;
    let delayIndex = 0;

    const flush = () => {
        if (cancelled) return;
        void flushForumRepositoryIndexQueue();
    };

    const scheduleNext = () => {
        if (cancelled) return;
        const ms = RETRY_DELAYS_MS[Math.min(delayIndex, RETRY_DELAYS_MS.length - 1)]!;
        delayIndex += 1;
        timer = window.setTimeout(() => {
            timer = null;
            flush();
            scheduleNext();
        }, ms) as unknown as number;
    };

    const onOnline = () => flush();
    const onVisible = () => {
        if (document.visibilityState === 'visible') flush();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    scheduleNext();

    return () => {
        cancelled = true;
        if (timer !== null) window.clearTimeout(timer);
        timer = null;
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisible);
    };
}
