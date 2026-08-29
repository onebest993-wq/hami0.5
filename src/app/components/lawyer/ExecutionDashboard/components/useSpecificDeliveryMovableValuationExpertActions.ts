import React from 'react';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    applySpecificDeliveryMovableExpertObjection,
    finalizeSpecificDeliveryMovableValuationRequest,
    saveSpecificDeliveryMovableExpertReport,
    sendInitialSpecificDeliveryMovableValuationRequest,
} from '@/app/utils/specificDeliveryMovableValuationRequest';
import { parseAmount } from '@/app/utils/execution/amountInput';
import { expertCommitteeSizeLabelAr } from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import {
    type SpecificDeliveryMovableValuationExpertCardProps,
} from './specificDeliveryMovableValuationExpertCard.helpers';

export function useSpecificDeliveryMovableValuationExpertActions(input: {
    latestRow: Record<string, unknown> | null | undefined;
    valuedItemLabel: string;
    estimatedValueInput: string;
    expertNamesForSave: () => string[];
    requiredExperts: number;
    showToast: SpecificDeliveryMovableValuationExpertCardProps['showToast'];
    decisionsStorageExecutionId: string;
    decisionRows: Record<string, unknown>[];
    setPartyDecisionLane: React.Dispatch<React.SetStateAction<'choose' | 'approve' | 'objection'>>;
    setEstimatedValueInput: React.Dispatch<React.SetStateAction<string>>;
    setExpertNames: React.Dispatch<React.SetStateAction<string>>;
    setExpertNameSlots: React.Dispatch<React.SetStateAction<string[]>>;
    reportSavedAt: string | null | undefined;
    linkedConversionItem: { id?: string } | null | undefined;
    hasPendingDeliveryItems: boolean;
    confirmInSection: (msg: string) => Promise<boolean>;
    onExpenseRecorded?: (row: Record<string, unknown>) => void;
    onValuationFinancialized?: (amount: number, itemId?: string) => void;
    executorApproved: boolean;
    setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    setInlineActionGateKey: (key: null) => void;
}) {
    const {
        latestRow,
        valuedItemLabel,
        estimatedValueInput,
        expertNamesForSave,
        requiredExperts,
        showToast,
        decisionsStorageExecutionId,
        decisionRows,
        setPartyDecisionLane,
        setEstimatedValueInput,
        setExpertNames,
        setExpertNameSlots,
        reportSavedAt,
        linkedConversionItem,
        hasPendingDeliveryItems,
        confirmInSection,
        onExpenseRecorded,
        onValuationFinancialized,
        executorApproved,
        setExpanded,
        setInlineActionGateKey,
    } = input;

    const saveExpertReport = React.useCallback(() => {
        const decisionId = String(latestRow?.id || '').trim();
        const desc = valuedItemLabel;
        const value = Math.trunc(parseAmount(estimatedValueInput));
        const names = expertNamesForSave();
        if (!decisionId || !desc) {
            showToast('لا يوجد شيء منقول مرتبط بطلب التحويل المعتمد', 'warning');
            return;
        }
        if (names.length !== requiredExperts) {
            showToast(
                `يجب إدخال ${requiredExperts} ${requiredExperts === 1 ? 'خبير' : 'خبراء'} بالضبط (${expertCommitteeSizeLabelAr(requiredExperts)}).`,
                'warning'
            );
            return;
        }
        if (value <= 0) {
            showToast('أدخل القيمة المقدرة للشيء', 'warning');
            return;
        }
        if (!isExecutorRowApprovedWorkflowActive(latestRow, decisionRows)) {
            showToast('بانتظار موافقة المنفذ على طلب الانتداب', 'warning');
            return;
        }
        const result = saveSpecificDeliveryMovableExpertReport({
            executionId: decisionsStorageExecutionId,
            decisionId,
            itemDescription: desc,
            expertNames: names,
            expertCommitteeSize: requiredExperts,
            expertFees: 0,
            estimatedValue: value,
        });
        if (!result.ok) {
            showToast('تعذر حفظ تقرير الخبراء', 'error');
            return;
        }
        setPartyDecisionLane('choose');
        showToast('تم حفظ تقرير الخبراء — اختر اعتماد التقرير أو الاعتراض.', 'success', {
            decisionsLink: true,
        });
    }, [
        decisionsStorageExecutionId,
        decisionRows,
        expertNamesForSave,
        estimatedValueInput,
        latestRow,
        requiredExperts,
        showToast,
        valuedItemLabel,
    ]);

    const submitExpertObjection = React.useCallback(
        (objectionKind: 'report' | 'experts') => {
            const decisionId = String(latestRow?.id || '').trim();
            if (!decisionId) return;
            const result = applySpecificDeliveryMovableExpertObjection({
                executionId: decisionsStorageExecutionId,
                decisionId,
                objectionKind,
            });
            if (!result.ok) {
                showToast('تعذر تسجيل الاعتراض', 'error');
                return;
            }
            setEstimatedValueInput('');
            setExpertNames('');
            setExpertNameSlots(
                Array.from({ length: result.committeeSize ?? requiredExperts + 2 }, () => '')
            );
            setPartyDecisionLane('choose');
            showToast(
                `تم تسجيل الاعتراض — ${expertCommitteeSizeLabelAr(result.committeeSize ?? 3)}. أكمل تقرير اللجنة الجديدة.`,
                'warning',
                { decisionsLink: true }
            );
        },
        [decisionsStorageExecutionId, latestRow?.id, requiredExperts, showToast]
    );

    const financializeAfterReportApproval = React.useCallback(async () => {
        const decisionId = String(latestRow?.id || '').trim();
        const desc = valuedItemLabel;
        const savedReportValue = Math.trunc(
            Number(latestRow?.specificDeliveryMovableValuationAmount) || 0
        );
        const value =
            Math.trunc(parseAmount(estimatedValueInput)) ||
            savedReportValue;
        const itemId = linkedConversionItem?.id;
        if (!decisionId || !reportSavedAt) {
            showToast('احفظ تقرير الخبراء أولاً', 'warning');
            return;
        }
        if (value <= 0) {
            showToast('أدخل القيمة المقدرة في تقرير الخبراء أولاً', 'warning');
            return;
        }
        if (!isExecutorRowApprovedWorkflowActive(latestRow, decisionRows)) {
            showToast('بانتظار موافقة المنفذ على انتداب الخبير', 'warning');
            return;
        }
        const confirmMsg = hasPendingDeliveryItems
            ? 'تذكير: لا يُخفى قسم إجراءات التسليم/المخاطبات حتى تسليم أو هلاك جميع الأشياء المراد تسليمها. إن بقي شيء لم يُسلَّم أو يُهلَك فسيظل القسم ظاهراً.\n\nهل تريد اعتماد التقرير وتحويل القيمة للمركز المالي؟'
            : 'هل تريد اعتماد التقرير وتحويل القيمة للمركز المالي؟';
        const accepted = await confirmInSection(confirmMsg);
        if (!accepted) return;
        const result = finalizeSpecificDeliveryMovableValuationRequest({
            executionId: decisionsStorageExecutionId,
            decisionId,
            itemDescription: desc,
            expertFees: 0,
            estimatedValue: value,
        });
        if (!result.ok || !result.estimatedValue) {
            showToast('تعذر تحويل القيمة إلى المركز المالي', 'error');
            return;
        }
        if (result.expenseRow) onExpenseRecorded?.(result.expenseRow);
        onValuationFinancialized?.(result.estimatedValue, itemId);
        showToast('تم اعتماد التقرير وحقن القيمة المقدرة في المركز المالي.', 'success', {
            decisionsLink: true,
        });
    }, [
        decisionsStorageExecutionId,
        decisionRows,
        estimatedValueInput,
        hasPendingDeliveryItems,
        latestRow,
        linkedConversionItem?.id,
        onExpenseRecorded,
        onValuationFinancialized,
        reportSavedAt,
        showToast,
        valuedItemLabel,
        confirmInSection,
    ]);

    const onConfirmSend = ({ resubmit }: { resubmit?: boolean } = {}) => {
        if (!valuedItemLabel) {
            showToast('لا يوجد شيء منقول مرتبط بطلب التحويل المعتمد', 'warning');
            return;
        }
        if (executorApproved && !resubmit) {
            setExpanded(true);
            setInlineActionGateKey(null);
            showToast(
                'تمت موافقة المنفذ — أكمل تقرير الخبراء والقيمة في الخطوات بالأسفل (لا حاجة لإرسال طلب جديد).',
                'info',
                { decisionsLink: true }
            );
            return;
        }
        const result = sendInitialSpecificDeliveryMovableValuationRequest({
            executionId: decisionsStorageExecutionId,
            itemDescription: valuedItemLabel,
            supersedeCompletedHub: resubmit,
        });
        if (!result.ok) {
            if (result.reason === 'executor_approved') {
                setExpanded(true);
                setInlineActionGateKey(null);
                showToast(
                    'تمت موافقة المنفذ — أكمل تقرير الخبراء والقيمة في الخطوات بالأسفل.',
                    'info',
                    { decisionsLink: true }
                );
                return;
            }
            if (result.reason === 'pending') {
                setExpanded(true);
                setInlineActionGateKey(null);
                showToast('يوجد طلب قيد البت لدى المنفذ — تابع الخطوات في البطاقة.', 'warning', {
                    decisionsLink: true,
                });
                return;
            }
            if (result.reason === 'complete') {
                showToast(
                    'تم إكمال دورة التقدير سابقاً. اختر «تقديم طلب جديد» إن أردت إعادة الإرسال.',
                    'warning'
                );
                return;
            }
            showToast('تعذر إرسال الطلب — حاول مجدداً أو راجع مركز القرارات.', 'warning');
            return;
        }
        setExpanded(true);
        showToast('تم إرسال الطلب إلى مركز قرارات المنفذ.', 'success', {
            decisionsLink: true,
        });
    };

    return { saveExpertReport, submitExpertObjection, financializeAfterReportApproval, onConfirmSend };
}
