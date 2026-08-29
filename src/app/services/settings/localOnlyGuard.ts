import { getLawyerSettingsSnapshot } from './settingsSnapshot';
import type { AppSettingsState } from './types';
import {
    isAllowlistedTransactionUrl,
    isUrlPermittedUnderLocalOnly,
    LocalOnlyNetworkError,
    LOCAL_ONLY_BYPASS_PATHS,
    readLocalOnlyBootFlag,
    resolveAppOrigin,
} from './localOnlyUrlPolicy';

export { LocalOnlyNetworkError, LOCAL_ONLY_BYPASS_PATHS, LOCAL_ONLY_SESSION_PATHS } from './localOnlyUrlPolicy';

const localOnlyBypassedUrls = new Map<string, number>();

function canonicalNetworkUrl(url: string): string {
    if (typeof window === 'undefined') return url;
    return new URL(url, window.location.origin).href;
}

function isAllowlistedBypassUrl(url: string): boolean {
    try {
        if (typeof window === 'undefined') {
            const path = url.split('?')[0]?.split('#')[0] ?? url;
            return (LOCAL_ONLY_BYPASS_PATHS as readonly string[]).includes(path);
        }
        return isAllowlistedTransactionUrl(url, window.location.origin);
    } catch {
        return false;
    }
}

/**
 * يسمح بعنوان واحد مع بقاء العزل على كل طلب موازٍ.
 * يرفض أي عنوان خارج قائمة المسارات المعتمدة.
 */
export async function runBypassingLocalOnlyForUrl<T>(url: string, fn: () => Promise<T>): Promise<T> {
    if (!isAllowlistedBypassUrl(url)) {
        throw new LocalOnlyNetworkError('قطع الاتصال مفعّل — مسار غير مسموح');
    }
    const canonical = canonicalNetworkUrl(url);
    localOnlyBypassedUrls.set(canonical, (localOnlyBypassedUrls.get(canonical) ?? 0) + 1);
    try {
        return await fn();
    } finally {
        const remaining = (localOnlyBypassedUrls.get(canonical) ?? 1) - 1;
        if (remaining <= 0) localOnlyBypassedUrls.delete(canonical);
        else localOnlyBypassedUrls.set(canonical, remaining);
    }
}

export function isLocalOnlyModeEnabled(settings?: AppSettingsState): boolean {
    try {
        if (typeof document !== 'undefined') {
            const flag = document.documentElement.dataset.hamiLocalOnly;
            if (flag === '1') return true;
            if (readLocalOnlyBootFlag()) return true;
            if (flag === '0' && settings === undefined) return false;
        }
    } catch {
        /* ignore */
    }
    if (readLocalOnlyBootFlag()) return true;
    return (settings ?? getLawyerSettingsSnapshot()).security.localOnlyMode === true;
}

/** متون القوانين من المقر تحتاج خادماً — لا تُطلب عند قطع الاتصال */
export function canReachPublishedLawCatalog(): boolean {
    return !isLocalOnlyModeEnabled();
}

export function isSrcsetNetworkAllowed(srcset: string, settings?: AppSettingsState): boolean {
    const urls = srcset
        .split(',')
        .map((part) => part.trim().split(/\s+/)[0])
        .filter((token): token is string => Boolean(token));
    if (urls.length === 0) return true;
    return urls.every((token) => isNetworkUrlAllowed(token, settings));
}

/** هل يُسمح بهذا الرابط أثناء وضع قطع الاتصال؟ */
export function isNetworkUrlAllowed(url: string, settings?: AppSettingsState): boolean {
    if (!isLocalOnlyModeEnabled(settings)) return true;
    if (typeof window === 'undefined') return false;
    return isUrlPermittedUnderLocalOnly(url, resolveAppOrigin(), localOnlyBypassedUrls);
}

export function assertNetworkAllowed(url: string, settings?: AppSettingsState): void {
    if (!isNetworkUrlAllowed(url, settings)) {
        throw new LocalOnlyNetworkError('قطع الاتصال مفعّل — العمل محلياً فقط');
    }
}
