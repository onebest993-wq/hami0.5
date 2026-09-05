import {
    isLitePerformanceActive,
    isMeteredOrSlowNetwork,
    isNativeShellStampedOnDom,
} from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import {
    peekLastOpenedSectionChunk,
    type SectionChunkId,
} from '@/app/runtime/sectionChunkRecency';

/**
 * سياسة تسخين الأقسام — عضو واحد في نواة المشروع بدل نسخ localOnly/prefetch/lite.
 * يقرأ اللقطة الخفيفة لا طبقة تطبيق الإعدادات (apply / إشعارات).
 */
export function isSectionBackgroundPrefetchAllowed(options?: {
    allowOnLite?: boolean;
    allowOnMetered?: boolean;
    allowOnLocalOnly?: boolean;
}): boolean {
    try {
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode && !options?.allowOnLocalOnly) return false;
        if (s.performance.prefetchScreens === false) return false;
        if (!options?.allowOnLite && isLitePerformanceActive(s.performance.litePerformance)) {
            return false;
        }
    } catch {
        /* ignore */
    }
    if (!options?.allowOnMetered && isMeteredNetworkConstrained()) {
        return false;
    }
    return true;
}

function isMeteredNetworkConstrained(): boolean {
    return typeof isMeteredOrSlowNetwork === 'function' && isMeteredOrSlowNetwork();
}

const LAST_OPENED_CHUNK_WARM = {
    allowOnLite: true,
    allowOnMetered: true,
    allowOnLocalOnly: true,
} as const;

/**
 * كِسرة آخر قسم — محلية. تعطيل prefetchScreens يمنعها.
 * الشبكة تُحجب داخل warmSectionData عند localOnly / lite / شبكة بطيئة.
 */
export function isRecencySectionWarmAllowed(): boolean {
    try {
        if (getLawyerSettingsSnapshot().performance.prefetchScreens === false) return false;
    } catch {
        /* default allow */
    }
    return true;
}

function isGuessworkWarmConstrained(): boolean {
    try {
        if (getLawyerSettingsSnapshot().security.localOnlyMode) return true;
    } catch {
        /* ignore */
    }
    if (isLitePerformanceActive()) return true;
    return isMeteredNetworkConstrained();
}

/**
 * خارج قيد الجهاز/الشبكة/المحلي: نعم.
 * على lite أو توفير بيانات / 2G–3G أو المحلي فقط: فقط آخر قسم فُتح.
 */
export function isSectionWarmAllowedWhenLite(id: SectionChunkId): boolean {
    if (!isGuessworkWarmConstrained()) return true;
    if (!isRecencySectionWarmAllowed()) return false;
    return peekLastOpenedSectionChunk() === id;
}

/**
 * JS لأقسام داخل القسم المفتوح (مستودع/مجموعات المنتدى).
 * ليس تخمين قسم آخر: الخفيف مسموح؛ توفير البيانات / 2G–3G لا.
 */
export function isOpenSectionInnerJsPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed({
        allowOnLite: true,
        allowOnLocalOnly: true,
    });
}

/** تسخين تخميني لآخر قسم — محلي. لا يفتح شبكة ولا موجة كاملة. */
export function isRecencyBackgroundWarmAllowed(id: SectionChunkId): boolean {
    if (!isRecencySectionWarmAllowed()) return false;
    if (peekLastOpenedSectionChunk() !== id) return false;
    return isSectionBackgroundPrefetchAllowed(LAST_OPENED_CHUNK_WARM);
}

/** كِسرة JS للمستودع — ليست شبكة سحابية. تُسخَّن مع الهوية حتى أول لمسة بعد الإقلاع. */
export function isRepositoryHubJsWarmAllowed(): boolean {
    try {
        if (getLawyerSettingsSnapshot().performance.prefetchScreens === false) return false;
    } catch {
        /* allow */
    }
    return true;
}

/**
 * كِسرة JS لمركز المعاملات (~90 ك.ب) — ليست سحابة.
 * تُسخَّن على lite/محلي؛ تُحجب فقط عند إيقاف prefetchScreens.
 */
export function isTransactionsHubJsWarmAllowed(): boolean {
    try {
        if (getLawyerSettingsSnapshot().performance.prefetchScreens === false) return false;
    } catch {
        /* allow */
    }
    return true;
}

/** تأخير idle بعد interactive — native غالباً 80ms؛ -1 = لا تُجدول. */
export function sectionBackgroundHydrateDelayMs(
    nativeDelayMs = 80,
    webDelayMs = 0,
    allowed = isSectionBackgroundPrefetchAllowed(),
): number {
    if (!allowed) return -1;
    if (isNativeShellStampedOnDom()) return nativeDelayMs;
    return webDelayMs;
}
