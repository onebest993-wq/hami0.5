import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';

type CaseSharePanelPartitions = {
    pendingIncoming: CaseShareRecord[];
    activeSessions: CaseShareRecord[];
    recentEnded: CaseShareRecord[];
    hasContent: boolean;
};

/** تقسيم مشاركات الإضبارة لعرض لوحة الإشعارات — مصدر واحد للبوابة والـ UI */
export function partitionCaseShareForPanel(
    shares: CaseShareRecord[],
    userId: string,
): CaseSharePanelPartitions {
    const pendingIncoming = shares.filter(
        (s) => s.recipientId === userId && s.status === 'pending',
    );
    const activeSessions = shares.filter(
        (s) => s.status === 'accepted' && (s.ownerId === userId || s.recipientId === userId),
    );
    const recentEnded = shares
        .filter((s) => s.status === 'ended' && (s.ownerId === userId || s.recipientId === userId))
        .slice(0, 5);
    return {
        pendingIncoming,
        activeSessions,
        recentEnded,
        hasContent:
            pendingIncoming.length > 0 || activeSessions.length > 0 || recentEnded.length > 0,
    };
}
