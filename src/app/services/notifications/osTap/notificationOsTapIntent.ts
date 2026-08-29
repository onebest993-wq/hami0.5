import {
    isNotificationNavTarget,
    sanitizeNotificationActionPayload,
} from '@/app/services/notifications/notificationNavigateSecurity';
import { stashNotificationPanelFocusId } from '@/app/services/notifications/notificationPanelFocus';
import { HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT } from '@/app/services/notifications/notificationOsTapEvents';
import {
    extractOsNotificationFocusId,
    extractOsNotificationTapData,
    type OsNotificationTapIntent,
    type OsNotificationTapResolution,
} from '@/app/services/notifications/osTap/notificationOsTapExtract';

export type { OsNotificationTapIntent, OsNotificationTapResolution };

/**
 * يحوّل حمولة إشعار نظام التشغيل إلى مسار تنقّل مسموح + حمولة مُعقَّمة.
 */
export function resolveOsNotificationTapIntent(detail: unknown): OsNotificationTapIntent | null {
    const raw = extractOsNotificationTapData(detail);
    const type = typeof raw.type === 'string' ? raw.type.trim() : '';

    if (type === 'calendar-reminder' || type === 'calendar_reminder') {
        const payload = sanitizeNotificationActionPayload({
            eventId: raw.eventId,
            date: raw.date,
        });
        return { path: 'schedule', payload };
    }

    const explicitPath = typeof raw.path === 'string' ? raw.path.trim() : '';
    if (explicitPath === 'notifications') {
        return null;
    }
    if (explicitPath && isNotificationNavTarget(explicitPath)) {
        return {
            path: explicitPath,
            payload: sanitizeNotificationActionPayload(raw),
        };
    }

    const category = typeof raw.category === 'string' ? raw.category.trim() : '';
    if (
        category === 'forum' ||
        type === 'forum' ||
        type.startsWith('forum_') ||
        (typeof raw.forumType === 'string' && raw.forumType.trim())
    ) {
        return {
            path: 'community',
            payload: sanitizeNotificationActionPayload(raw),
        };
    }
    if (category === 'document' || type === 'new_document') {
        return {
            path: 'vault',
            payload: sanitizeNotificationActionPayload(raw),
        };
    }
    if ((category === 'ai' || type === 'ai_insight') && typeof raw.caseId === 'string' && raw.caseId.trim()) {
        return {
            path: 'case_details',
            payload: sanitizeNotificationActionPayload(raw),
        };
    }
    if (type === 'execution' || category === 'execution') {
        const caseId = typeof raw.caseId === 'string' ? raw.caseId.trim() : '';
        if (caseId) {
            return { path: 'case_details', payload: sanitizeNotificationActionPayload(raw) };
        }
        return {
            path: 'execution_home',
            payload: sanitizeNotificationActionPayload(raw),
        };
    }
    if (type === 'lawsuit' || category === 'civil' || category === 'criminal') {
        const caseId = typeof raw.caseId === 'string' ? raw.caseId.trim() : '';
        if (caseId) {
            return { path: 'case_details', payload: sanitizeNotificationActionPayload(raw) };
        }
        return {
            path: 'lawsuit_home',
            payload: sanitizeNotificationActionPayload(raw),
        };
    }

    return null;
}

/**
 * قرار موحّد: تنقّل ميزة و/أو فتح لوحة الإشعارات مع تركيز البطاقة.
 */
export function resolveOsNotificationTap(detail: unknown): OsNotificationTapResolution {
    const raw = extractOsNotificationTapData(detail);
    const focusNotificationId = extractOsNotificationFocusId(raw);
    const type = typeof raw.type === 'string' ? raw.type.trim() : '';
    const explicitPath = typeof raw.path === 'string' ? raw.path.trim() : '';
    const navigate = resolveOsNotificationTapIntent(detail);

    const explicitPanel =
        explicitPath === 'notifications' ||
        raw.openPanel === true ||
        raw.openPanel === 1 ||
        raw.openPanel === '1' ||
        raw.openPanel === 'true';

    const isPreview = type === 'os-preview';
    const hasMeaningfulPayload = Object.keys(raw).length > 0;

    const openPanel =
        !isPreview &&
        (explicitPanel || (!navigate && hasMeaningfulPayload) || Boolean(focusNotificationId && !navigate));

    return {
        navigate: explicitPanel ? null : navigate,
        openPanel,
        focusNotificationId,
    };
}

export function dispatchOsNotificationOpenPanel(focusNotificationId: string | null): void {
    if (typeof window === 'undefined') return;
    if (focusNotificationId) {
        stashNotificationPanelFocusId(focusNotificationId);
    }
    window.dispatchEvent(
        new CustomEvent(HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT, {
            detail: { notificationId: focusNotificationId },
        }),
    );
}
