/** نصوص قيود الحساب — تجميد الشبكة/المنتدى وليس مسح الأعمال. */

export const ACCOUNT_FROZEN_CODE = 'ACCOUNT_FROZEN';
export const ACCOUNT_LOCKED_CODE = 'ACCOUNT_LOCKED';
export const FORUM_BANNED_CODE = 'FORUM_BANNED';

export function accountFrozenUserMessage(untilLabel?: string): string {
    const until = untilLabel?.trim() ? ` حتى ${untilLabel.trim()}` : '';
    return (
        `تم تجميد حسابك${until}. المنتدى والخدمات الشبكية موقوفة. ` +
        'يمكنك متابعة أعمالك المحلية في الدعاوى والمعاملات — لم تُحذف ولم تُمس.'
    );
}

export function accountUnfrozenUserMessage(): string {
    return 'أُعيد تفعيل حسابك من مقر القيادة. يمكنك استخدام المنتدى والخدمات الشبكية من جديد.';
}

export function accountLoginLockedUserMessage(untilLabel?: string): string {
    const until = untilLabel?.trim() ? ` حتى ${untilLabel.trim()}` : '';
    return `تم قفل الدخول إلى حسابك${until}. الدعاوى والمعاملات لم تُحذف.`;
}

export function accountLoginUnlockedUserMessage(): string {
    return 'أُعيد فتح الدخول إلى حسابك من مقر القيادة.';
}

export function accountDeletedUserMessage(): string {
    return 'أُقفل الحساب وأُخفي من الدليل. الدعاوى والمعاملات لم تُحذف.';
}

export function accountRestoredUserMessage(): string {
    return 'أُعيد الحساب إلى الدليل وفُتح الدخول من مقر القيادة.';
}

export function forumBannedUserMessage(): string {
    return 'تم حظرك من المنتدى. أعمالك في الدعاوى والمعاملات لم تُمس.';
}

export function forumUnbannedUserMessage(): string {
    return 'رُفع حظر المنتدى عن حسابك. يمكنك المشاركة من جديد.';
}

export function accountVerifiedUserMessage(): string {
    return 'اعتمد مقر القيادة توثيق حسابك. المنتدى والخدمات الشبكية مفتوحة.';
}

export function accountVerificationRejectedUserMessage(reason?: string): string {
    const detail = reason?.trim() ? ` السبب: ${reason.trim()}` : '';
    return `رُفض توثيق حسابك من مقر القيادة.${detail} يمكنك تصحيح البيانات وإعادة رفع هوية النقابة عبر الدعم.`;
}

export function accountPasswordResetUserMessage(): string {
    return 'غُيّرت كلمة مرورك من مقر القيادة. سجّل الدخول من جديد بالكلمة الجديدة.';
}

export function accountSessionsRevokedUserMessage(): string {
    return 'أُنهيت جلساتك من مقر القيادة. سجّل الدخول من جديد.';
}

export function accountRoleChangedUserMessage(roleLabel?: string): string {
    const role = roleLabel?.trim();
    return role
        ? `عُدّل دور حسابك من مقر القيادة إلى: ${role}.`
        : 'عُدّل دور حسابك من مقر القيادة.';
}

export function hqPostRemovedUserMessage(): string {
    return 'أزالت الإدارة منشورك من المنتدى.';
}

export function hqCommentRemovedUserMessage(): string {
    return 'أزالت الإدارة تعليقك من المنتدى.';
}

export function hqPostLockedUserMessage(): string {
    return 'أقفلت الإدارة النقاش على منشورك.';
}

export function hqPostUnlockedUserMessage(): string {
    return 'فُتح النقاش على منشورك من الإدارة.';
}

export function formatAccountUntilLabel(iso: string | null | undefined): string {
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

export function accountLoginDeniedPayload(restriction: {
    deleted?: boolean;
    loginUntil?: string | null;
}): { code: typeof ACCOUNT_LOCKED_CODE; error: string } {
    if (restriction.deleted) {
        return { code: ACCOUNT_LOCKED_CODE, error: accountDeletedUserMessage() };
    }
    const until = formatAccountUntilLabel(restriction.loginUntil);
    return { code: ACCOUNT_LOCKED_CODE, error: accountLoginLockedUserMessage(until || undefined) };
}
