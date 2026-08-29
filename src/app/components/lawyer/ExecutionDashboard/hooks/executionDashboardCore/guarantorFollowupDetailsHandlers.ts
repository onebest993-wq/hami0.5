import { useCallback } from 'react';
import type { Creditor } from '@/app/types/execution';
import {
    patchExecutorDecisionRow,
    supersedeGuarantorRequestDecisionsForExecution,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { UseExecutionDashboardGuarantorFollowupHandlersParams } from './useExecutionDashboardGuarantorFollowupHandlers.types';

type DetailsParams = Pick<
    UseExecutionDashboardGuarantorFollowupHandlersParams,
    | 'decisionsStorageExecutionId'
    | 'executionData'
    | 'executionId'
    | 'nextTimelineId'
    | 'pushTimelineEvent'
    | 'persistExecutionMerge'
    | 'showToast'
    | 'executionDataRef'
    | 'persistExecutionMergeRef'
    | 'guarantorDetailsDecisionId'
    | 'setGuarantorDetailsDecisionId'
>;

export function useGuarantorFollowupDetailsHandlers(p: DetailsParams) {
    const archiveAndClearGuarantor = useCallback(
        (reason: 'replace' | 'unlink') => {
            const gf = p.executionData?.guarantor_followup;
            if (!gf) return;
            const archivedAt = new Date().toISOString();
            const prevHist = Array.isArray(p.executionData?.guarantor_followup_history)
                ? p.executionData?.guarantor_followup_history
                : [];
            p.persistExecutionMerge({
                guarantor_followup: null,
                hasGuarantor: false,
                guarantor_followup_history: [{ ...gf, archivedAt }, ...prevHist],
            });
            supersedeGuarantorRequestDecisionsForExecution(p.decisionsStorageExecutionId);
            p.pushTimelineEvent({
                id: p.nextTimelineId(),
                date: archivedAt.slice(0, 10),
                timestamp: archivedAt,
                title: reason === 'replace' ? 'استبدال الكفيل الضامن' : 'فك الكفالة / حذف الكفيل',
                description:
                    reason === 'replace'
                        ? 'تمت أرشفة الكفيل الحالي وفتح مسار تسجيل كفيل جديد.'
                        : 'تم إنهاء ارتباط الكفيل بالإضبارة وأرشفة بياناته.',
                type: 'procedure',
                source: 'محضر المتابعة',
            });
        },
        [
            p.decisionsStorageExecutionId,
            p.executionData?.guarantor_followup,
            p.executionData?.guarantor_followup_history,
            p.nextTimelineId,
            p.persistExecutionMerge,
            p.pushTimelineEvent,
        ],
    );

    const persistGuarantorFollowupDetails = useCallback(
        (
            guarantorName: string,
            guarantorWorkplace: string,
            opts?: { salaryIqd: number | null; deductionIqd: number | null },
        ): boolean => {
            const prev =
                p.executionDataRef.current?.guarantor_followup ?? p.executionData?.guarantor_followup;
            const name = guarantorName.trim();
            const wp = guarantorWorkplace.trim();
            if (!name || !wp) {
                p.showToast('أدخل اسم الكفيل ومكان العمل قبل الحفظ.', 'warning');
                return false;
            }
            if (!p.persistExecutionMergeRef.current) {
                p.showToast('تعذّر الحفظ — أعد فتح ملف التنفيذ.', 'error');
                return false;
            }
            const creditors = p.executionData?.creditors;
            let patchCreditors: Creditor[] | undefined;
            if (Array.isArray(creditors) && creditors.length > 0) {
                const c0 = creditors[0] as Creditor;
                patchCreditors = [{ ...c0, guarantorExecutionNotation: true }, ...creditors.slice(1)];
            }
            const persisted = p.persistExecutionMerge({
                guarantor_followup: {
                    executor_approved: prev?.executor_approved ?? true,
                    channel: 'financial',
                    details_saved: true,
                    guarantee_type: 'amount',
                    guarantor_name: name,
                    guarantor_workplace: wp,
                    guarantor_salary_iqd:
                        opts?.salaryIqd !== undefined
                            ? opts.salaryIqd
                            : (prev?.guarantor_salary_iqd ?? null),
                    guarantor_deduction_iqd:
                        opts?.deductionIqd !== undefined
                            ? opts.deductionIqd
                            : (prev?.guarantor_deduction_iqd ?? null),
                    creditor_notation_registered: true,
                },
                debtor_executive_detention_active: false,
                executive_detention_until: null,
                executive_detention_days_total: null,
                executive_detention_reminder_sent: false,
                executive_detention_judge_outcome: null,
                executive_detention_judge_eligible_decision_id: null,
                executive_detention_judge_decision_id: null,
                executive_detention_request_in_absentia: false,
                debtor_travel_ban_active: false,
                ...(patchCreditors ? { creditors: patchCreditors } : {}),
            });
            if (persisted === false) {
                p.showToast('تعذّر حفظ بيانات الكفيل — أعد المحاولة', 'error');
                return false;
            }
            const ts = new Date().toISOString();
            const sal = opts?.salaryIqd;
            const ded = opts?.deductionIqd;
            const gt = 'كفالة ضامنة للمبلغ';
            p.pushTimelineEvent({
                id: p.nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: 'تثبيت بيانات الكفيل الضامن',
                description: [
                    `نوع الكفالة: ${gt}`,
                    `الاسم: ${name}`,
                    `مكان العمل: ${wp}`,
                    sal != null ? `الراتب: ${sal.toLocaleString('ar-IQ')} د.ع` : null,
                    ded != null ? `الاستقطاع: ${ded.toLocaleString('ar-IQ')} د.ع` : null,
                ]
                    .filter(Boolean)
                    .join('\n'),
                type: 'procedure',
                source: 'محضر المتابعة',
            });
            const did = String(p.guarantorDetailsDecisionId || '').trim();
            if (did) {
                try {
                    patchExecutorDecisionRow(p.decisionsStorageExecutionId, did, {
                        guarantorDetailsSavedAt: ts,
                    } as Record<string, unknown>);
                } catch {
                    /* ignore */
                }
                p.setGuarantorDetailsDecisionId(null);
            }
            p.showToast('تم حفظ بيانات الكفيل وتسجيل تعليم الدائن.', 'success');
            try {
                const exId = String(
                    p.executionDataRef.current?.id ?? p.executionData?.id ?? p.executionId ?? '',
                ).trim();
                window.dispatchEvent(
                    new CustomEvent('hami-guarantor-followup-committed', { detail: { executionId: exId } }),
                );
                window.dispatchEvent(
                    new CustomEvent('hami-guarantor-external-updated', {
                        detail: { executionId: exId, tab: 'financial' as const },
                    }),
                );
            } catch {
                /* ignore */
            }
            return true;
        },
        [
            p.decisionsStorageExecutionId,
            p.executionData?.creditors,
            p.executionData?.guarantor_followup,
            p.executionData?.id,
            p.executionDataRef,
            p.executionId,
            p.guarantorDetailsDecisionId,
            p.nextTimelineId,
            p.persistExecutionMerge,
            p.persistExecutionMergeRef,
            p.pushTimelineEvent,
            p.setGuarantorDetailsDecisionId,
            p.showToast,
        ],
    );

    return { archiveAndClearGuarantor, persistGuarantorFollowupDetails };
}
