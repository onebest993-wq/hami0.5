export const HQ_DOOR_SESSION_KEY = 'hami:hq-door:v1';

export type HqDoorSession = 'off' | 'open' | 'dev';

function canUseDevDoorSession(): boolean {
    return Boolean(import.meta.env.DEV);
}

export function readHqDoorSession(): HqDoorSession {
    if (typeof sessionStorage === 'undefined') return 'off';
    try {
        const raw = sessionStorage.getItem(HQ_DOOR_SESSION_KEY);
        if (raw === 'open') return 'open';
        if (raw === 'dev') return canUseDevDoorSession() ? 'dev' : 'off';
        return 'off';
    } catch {
        return 'off';
    }
}

export function restoreHqDoorEntry(): {
    unlocked: boolean;
    devBypass: boolean;
    sessionReady: boolean;
} {
    const session = readHqDoorSession();
    if (session === 'dev') {
        /* الباب مفتوح؛ النبض يُعاد إقلاعه حتى لا تُرسل /api/admin بلا كوكي */
        return { unlocked: true, devBypass: true, sessionReady: false };
    }
    if (session === 'open') {
        return { unlocked: true, devBypass: false, sessionReady: true };
    }
    return { unlocked: false, devBypass: false, sessionReady: false };
}

export function writeHqDoorSession(kind: 'open' | 'dev'): void {
    if (typeof sessionStorage === 'undefined') return;
    const stored = kind === 'dev' && !canUseDevDoorSession() ? 'open' : kind;
    try {
        sessionStorage.setItem(HQ_DOOR_SESSION_KEY, stored);
    } catch {
        /* ignore quota / private mode */
    }
}

export function clearHqDoorSession(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.removeItem(HQ_DOOR_SESSION_KEY);
    } catch {
        /* ignore */
    }
}
