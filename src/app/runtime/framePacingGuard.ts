/**
 * Variable FPS Engine — إيقاع إطارات متكيّف مع الشاشة (60–120Hz عبر rAF)
 * ويتوقف عند 0 FPS عندما يكون الـ viewport ساكناً لتوفير البطارية.
 */
const JANK_FRAME_MS = 22; /** ~45fps */
const RECOVER_FRAME_MS = 17; /** ~58fps */
const BAD_FRAMES_TO_GUARD = 5;
const GOOD_FRAMES_TO_RELEASE = 48;
/** بعد سكون تفاعلي — أوقف حلقة rAF بالكامل (0 FPS) */
const IDLE_STOP_MS = 900;

let rafId = 0;
let lastTs = 0;
let badStreak = 0;
let goodStreak = 0;
let guardActive = false;
let bound = false;
let loopRunning = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let lastInteractionAt = 0;

function setJankGuard(active: boolean): void {
    if (typeof document === 'undefined') return;
    guardActive = active;
    if (active) {
        document.documentElement.dataset.hamiJankGuard = '1';
    } else {
        delete document.documentElement.dataset.hamiJankGuard;
    }
}

function setRenderIdle(idle: boolean): void {
    if (typeof document === 'undefined') return;
    if (idle) {
        document.documentElement.dataset.hamiRenderIdle = '1';
    } else {
        delete document.documentElement.dataset.hamiRenderIdle;
    }
}

function clearIdleTimer(): void {
    if (idleTimer != null) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
}

function stopLoop(): void {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    loopRunning = false;
    lastTs = 0;
    setRenderIdle(true);
}

function scheduleIdleStop(): void {
    clearIdleTimer();
    if (typeof document !== 'undefined' && document.hidden) {
        stopLoop();
        return;
    }
    idleTimer = setTimeout(() => {
        idleTimer = null;
        stopLoop();
    }, IDLE_STOP_MS);
}

function startLoop(): void {
    if (!bound || typeof window === 'undefined') return;
    if (typeof document !== 'undefined' && document.hidden) {
        stopLoop();
        return;
    }
    setRenderIdle(false);
    if (loopRunning) return;
    loopRunning = true;
    lastTs = 0;
    rafId = requestAnimationFrame(tick);
}

function noteInteraction(): void {
    lastInteractionAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    startLoop();
    scheduleIdleStop();
}

function onVisibilityChange(): void {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
        document.documentElement.dataset.hamiPageHidden = '1';
        clearIdleTimer();
        stopLoop();
        badStreak = 0;
        goodStreak = 0;
        return;
    }
    delete document.documentElement.dataset.hamiPageHidden;
    noteInteraction();
}

function tick(now: number): void {
    if (!bound || !loopRunning || typeof document === 'undefined') return;

    if (document.hidden) {
        stopLoop();
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

const INTERACTION_EVENTS = [
    'pointerdown',
    'pointermove',
    'wheel',
    'keydown',
    'touchstart',
    'touchmove',
    'scroll',
] as const;

/** يبدأ مراقبة rAF متغيّرة — تتوقف عند السكون (0 FPS) */
export function bindFramePacingGuard(): () => void {
    if (typeof window === 'undefined' || bound) return () => undefined;
    bound = true;
    lastTs = 0;
    badStreak = 0;
    goodStreak = 0;
    lastInteractionAt = 0;

    document.addEventListener('visibilitychange', onVisibilityChange);
    for (const evt of INTERACTION_EVENTS) {
        window.addEventListener(evt, noteInteraction, {
            passive: true,
            capture: evt === 'scroll',
        });
    }
    onVisibilityChange();
    noteInteraction();

    return () => {
        bound = false;
        clearIdleTimer();
        stopLoop();
        badStreak = 0;
        goodStreak = 0;
        document.removeEventListener('visibilitychange', onVisibilityChange);
        for (const evt of INTERACTION_EVENTS) {
            window.removeEventListener(evt, noteInteraction, {
                capture: evt === 'scroll',
            } as EventListenerOptions);
        }
        delete document.documentElement.dataset.hamiPageHidden;
        delete document.documentElement.dataset.hamiRenderIdle;
        setJankGuard(false);
    };
}

export function isFramePacingGuardActive(): boolean {
    return guardActive;
}

export function isFramePacingLoopRunning(): boolean {
    return loopRunning;
}

export function getFramePacingLastInteractionAt(): number {
    return lastInteractionAt;
}

export function resetFramePacingGuardForTests(): void {
    bound = false;
    clearIdleTimer();
    stopLoop();
    badStreak = 0;
    goodStreak = 0;
    guardActive = false;
    lastInteractionAt = 0;
    if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        for (const evt of INTERACTION_EVENTS) {
            window.removeEventListener(evt, noteInteraction, {
                capture: evt === 'scroll',
            } as EventListenerOptions);
        }
        delete document.documentElement.dataset.hamiJankGuard;
        delete document.documentElement.dataset.hamiPageHidden;
        delete document.documentElement.dataset.hamiRenderIdle;
    }
}

/** إيقاف CSS animations أثناء تمرير الرئيسية */
export function bindHomeScrollPacing(el: HTMLElement | null): () => void {
    if (!el || typeof window === 'undefined') return () => undefined;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
        el.dataset.hamiScrolling = '1';
        noteInteraction();
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
