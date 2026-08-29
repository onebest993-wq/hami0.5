import {
    isNotificationNavTarget,
    sanitizeNotificationActionPayload,
} from '@/app/services/notifications/notificationNavigateSecurity';

export type NotificationOwnedCaseLite = {
    id?: unknown;
    caseNo?: string;
};

export type NotificationOwnedNavigateInput = {
    path: string;
    payload: Record<string, unknown> | null;
    signedIn: boolean;
    lawsuitCases: readonly NotificationOwnedCaseLite[];
    executionCases: readonly NotificationOwnedCaseLite[];
    inboxPostIds: ReadonlySet<string>;
};

export type NotificationOwnedNavigateResult =
    | { kind: 'noop' }
    | { kind: 'schedule'; eventId?: string; date?: string }
    | { kind: 'open-lawsuit'; id: string }
    | { kind: 'open-execution'; id: string }
    | { kind: 'execution-home' }
    | { kind: 'lawsuit-home' }
    | { kind: 'community'; postId?: string }
    | { kind: 'vault' }
    | { kind: 'scan' };

function caseMatches(
    file: NotificationOwnedCaseLite,
    caseId: string,
    caseNo: string,
): boolean {
    if (caseId && String(file.id ?? '') === caseId) return true;
    if (caseNo && String(file.caseNo ?? '').trim() === caseNo) return true;
    return false;
}

function ownedId(file: NotificationOwnedCaseLite | undefined): string | null {
    if (!file) return null;
    const id = String(file.id ?? '').trim();
    return id || null;
}

export function collectInboxPostIds(
    notifications: ReadonlyArray<{ actionPayload?: Record<string, unknown> }>,
): Set<string> {
    const ids = new Set<string>();
    for (const item of notifications) {
        const postId = item.actionPayload?.postId;
        if (typeof postId === 'string' && postId) ids.add(postId);
    }
    return ids;
}

/**
 * تنقّل إشعار fail-closed: لا إضبارة إلا من ملفات المستخدم المحلية،
 * ولا postId منتدى إلا إن وُجد في صندوق هذا المستخدم، ولا أرشيف كبديل لمعرّف مجهول.
 */
export function resolveNotificationOwnedNavigate(
    input: NotificationOwnedNavigateInput,
): NotificationOwnedNavigateResult {
    if (!input.signedIn) return { kind: 'noop' };
    if (!isNotificationNavTarget(input.path)) return { kind: 'noop' };

    const payload = sanitizeNotificationActionPayload(input.payload);

    switch (input.path) {
        case 'schedule': {
            const eventId = typeof payload.eventId === 'string' ? payload.eventId : undefined;
            const date = typeof payload.date === 'string' ? payload.date : undefined;
            return { kind: 'schedule', eventId, date };
        }
        case 'case_details': {
            const caseId = typeof payload.caseId === 'string' ? payload.caseId : '';
            const caseNo = typeof payload.caseNo === 'string' ? payload.caseNo : '';
            if (!caseId && !caseNo) return { kind: 'noop' };
            const execution = input.executionCases.find((file) => caseMatches(file, caseId, caseNo));
            const executionId = ownedId(execution);
            if (executionId) return { kind: 'open-execution', id: executionId };
            const lawsuit = input.lawsuitCases.find((file) => caseMatches(file, caseId, caseNo));
            const lawsuitId = ownedId(lawsuit);
            if (lawsuitId) return { kind: 'open-lawsuit', id: lawsuitId };
            return { kind: 'noop' };
        }
        case 'execution_home':
            return { kind: 'execution-home' };
        case 'lawsuit_home':
            return { kind: 'lawsuit-home' };
        case 'community': {
            const postId = typeof payload.postId === 'string' ? payload.postId : undefined;
            return {
                kind: 'community',
                postId: postId && input.inboxPostIds.has(postId) ? postId : undefined,
            };
        }
        case 'scan_document':
            return { kind: 'scan' };
        case 'vault':
            return { kind: 'vault' };
        default:
            return { kind: 'noop' };
    }
}
