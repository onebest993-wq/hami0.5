const PREFERRED_GATE_MODE_KEY = 'hami:auth:preferred-gate-mode';

export type AuthGatePreferredMode = 'choice' | 'login' | 'register';

function readPreferredAuthGateMode(): AuthGatePreferredMode | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(PREFERRED_GATE_MODE_KEY);
        if (raw === 'login' || raw === 'register' || raw === 'choice') return raw;
    } catch {
        /* ignore */
    }
    return null;
}

export function setPreferredAuthGateMode(mode: AuthGatePreferredMode): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(PREFERRED_GATE_MODE_KEY, mode);
    } catch {
        /* ignore */
    }
}

/** يقرأ دون مسح — إعادة تركيب البوابة لا تُرجع المستخدم لشاشة الاختيار. */
export function peekPreferredAuthGateMode(): AuthGatePreferredMode | null {
    return readPreferredAuthGateMode();
}

export function consumePreferredAuthGateMode(): AuthGatePreferredMode | null {
    const mode = readPreferredAuthGateMode();
    if (!mode || typeof sessionStorage === 'undefined') return mode;
    try {
        sessionStorage.removeItem(PREFERRED_GATE_MODE_KEY);
    } catch {
        /* ignore */
    }
    return mode;
}
