import { appendIncomingNotificationServer } from '@/app/services/notifications/notificationServerBlob';
import {
    accountDeletedUserMessage,
    accountFrozenUserMessage,
    accountLoginLockedUserMessage,
    accountLoginUnlockedUserMessage,
    accountPasswordResetUserMessage,
    accountRestoredUserMessage,
    accountRoleChangedUserMessage,
    accountSessionsRevokedUserMessage,
    accountUnfrozenUserMessage,
    accountVerificationRejectedUserMessage,
    accountVerifiedUserMessage,
    forumBannedUserMessage,
    forumUnbannedUserMessage,
    hqCommentRemovedUserMessage,
    hqPostLockedUserMessage,
    hqPostRemovedUserMessage,
    hqPostUnlockedUserMessage,
} from './accountRestrictionCopy.ts';
import { isPostgresUuidSubject } from './postgresUuidSubject.ts';

function formatUntil(iso: string | null | undefined): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    } catch {
        return date.toLocaleString('ar');
    }
}

/** لا يُعاد استخدام المفتاح — وإلا الدمج يبتلع التجميد/الحظر التالي بعد قراءة الإشعار. */
export function hqActionOccurrenceId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function hqDedupe(kind: string, userId: string, extra?: string): string {
    const tail = extra?.trim() ? `:${extra.trim()}` : '';
    return `hq:${kind}:${userId}:${hqActionOccurrenceId()}${tail}`;
}

async function appendHqSystemAlert(
    userId: string,
    copy: { title: string; message: string },
    dedupeKey: string,
): Promise<boolean> {
    const id = String(userId ?? '').trim();
    if (!id || !isPostgresUuidSubject(id)) return false;
    try {
        await appendIncomingNotificationServer(id, {
            title: copy.title,
            message: copy.message,
            type: 'system_alert',
            category: 'system',
            direction: 'incoming',
            dedupeKey,
        });
        return true;
    } catch {
        return false;
    }
}

export async function notifyHeadquartersAccountStatus(input: {
    userId: string;
    kind: 'frozen' | 'unfrozen' | 'login_locked' | 'login_unlocked' | 'deleted' | 'restored';
    durationHours?: number;
    freezeUntil?: string | null;
    loginUntil?: string | null;
}): Promise<void> {
    const freezeUntil = formatUntil(input.freezeUntil);
    const loginUntil = formatUntil(input.loginUntil);
    const copy =
        input.kind === 'unfrozen'
            ? { title: 'تفعيل الحساب', message: accountUnfrozenUserMessage() }
            : input.kind === 'login_locked'
              ? { title: 'قفل الدخول', message: accountLoginLockedUserMessage(loginUntil || undefined) }
              : input.kind === 'login_unlocked'
                ? { title: 'فتح الدخول', message: accountLoginUnlockedUserMessage() }
                : input.kind === 'deleted'
                  ? { title: 'إقفال الحساب', message: accountDeletedUserMessage() }
                  : input.kind === 'restored'
                    ? { title: 'استعادة الحساب', message: accountRestoredUserMessage() }
                    : { title: 'تجميد الحساب', message: accountFrozenUserMessage(freezeUntil || undefined) };
    await appendHqSystemAlert(input.userId, copy, hqDedupe(`account:${input.kind}`, input.userId));
}

export async function notifyHeadquartersForumStatus(input: {
    userId: string;
    kind: 'banned' | 'unbanned';
    reason?: string;
}): Promise<void> {
    const reason = String(input.reason ?? '').trim();
    const title = input.kind === 'banned' ? 'حظر المنتدى' : 'رفع حظر المنتدى';
    const bannedBody = reason
        ? `${forumBannedUserMessage()} السبب: ${reason}`
        : forumBannedUserMessage();
    const message = input.kind === 'unbanned' ? forumUnbannedUserMessage() : bannedBody;
    await appendHqSystemAlert(
        input.userId,
        { title, message },
        hqDedupe(`forum:${input.kind}`, input.userId),
    );
}

export async function notifyHeadquartersVerificationStatus(input: {
    userId: string;
    status: 'active' | 'rejected';
    rejectionReason?: string;
}): Promise<void> {
    const copy =
        input.status === 'active'
            ? { title: 'توثيق الحساب', message: accountVerifiedUserMessage() }
            : {
                  title: 'رفض التوثيق',
                  message: accountVerificationRejectedUserMessage(input.rejectionReason),
              };
    await appendHqSystemAlert(
        input.userId,
        copy,
        hqDedupe(`verify:${input.status}`, input.userId),
    );
}

export async function notifyHeadquartersCredentialStatus(input: {
    userId: string;
    kind: 'password_reset' | 'sessions_revoked';
}): Promise<void> {
    const copy =
        input.kind === 'password_reset'
            ? { title: 'تغيير كلمة المرور', message: accountPasswordResetUserMessage() }
            : { title: 'إنهاء الجلسات', message: accountSessionsRevokedUserMessage() };
    await appendHqSystemAlert(input.userId, copy, hqDedupe(`access:${input.kind}`, input.userId));
}

export async function notifyHeadquartersRoleStatus(input: {
    userId: string;
    role: string;
}): Promise<void> {
    const role = String(input.role ?? '').trim();
    const label = role === 'moderator' ? 'مشرف' : role === 'lawyer' ? 'محامٍ' : role;
    await appendHqSystemAlert(
        input.userId,
        { title: 'تغيير الدور', message: accountRoleChangedUserMessage(label) },
        hqDedupe('role', input.userId),
    );
}

export async function notifyHeadquartersModeration(input: {
    userId: string;
    kind: 'post_removed' | 'comment_removed' | 'post_locked' | 'post_unlocked';
    entityId?: string;
}): Promise<void> {
    const copy =
        input.kind === 'comment_removed'
            ? { title: 'حذف تعليق', message: hqCommentRemovedUserMessage() }
            : input.kind === 'post_locked'
              ? { title: 'قفل النقاش', message: hqPostLockedUserMessage() }
              : input.kind === 'post_unlocked'
                ? { title: 'فتح النقاش', message: hqPostUnlockedUserMessage() }
                : { title: 'حذف منشور', message: hqPostRemovedUserMessage() };
    await appendHqSystemAlert(
        input.userId,
        copy,
        hqDedupe(`mod:${input.kind}`, input.userId, input.entityId),
    );
}

export async function notifyHeadquartersSystemMessage(input: {
    userId: string;
    title: string;
    message: string;
    dedupeKey?: string;
}): Promise<boolean> {
    const userId = String(input.userId ?? '').trim();
    const title = String(input.title ?? '').trim();
    const message = String(input.message ?? '').trim();
    if (!userId || !title || !message) return false;
    const dedupeKey = input.dedupeKey?.trim() || hqDedupe('sys', userId);
    return appendHqSystemAlert(userId, { title, message }, dedupeKey);
}
