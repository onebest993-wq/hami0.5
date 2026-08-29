import { useCallback } from 'react';
import {
    appendPendingExecutorSeizureDecision,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { requireDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import { buildSeizureRegistryDraftPatch } from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureRegistryBridge';
import { submitBasicSeizurePendingRequest } from '@/app/domain/seizure/seizureBasicRequestService';
import { openFollowupSeizureRequestsModal } from '../../utils/followupModalOpen';
import type { UseExecutionDashboardGuarantorFollowupHandlersParams } from './useExecutionDashboardGuarantorFollowupHandlers.types';

type SeizureRequestParams = Pick<
    UseExecutionDashboardGuarantorFollowupHandlersParams,
    | 'decisionsStorageExecutionId'
    | 'executionData'
    | 'executionId'
    | 'nextTimelineId'
    | 'pushTimelineEvent'
    | 'showToast'
    | 'executionDataRef'
    | 'persistExecutionMergeRef'
    | 'openSeizureRequestsTabRef'
    | 'setShowCoerciveActionForm'
    | 'setSeizureDetailCompletion'
    | 'openFollowupModalPersisted'
    | 'setShowUnifiedExecutionModal'
>;

export function useGuarantorFollowupSeizureRequestHandlers(p: SeizureRequestParams) {
    const requestFollowupSeizureDecision = useCallback(
        (subtype: 'third_party' | 'notice', title: string, body: string) => {
            const result = submitBasicSeizurePendingRequest({
                dossierInput: {
                    decisionsStorageExecutionId: p.decisionsStorageExecutionId,
                    executionId: p.executionId,
                    executionDataId: p.executionData?.id,
                    executionData: p.executionData as Record<string, unknown> | null,
                },
                title,
                body,
                subtype,
                decisions: readExecutorDecisionsArray(
                    p.decisionsStorageExecutionId || p.executionId || '',
                ) as Array<Record<string, unknown>>,
            });
            if (result.error === 'invalid_dossier') {
                p.showToast('تعذّر ربط الطلب بملف التنفيذ. أعد فتح المحضر.', 'warning');
                return;
            }
            if (!result.ok || !result.decisionId) {
                p.showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
                    decisionsLink: true,
                    decisionsTab: 'current',
                });
                return;
            }
            const decisionId = result.decisionId;

            const draftPatch = buildSeizureRegistryDraftPatch(
                p.executionDataRef.current as Record<string, unknown> | null | undefined,
                decisionId,
                subtype,
                { title },
            );
            if (draftPatch) {
                p.persistExecutionMergeRef.current?.(draftPatch);
            }

            const now = new Date().toISOString();
            p.pushTimelineEvent({
                id: p.nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: `📋 ${title} — قيد البت`,
                description: body,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: {
                    timelineThreadKey: `executor_decision:${decisionId}`,
                    decisionRowId: decisionId,
                },
            });

            p.showToast('تم إرسال الطلب إلى القرارات والطعون.', 'success', {
                decisionsLink: true,
                decisionId,
                decisionsTab: 'current',
            });
        },
        [
            p.decisionsStorageExecutionId,
            p.executionId,
            p.executionData,
            p.nextTimelineId,
            p.pushTimelineEvent,
            p.showToast,
            p.executionDataRef,
            p.persistExecutionMergeRef,
        ],
    );

    const requestGuarantorSeizure = useCallback(
        (subtype: 'salary' | 'movable' | 'property', opts?: { inline?: boolean }) => {
            const inline = Boolean(opts?.inline);
            const gf = p.executionData?.guarantor_followup;
            if (!gf?.executor_approved) {
                p.showToast('لا يوجد كفيل معتمد من المنفذ.', 'warning');
                return;
            }
            const hasDetails =
                gf.details_saved === true ||
                (Boolean(String(gf.guarantor_name || '').trim()) &&
                    Boolean(String(gf.guarantor_workplace || '').trim()));
            if (!hasDetails) {
                p.showToast('أكمل بيانات الكفيل (الاسم وجهة العمل) أولاً.', 'warning');
                return;
            }
            const label =
                subtype === 'salary'
                    ? 'طلب حجز راتب الكفيل'
                    : subtype === 'property'
                      ? 'طلب حجز عقار الكفيل'
                      : 'طلب حجز أموال منقولة للكفيل';
            const body = [
                'طلب اتخاذ إجراءات الحجز على الكفيل الضامن.',
                gf.guarantor_name?.trim() ? `اسم الكفيل: ${gf.guarantor_name.trim()}` : null,
                gf.guarantor_workplace?.trim() ? `عنوان العمل: ${gf.guarantor_workplace.trim()}` : null,
            ]
                .filter(Boolean)
                .join('\n');
            const subtypeStored = subtype === 'movable' ? ('movable_auction' as const) : subtype;
            const did = appendPendingExecutorSeizureDecision({
                executionId: p.decisionsStorageExecutionId,
                requestTitle: label,
                requestBody: body,
                seizureSubtype: subtypeStored,
                seizureTarget: 'guarantor',
            });
            if (!did) {
                p.showToast('يوجد طلب مماثل قيد المعالجة.', 'warning', { decisionsLink: true });
                return;
            }
            const ts = new Date().toISOString();
            p.pushTimelineEvent({
                id: p.nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: `📌 ${label} — قيد البت`,
                description: body,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${did}`, decisionRowId: did },
            });
            if (!inline) {
                p.setShowCoerciveActionForm(null);
                p.setSeizureDetailCompletion(null);
                openFollowupSeizureRequestsModal(p.openFollowupModalPersisted, {
                    setShowUnifiedExecutionModal: p.setShowUnifiedExecutionModal,
                    openSeizureRequestsTabRef: p.openSeizureRequestsTabRef,
                });
                try {
                    const exId = requireDecisionsStorageExecutionId({
                        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
                        executionId: p.executionId,
                        executionData: p.executionData as Record<string, unknown> | null,
                    });
                    window.dispatchEvent(
                        new CustomEvent('hami-focus-guarantor-seizure-inline', {
                            detail: { executionId: exId, decisionId: did, kind: subtype },
                        }),
                    );
                    window.dispatchEvent(
                        new CustomEvent('hami-guarantor-seizure-request-created', {
                            detail: { executionId: exId, decisionId: did },
                        }),
                    );
                } catch {
                    /* ignore */
                }
            }
            p.showToast(
                inline
                    ? 'تم إرسال طلب حجز الكفيل — تابع الإكمال أدناه.'
                    : 'تم إنشاء طلب حجز الكفيل — أكمل المسار داخل طلبات الحجز.',
                'success',
                {
                    decisionsLink: true,
                    decisionId: did,
                    decisionsTab: 'current',
                },
            );
        },
        [
            p.decisionsStorageExecutionId,
            p.executionData?.guarantor_followup,
            p.executionData?.id,
            p.executionId,
            p.nextTimelineId,
            p.openSeizureRequestsTabRef,
            p.openFollowupModalPersisted,
            p.pushTimelineEvent,
            p.setSeizureDetailCompletion,
            p.setShowCoerciveActionForm,
            p.setShowUnifiedExecutionModal,
            p.showToast,
        ],
    );

    return { requestFollowupSeizureDecision, requestGuarantorSeizure };
}
