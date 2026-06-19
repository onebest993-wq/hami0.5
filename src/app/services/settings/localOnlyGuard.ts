import { getLawyerSettingsSnapshot } from './settingsRuntime';
import type { AppSettingsState } from './types';

let localOnlyBypassDepth = 0;

/** يسمح باستدعاءات الشبكة مؤقتاً (مثل مسح البيانات السحابية أثناء «قطع الاتصال»). */
export async function runBypassingLocalOnly<T>(fn: () => Promise<T>): Promise<T> {
    localOnlyBypassDepth += 1;
    try {
        return await fn();
    } finally {
        localOnlyBypassDepth -= 1;
    }
}

export class LocalOnlyNetworkError extends Error {
    constructor(message = 'local-only-mode') {
        super(message);
        this.name = 'LocalOnlyNetworkError';
    }
}

export function isLocalOnlyModeEnabled(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    if (localOnlyBypassDepth > 0) return false;
    return settings.security.localOnlyMode === true;
}

/** هل يُسمح بهذا الرابط أثناء وضع قطع الاتصال؟ */
export function isNetworkUrlAllowed(url: string, settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    if (localOnlyBypassDepth > 0) return true;
    if (!isLocalOnlyModeEnabled(settings)) return true;
    if (typeof window === 'undefined') return true;

    const resolved = new URL(url, window.location.origin);
    if (resolved.origin !== window.location.origin) return false;
    if (resolved.pathname.startsWith('/api/')) return false;

    return true;
}

export function assertNetworkAllowed(url: string, settings?: AppSettingsState): void {
    if (!isNetworkUrlAllowed(url, settings)) {
        throw new LocalOnlyNetworkError('قطع الاتصال مفعّل — العمل محلياً فقط');
    }
}
