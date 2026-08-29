/** Phase C — أتعاب/مصاريف التخلية + تفعيل وعاء المطالبة */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { useStandardSubmit } from '@/app/hooks/useStandardSubmit';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    appendEvictionExecutorRequest,
    hasApprovedLawyerFeePayout,
} from '@/app/utils/executorSeizureDecisionQueue';
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';

export type EvictionCaseExpenseRow = {
    id: string;
    amount: number;
    note: string;
    date: string;
};

export type UseExecutionDashboardEvictionFinancialHandlersParams = {
    decisionsStorageExecutionId: string | undefined;
    parsedLawyerFees: number;
    lawyerFeeDisburseMode: string;
    lawyerFeeDisburseNotes: string;
    evictionExpenseAmount: string;
    evictionExpenseNote: string;
    evictionExpensePayMode: string;
    evictionCaseExpenses: EvictionCaseExpenseRow[];
    timelineEvents: TimelineEvent[];
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setEvictionAssetsTabUnlocked: Dispatch<SetStateAction<boolean>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setEvictionCaseExpenses: Dispatch<SetStateAction<EvictionCaseExpenseRow[]>>;
    setShowEvictionLawyerFeeModal: (show: boolean) => void;
    setLawyerFeeDisburseNotes: Dispatch<SetStateAction<string>>;
    setShowEvictionExpenseModal: (show: boolean) => void;
    setEvictionExpenseAmount: Dispatch<SetStateAction<string>>;
    setEvictionExpenseNote: Dispatch<SetStateAction<string>>;
    setEvictionExpensePayMode: Dispatch<SetStateAction<string>>;
};

