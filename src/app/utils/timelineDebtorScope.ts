import type { TimelineEvent } from '@/app/types/execution';

/** مفتاح metadata يربط حدث السجل الزمني بمدين في ذمة مقسومة (يتوافق مع مفاتيح debtorWorkspace) */
export const TIMELINE_METADATA_DEBTOR_KEY = 'timelineDebtorKey' as const;

export function timelineDebtorMetadata(debtorWorkspaceKey: string): Record<string, string> {
    return { [TIMELINE_METADATA_DEBTOR_KEY]: String(debtorWorkspaceKey) };
}

/** هل يُعرض الحدث ضمن تبويب المدين النشط عند تعدد الخصوم غير التضامني */
export function timelineEventBelongsToDebtorWorkspace(
    e: TimelineEvent,
    activeDebtorKey: string,
    primaryDebtorWorkspaceKey: string
): boolean {
    const m = e.metadata as Record<string, unknown> | undefined;
    const dk =
        m && typeof m[TIMELINE_METADATA_DEBTOR_KEY] === 'string'
            ? String(m[TIMELINE_METADATA_DEBTOR_KEY])
            : null;
    if (dk == null || dk === '') {
        return activeDebtorKey === primaryDebtorWorkspaceKey;
    }
    return dk === activeDebtorKey;
}
