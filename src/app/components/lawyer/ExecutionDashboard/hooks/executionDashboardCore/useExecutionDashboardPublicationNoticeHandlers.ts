// @ts-nocheck
/** التبليغ بالنشر — handlers محضر المتابعة والتبليغ الموحّد */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    buildEmployeeAssignmentPatchForDebtorKey,
} from '@/app/utils/employeeSummonsAssignment';
import { buildDebtorSummonsMarkerPatchForKey } from '@/app/utils/noticeDebtorScope';
import {
    buildPublicationNoticePatchForDebtorKey,
    getPublicationNoticeForDebtorKey,
    publicationNoticeDeadlineYmd,
    PUBLICATION_NOTICE_DURATION_DAYS,
} from '@/app/utils/publicationNoticeDebtor';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';

export type UseExecutionDashboardPublicationNoticeHandlersParams = {
    executionActionsGridLocked: boolean;
    executionData: ExecutionFile | null | undefined;
    unifiedSummonsTargetDebtorKey: string;
    primaryDebtorKeyResolved: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

export function useExecutionDashboardPublicationNoticeHandlers({
    executionActionsGridLocked,
    executionData,
    unifiedSummonsTargetDebtorKey,
    primaryDebtorKeyResolved,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
}: UseExecutionDashboardPublicationNoticeHandlersParams) {
    const lockedToast = useCallback(() => {
        showToast(
            '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.',
            'warning',
        );
    }, [showToast]);

    const handlePublicationNoticeRegister = useCallback(
        (p: { publicationDateYmd: string; newspaper1: string; newspaper2: string }) => {
            if (executionActionsGridLocked) {
                lockedToast();
                return;
            }
            const d = executionData;
            if (!d?.id) return;
            const dk = unifiedSummonsTargetDebtorKey;
            const existing = getPublicationNoticeForDebtorKey(d, dk);
            if (existing) {
                showToast('يوجد تبليغ بالنشر سارٍ لهذا المدين.', 'warning');
                return;
            }
            const ts = new Date().toISOString();
            const deadline = publicationNoticeDeadlineYmd(p.publicationDateYmd);
            const state = {
                publicationDateYmd: p.publicationDateYmd,
                newspaper1: p.newspaper1,
                newspaper2: p.newspaper2,
                recordedAt: ts,
            };
            setTimelineEvents((prev) => {
                const ev: TimelineEvent = {
                    id: nextTimelineId(),
                    date: p.publicationDateYmd,
                    timestamp: ts,
                    title: '📰 تسجيل التبليغ بالنشر',
                    description: `تاريخ النشر: ${p.publicationDateYmd}\nالجريدة ١: ${p.newspaper1}\nالجريدة ٢: ${p.newspaper2}\nمدة ${PUBLICATION_NOTICE_DURATION_DAYS} يوماً تقويمياً حتى ${deadline} (يبدأ الاحتساب من اليوم التالي لتاريخ النشر).`,
                    type: 'notification',
                    source: 'التبليغ',
                    metadata: timelineDebtorMetadata(dk),
                };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildPublicationNoticePatchForDebtorKey(d, dk, state),
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, dk, null, primaryDebtorKeyResolved),
                    ...buildDebtorSummonsMarkerPatchForKey(d, dk, primaryDebtorKeyResolved, null),
                    timelineEvents: next,
                });
                return next;
            });
            showToast('تم تسجيل التبليغ بالنشر', 'success');
        },
        [
            executionActionsGridLocked,
            executionData,
            lockedToast,
            nextTimelineId,
            persistExecutionMerge,
            primaryDebtorKeyResolved,
            showToast,
            setTimelineEvents,
            unifiedSummonsTargetDebtorKey,
        ],
    );

    const handlePublicationNoticeTerminate = useCallback(() => {
        if (executionActionsGridLocked) {
            lockedToast();
            return;
        }
        const d = executionData;
        if (!d) return;
        const dk = unifiedSummonsTargetDebtorKey;
        const cur = getPublicationNoticeForDebtorKey(d, dk);
        if (!cur) return;
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '⏹ إنهاء التبليغ بالنشر',
                description: 'أُنهي مسار التبليغ بالنشر يدوياً.',
                type: 'notification',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(dk),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildPublicationNoticePatchForDebtorKey(d, dk, { ...cur, periodEndedAt: ts }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التبليغ بالنشر', 'info');
    }, [
        executionActionsGridLocked,
        executionData,
        lockedToast,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        unifiedSummonsTargetDebtorKey,
    ]);

    const handlePublicationNoticeDebtorAttended = useCallback(() => {
        if (executionActionsGridLocked) {
            lockedToast();
            return;
        }
        const d = executionData;
        if (!d) return;
        const dk = unifiedSummonsTargetDebtorKey;
        const cur = getPublicationNoticeForDebtorKey(d, dk);
        if (!cur) return;
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '🟢 حضور المدين — تبليغ بالنشر',
                description: 'سُجّل حضور المدين أثناء مدة التبليغ بالنشر.',
                type: 'notification',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(dk),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildPublicationNoticePatchForDebtorKey(d, dk, null),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل الحضور وإنهاء دورة التبليغ بالنشر', 'success');
    }, [
        executionActionsGridLocked,
        executionData,
        lockedToast,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        unifiedSummonsTargetDebtorKey,
    ]);

    return {
        handlePublicationNoticeRegister,
        handlePublicationNoticeTerminate,
        handlePublicationNoticeDebtorAttended,
    };
}
