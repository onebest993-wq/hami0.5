/**
 * مراقبة إيقاع الإطارات — يُفعّل data-hami-jank-guard عند هبوط مستمر
 * لإيقاف الحركات/الضبابية مؤقتاً دون تغيير بصري دائم.
 */

const JANK_FRAME_MS = 22; /** ~45fps */
const RECOVER_FRAME_MS = 17; /** ~58fps */
const BAD_FRAMES_TO_GUARD = 5;
const GOOD_FRAMES_TO_RELEASE = 48;

let rafId = 0;
let lastTs = 0;
let badStreak = 0;
let goodStreak = 0;
let guardActive = false;
let bound = false;

function setJankGuard(active: boolean): void {
    if (typeof document === 'undefined') return;
    guardActive = active;
    if (active) {
        document.documentElement.dataset.hamiJankGuard = '1';
    } else {
        delete document.documentElement.dataset.hamiJankGuard;
    }
}

function onVisibilityChange(): void {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
        document.documentElement.dataset.hamiPageHidden = '1';
        lastTs = 0;
        badStreak = 0;
        goodStreak = 0;
    } else {
        delete document.documentElement.dataset.hamiPageHidden;
        lastTs = 0;
    }
}

function tick(now: number): void {
    if (!bound || typeof document === 'undefined') return;

    if (document.hidden) {
        lastTs = 0;
        rafId = requestAnimationFrame(tick);
        return;
    }

    if (lastTs > 0) {
        const delta = now - lastTs;
        if (delta >= JANK_FRAME_MS) {
            badStreak += 1;
            goodStreak = 0;
            if (!guardActive && badStreak >= BAD_FRAMES_TO_GUARD) {
                setJankGuard(true);
            }
        } else if (delta <= RECOVER_FRAME_MS) {
            goodStreak += 1;
            badStreak = Math.max(0, badStreak - 1);
            if (guardActive && goodStreak >= GOOD_FRAMES_TO_RELEASE) {
                setJankGuard(false);
                badStreak = 0;
            }
        }
    }

    lastTs = now;
    rafId = requestAnimationFrame(tick);
}

/** يبدأ مراقبة rAF — يُستدعى بعد dashboard-interactive */
export function bindFramePacingGuard(): () => void {
    if (typeof window === 'undefined' || bound) return () => undefined;
    bound = true;
    lastTs = 0;
    badStreak = 0;
    goodStreak = 0;

    document.addEventListener('visibilitychange', onVisibilityChange);
    onVisibilityChange();

    rafId = requestAnimationFrame(tick);

    return () => {
        bound = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        lastTs = 0;
        badStreak = 0;
        goodStreak = 0;
        document.removeEventListener('visibilitychange', onVisibilityChange);
        delete document.documentElement.dataset.hamiPageHidden;
        setJankGuard(false);
    };
}

export function isFramePacingGuardActive(): boolean {
    return guardActive;
}

export function resetFramePacingGuardForTests(): void {
    bound = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastTs = 0;
    badStreak = 0;
    goodStreak = 0;
    guardActive = false;
    if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        delete document.documentElement.dataset.hamiJankGuard;
        delete document.documentElement.dataset.hamiPageHidden;
    }
}

/** إيقاف CSS animations أثناء تمرير الرئيسية */
export function bindHomeScrollPacing(el: HTMLElement | null): () => void {
    if (!el || typeof window === 'undefined') return () => undefined;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
        el.dataset.hamiScrolling = '1';
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            delete el.dataset.hamiScrolling;
            scrollTimer = null;
        }, 140);
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
        el.removeEventListener('scroll', onScroll);
        if (scrollTimer) clearTimeout(scrollTimer);
        delete el.dataset.hamiScrolling;
    };
}
