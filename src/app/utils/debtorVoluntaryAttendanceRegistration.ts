import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { getLocalTodayYmd, parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { buildDebtorNoticePatchForKey, buildDebtorSummonsMarkerPatchForKey } from '@/app/utils/noticeDebtorScope';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';

type DebtorVoluntaryAttendanceDeps = {
    executionData: ExecutionFile | null | undefined;
    debtorKey: string;
    primaryDebtorKeyResolved: string;
    notificationDateYmd?: string | null;
    memoAnchorDateYmd?: string | null;
    voluntaryAttendanceCount?: number;
    summoningRound?: number;
    nextTimelineId: () => string;
    setTimelineEvents?: Dispatch<SetStateAction<TimelineEvent[]>>;
    persistExecutionMerge?: (patch: Record<string, unknown>) => boolean | void;
    pushTimelineEvent?: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    showToast: (message: string, type?: string) => void;
};

export function registerDebtorVoluntaryAttendanceForDebtor(
    deps: DebtorVoluntaryAttendanceDeps,
): boolean {
    const file = deps.executionData;
    if (!file?.id) {
        deps.showToast('تعذر تسجيل الحضور — بيانات الإضبارة غير جاهزة.', 'error');
        return false;
    }

    const targetDebtorKey = String(deps.debtorKey || '').trim();
    if (!targetDebtorKey) {
        deps.showToast('تعذر تحديد المدين.', 'error');
        return false;
    }

    const targetIsPrimary = targetDebtorKey === deps.primaryDebtorKeyResolved;
    const nd =
        String(deps.memoAnchorDateYmd || deps.notificationDateYmd || file.debtorNotificationDate || '')
            .trim() || getLocalTodayYmd();
    const needsAnchorBackfill =
        !String(deps.memoAnchorDateYmd || '').trim() &&
        !String(deps.notificationDateYmd || '').trim() &&
        (targetIsPrimary ? !String(file.debtorNotificationDate || '').trim() : true);

    const nextVac = Math.max(0, Number(deps.voluntaryAttendanceCount) || 0) + 1;
    const nextRound = Math.max(1, Number(deps.summoningRound) || 1) + 1;
    const ndDisplay = parseLocalNotificationDate(String(nd)).toLocaleDateString('ar-EG');

    const attendEvent: TimelineEvent = {
        id: deps.nextTimelineId(),
        date: String(nd).slice(0, 10),
        timestamp: new Date().toISOString(),
        title: '🟢 تم حضور المدين',
        description: `مرجع تاريخ المذكرة/الإخبار: ${ndDisplay}.`,
        type: 'summons',
        source: 'التبليغ',
        metadata: {
            ...timelineDebtorMetadata(targetDebtorKey),
            timelineExpandedNote:
                'يُحتسب الحضور في سياق مذكرة الإخبار بالتنفيذ (وليس تاريخ الضغط على الزر). بعده يُتاح تسجيل تبليغ لاحق دون مهلة 7 أيام.',
        },
    };

    const mergePatch: Record<string, unknown> = {
        ...(needsAnchorBackfill && targetIsPrimary
            ? { execution_memo_anchor_date: nd, debtorNotificationDate: nd }
            : {}),
        ...buildDebtorNoticePatchForKey(file, targetDebtorKey, deps.primaryDebtorKeyResolved, {
            ...(needsAnchorBackfill ? { memoAnchorDate: nd, notificationDate: nd } : {}),
            activeNoticeState: null,
            voluntaryPeriodEndDeclared: true,
        }),
        ...buildDebtorSummonsMarkerPatchForKey(
            file,
            targetDebtorKey,
            deps.primaryDebtorKeyResolved,
            null,
        ),
        ...(targetIsPrimary
            ? {
                  debtorAttendedVoluntarily: true,
                  activeNoticeState: null,
                  voluntaryAttendanceCount: nextVac,
                  summoningRound: nextRound,
              }
            : {}),
    };

    if (
        typeof deps.setTimelineEvents === 'function' &&
        typeof deps.persistExecutionMerge === 'function'
    ) {
        let nextEvents: TimelineEvent[] = [];
        deps.setTimelineEvents((prev) => {
            nextEvents = [attendEvent, ...prev];
            return nextEvents;
        });
        const persisted = deps.persistExecutionMerge({
            ...mergePatch,
            timelineEvents: nextEvents,
        });
        if (persisted === false) {
            deps.showToast('تعذر مزامنة حضور المدين — أعد المحاولة.', 'error');
            return false;
        }
        deps.showToast('✅ تم تسجيل حضور المدين — يُتاح تبليغ لاحق وفق المسار', 'success');
        return true;
    }

    if (typeof deps.pushTimelineEvent === 'function') {
        deps.pushTimelineEvent(attendEvent, { mergePatch });
        deps.showToast('✅ تم تسجيل حضور المدين — يُتاح تبليغ لاحق وفق المسار', 'success');
        return true;
    }

    deps.showToast('تعذر تسجيل حضور المدين — أعد فتح مركز التبليغ.', 'error');
    return false;
}