export function useExecutionDashboardEvictionFinancialHandlers({
    decisionsStorageExecutionId,
    parsedLawyerFees,
    lawyerFeeDisburseMode,
    lawyerFeeDisburseNotes,
    evictionExpenseAmount,
    evictionExpenseNote,
    evictionExpensePayMode,
    evictionCaseExpenses,
    timelineEvents,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setEvictionAssetsTabUnlocked,
    setTimelineEvents,
    setEvictionCaseExpenses,
    setShowEvictionLawyerFeeModal,
    setLawyerFeeDisburseNotes,
    setShowEvictionExpenseModal,
    setEvictionExpenseAmount,
    setEvictionExpenseNote,
    setEvictionExpensePayMode,
}: UseExecutionDashboardEvictionFinancialHandlersParams) {
    const handleEvictionLedgerActivated = useCallback(() => {
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '📁 تم فتح وعاء المطالبة بالأتعاب والمصاريف',
            description:
                'فعّل المحامي مسار المطالبة بالأتعاب والمصاريف التنفيذية من المركز المالي (تخلية).',
            type: 'action',
            source: 'إدارة الأموال والمصاريف',
        };
        const next = [ev, ...timelineEvents];
        setTimelineEvents(next);
        toastAfterExecutionPersist(
            persistExecutionMerge({
                timelineEvents: next,
                eviction_assets_tab_unlocked: true,
            }),
            showToast,
            'تم فتح مسار المطالبة وتسجيله في السجل الزمني.',
        );
    }, [nextTimelineId, timelineEvents, persistExecutionMerge, showToast, setTimelineEvents]);

    const handleEvictionLawyerFeeRequest = useCallback(() => {
        const exId = decisionsStorageExecutionId;
        if (hasApprovedLawyerFeePayout(exId)) {
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
            return;
        }
        setShowEvictionLawyerFeeModal(true);
    }, [decisionsStorageExecutionId, showToast, setShowEvictionLawyerFeeModal]);

    const { runSubmit: runEvictionLawyerFeeSubmit } = useStandardSubmit({
        validationMessage: '',
        validate: () => {
            const exId = decisionsStorageExecutionId;
            if (hasApprovedLawyerFeePayout(exId)) {
                showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
                return false;
            }
            return true;
        },
        submit: () => {
            const exId = decisionsStorageExecutionId;
            const amt = parsedLawyerFees > 0 ? parsedLawyerFees.toLocaleString('ar-IQ') : '—';
            const modeAr =
                lawyerFeeDisburseMode === 'salary_fifth'
                    ? 'صرف من خُمس الراتب (المدين موظف)'
                    : lawyerFeeDisburseMode === 'settlement'
                      ? 'تسوية / أقساط باتفاق'
                      : 'دفعة واحدة / صفقة';
            const notes = lawyerFeeDisburseNotes.trim();
            const ok = appendEvictionExecutorRequest({
                executionId: exId,
                title: 'طلب صرف أتعاب محكومة للمحامي',
                body: `طلب صرف أتعاب محكومة يتحمّلها المدين.\nالمبلغ التقريبي: ${amt} د.ع.\nأسلوب الصرف المطلوب: ${modeAr}.${notes ? `\nملاحظات: ${notes}` : ''}`,
                requestKind: 'lawyer_fee_payout',
            });
            if (!ok) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return false;
            }
            setEvictionAssetsTabUnlocked(true);
            persistExecutionMerge({
                eviction_assets_tab_unlocked: true,
                eviction_lawyer_fee_requested: true,
            });
            return true;
        },
        onClose: () => {
            setShowEvictionLawyerFeeModal(false);
            setLawyerFeeDisburseNotes('');
        },
        successMessage:
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ',
        showToast,
    });

    const { runSubmit: runEvictionExpenseSubmit } = useStandardSubmit({
        validate: () => {
            const raw = evictionExpenseAmount.replace(/,/g, '').trim();
            const n = parseFloat(raw);
            return Number.isFinite(n) && n > 0;
        },
        validationMessage: 'أدخل مبلغاً صحيحاً',
        submit: () => {
            const raw = evictionExpenseAmount.replace(/,/g, '').trim();
            const n = parseFloat(raw);
            const row = {
                id: `evx_${Date.now()}`,
                amount: n,
                note: evictionExpenseNote.trim() || 'مصاريف إضبارة تخلية',
                date: getLocalTodayYmd(),
            };
            const nextExp = [row, ...evictionCaseExpenses];
            const tNow = new Date().toISOString();
            const payModeAr =
                evictionExpensePayMode === 'salary_fifth'
                    ? 'التحصيل من خُمس راتب المدين (موظف)'
                    : evictionExpensePayMode === 'installments'
                      ? 'أقساط / تسوية'
                      : 'دفعة واحدة';
            const evLine: TimelineEvent = {
                id: nextTimelineId(),
                type: 'payment',
                title: `💸 مصاريف إضبارة تخلية: ${n.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — أسلوب التحصيل المقترح: ${payModeAr}`,
                date: getLocalTodayYmd(),
                timestamp: tNow,
                source: 'إدارة الأموال — تخلية',
            };
            const nextTimeline = [evLine, ...timelineEvents];
            setEvictionCaseExpenses(nextExp);
            setTimelineEvents(nextTimeline);
            setEvictionAssetsTabUnlocked(true);
            setEvictionExpenseAmount('');
            setEvictionExpenseNote('');
            setEvictionExpensePayMode('lump_sum');
            persistExecutionMerge({
                eviction_case_expenses: nextExp,
                eviction_assets_tab_unlocked: true,
                timelineEvents: nextTimeline,
            });
            appendEvictionExecutorRequest({
                executionId: decisionsStorageExecutionId,
                title: `طلب تثبيت مصاريف إضبارة: ${n.toLocaleString('ar-IQ')} د.ع`,
                body: `تثبيت مصاريف إضبارة يتحمّلها المدين: ${row.note}.\nأسلوب التحصيل المقترح: ${payModeAr}.`,
                requestKind: 'case_expense',
            });
        },
        onClose: () => setShowEvictionExpenseModal(false),
        successMessage: 'تم التسجيل — راجع قرار المنفذ',
        showToast,
    });

    return {
        handleEvictionLedgerActivated,
        handleEvictionLawyerFeeRequest,
        runEvictionLawyerFeeSubmit,
        runEvictionExpenseSubmit,
    };
}
