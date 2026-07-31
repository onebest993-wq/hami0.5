import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { buildEmployeeAssignmentPatchForDebtorKey } from '@/app/utils/employeeSummonsAssignment';
import { buildDebtorSummonsMarkerPatchForKey } from '@/app/utils/noticeDebtorScope';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import {
    buildPublicationNoticePatchForDebtorKey,
    getActivePublicationNoticeForDebtorKey,
    publicationNoticeDeadlineYmd,
    PUBLICATION_NOTICE_DURATION_DAYS,
} from '@/app/utils/publicationNoticeDebtor';

export type PublicationNoticeRegisterInput = {
    publicationDateYmd: string;
    newspaper1: string;
    newspaper2: string;
};

type PublicationNoticeRegistrationDeps = {
    executionData: ExecutionFile | null | undefined;
    debtorKey: string;
    primaryDebtorKeyResolved: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (event: TimelineEvent) => void;
    showToast: (message: string, type?: string) => void;
};

export function registerPublicationNoticeForDebtor(
    deps: PublicationNoticeRegistrationDeps,
    input: PublicationNoticeRegisterInput,
): boolean {
    const file = deps.executionData;
    if (!file?.id) {
        deps.showToast('تعذر تسجيل التبليغ — بيانات الإضبارة غير جاهزة.', 'error');
        return false;
    }
    const dk = String(deps.debtorKey || '').trim();
    if (!dk) {
        deps.showToast('تعذر تحديد المدين.', 'error');
        return false;
    }
    if (getActivePublicationNoticeForDebtorKey(file, dk)) {
        deps.showToast('يوجد تبليغ بالنشر سارٍ لهذا المدين.', 'warning');
        return false;
    }

    const ts = new Date().toISOString();
    const deadline = publicationNoticeDeadlineYmd(input.publicationDateYmd);
    const state = {
        publicationDateYmd: input.publicationDateYmd,
        newspaper1: input.newspaper1,
        newspaper2: input.newspaper2,
        recordedAt: ts,
    };

    const event: TimelineEvent = {
        id: deps.nextTimelineId(),
        date: input.publicationDateYmd,
        timestamp: ts,
        title: '📰 تسجيل التبليغ بالنشر',
        description: `تاريخ النشر: ${input.publicationDateYmd}\nالجريدة ١: ${input.newspaper1}\nالجريدة ٢: ${input.newspaper2}\nمدة ${PUBLICATION_NOTICE_DURATION_DAYS} يوماً تقويمياً حتى ${deadline} (يبدأ الاحتساب من اليوم التالي لتاريخ النشر).`,
        type: 'notification',
        source: 'التبليغ',
        metadata: timelineDebtorMetadata(dk),
    };

    deps.persistExecutionMerge({
        ...buildPublicationNoticePatchForDebtorKey(file, dk, state),
        ...buildEmployeeAssignmentPatchForDebtorKey(file, dk, null, deps.primaryDebtorKeyResolved),
        ...buildDebtorSummonsMarkerPatchForKey(file, dk, deps.primaryDebtorKeyResolved, null),
    });
    deps.pushTimelineEvent(event);
    deps.showToast('تم تسجيل التبليغ بالنشر', 'success');
    return true;
}

export function terminatePublicationNoticeForDebtor(
    deps: PublicationNoticeRegistrationDeps,
): boolean {
    const file = deps.executionData;
    if (!file) return false;
    const dk = String(deps.debtorKey || '').trim();
    const cur = getActivePublicationNoticeForDebtorKey(file, dk);
    if (!cur) return false;

    const ts = new Date().toISOString();
    const event: TimelineEvent = {
        id: deps.nextTimelineId(),
        date: ts.slice(0, 10),
        timestamp: ts,
        title: '⏹ إنهاء التبليغ بالنشر',
        description: 'أُنهي مسار التبليغ بالنشر يدوياً.',
        type: 'notification',
        source: 'التبليغ',
        metadata: timelineDebtorMetadata(dk),
    };

    deps.persistExecutionMerge({
        ...buildPublicationNoticePatchForDebtorKey(file, dk, { ...cur, periodEndedAt: ts }),
    });
    deps.pushTimelineEvent(event);
    deps.showToast('تم إنهاء التبليغ بالنشر', 'info');
    return true;
}

export function markPublicationNoticeDebtorAttended(
    deps: PublicationNoticeRegistrationDeps,
): boolean {
    const file = deps.executionData;
    if (!file) return false;
    const dk = String(deps.debtorKey || '').trim();
    const cur = getActivePublicationNoticeForDebtorKey(file, dk);
    if (!cur) return false;

    const ts = new Date().toISOString();
    const event: TimelineEvent = {
        id: deps.nextTimelineId(),
        date: ts.slice(0, 10),
        timestamp: ts,
        title: '🟢 حضور المدين — تبليغ بالنشر',
        description: 'سُجّل حضور المدين أثناء مدة التبليغ بالنشر.',
        type: 'notification',
        source: 'التبليغ',
        metadata: timelineDebtorMetadata(dk),
    };

    deps.persistExecutionMerge({
        ...buildPublicationNoticePatchForDebtorKey(file, dk, null),
    });
    deps.pushTimelineEvent(event);
    deps.showToast('تم تسجيل الحضور وإنهاء دورة التبليغ بالنشر', 'success');
    return true;
}
