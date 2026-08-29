import {
    fieldVisitAppointmentStorageKey,
    inferExecutorApprovalDecisionType,
} from '@/app/utils/executorApprovalWorkflow';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    openFollowupCoerciveModal,
} from '../../utils/followupModalOpen';
import type { UseExecutionDashboardEvictionResidentialGraceHandlersParams } from './useExecutionDashboardEvictionResidentialGraceHandlers.types';

type CompletionParams = Pick<
    UseExecutionDashboardEvictionResidentialGraceHandlersParams,
    | 'decisionsStorageExecutionId'
    | 'executionId'
    | 'executorApprovalActions'
    | 'openBreakInventoryCompletion'
    | 'openJudicialCustodianCompletion'
    | 'openFollowupModalPersisted'
    | 'setShowUnifiedExecutionModal'
    | 'setUnifiedModalTab'
    | 'showToast'
    | 'setShowDecisionsModal'
    | 'setDecisionsModalBootListTab'
    | 'setDecisionsModalScrollToDecisionId'
    | 'setEvictionGraceDecisionId'
    | 'setPoliceAssistanceAgencyDraft'
    | 'setPoliceAssistanceDecisionId'
    | 'setPoliceAssistanceModalOpen'
    | 'setPoliceAssistanceRequestTitle'
>;

export function runOpenEvictionExecutorCompletion(
    p: CompletionParams,
    decisionId: string,
    openEvictionResidentialGraceModal: () => void,
): void {
    const primaryKey = String(p.decisionsStorageExecutionId ?? '').trim();
    const altKey = String(p.executionId ?? '').trim();
    const did = String(decisionId).trim();
    if (!did) return;

    const rowsPrimary = readExecutorDecisionsArray(primaryKey) as Array<Record<string, unknown>>;
    let keyUsed = primaryKey;
    let row = rowsPrimary.find((r) => String((r as { id?: string }).id || '').trim() === did);
    if (!row && altKey && altKey !== primaryKey) {
        const rowsAlt = readExecutorDecisionsArray(altKey) as Array<Record<string, unknown>>;
        row = rowsAlt.find((r) => String((r as { id?: string }).id || '').trim() === did);
        if (row) keyUsed = altKey;
    }
    if (!row) return;
    const branch = inferExecutorApprovalDecisionType(row as Record<string, unknown>);
    const requestTitle = String((row as { title?: string }).title || '').trim() || 'طلب';
    const dossierId = keyUsed;
    const actions = p.executorApprovalActions;

    const openDecisionCardFallback = () => {
        p.setShowDecisionsModal(true);
        p.setDecisionsModalBootListTab('previous');
        p.setDecisionsModalScrollToDecisionId(did);
    };

    if (branch === 'Field Visit Date') {
        (actions.openScheduledDateModal as (arg: Record<string, unknown>) => void)({
            decisionId,
            requestTitle,
            onSaved: (payload: { eventIso: string; displayAr: string }) => {
                (actions.pushCalendarAppointment as (arg: Record<string, unknown>) => void)({
                    dossierId,
                    decisionId,
                    purpose: requestTitle,
                    eventIso: payload.eventIso,
                    recordedAt: new Date().toISOString(),
                });
                (actions.patchDecision as (id: string, patch: Record<string, unknown>) => void)(decisionId, {
                    executorScheduleLabel: `مجدول: ${payload.displayAr}`,
                });
                try {
                    SecureStoreService.setItemSync(
                        fieldVisitAppointmentStorageKey(dossierId),
                        payload.eventIso,
                    );
                } catch {
                    /* ignore */
                }
            },
        });
        return;
    }

    if (branch === 'Grace Period') {
        p.setShowDecisionsModal(false);
        p.setEvictionGraceDecisionId(decisionId);
        openEvictionResidentialGraceModal();
        return;
    }

    if (branch === 'Police Assistance Request') {
        p.setShowDecisionsModal(false);
        p.setPoliceAssistanceDecisionId(decisionId);
        p.setPoliceAssistanceRequestTitle(requestTitle);
        p.setPoliceAssistanceAgencyDraft(
            String((row as { policeAssistanceAgency?: string }).policeAssistanceAgency || '').trim(),
        );
        p.setPoliceAssistanceModalOpen(true);
        return;
    }

    if (branch === 'Lock Breaking & Inventory') {
        p.setShowDecisionsModal(false);
        p.openBreakInventoryCompletion(decisionId, actions, requestTitle);
        return;
    }

    if (branch === 'Judicial Custodian') {
        p.setShowDecisionsModal(false);
        p.openJudicialCustodianCompletion(decisionId, actions, requestTitle);
        return;
    }

    if (branch === 'Eviction') {
        p.setShowDecisionsModal(false);
        (actions.promptOpenExecutionReport as (cb: () => void) => void)(() => {
            /* handled by confirm modal */
        });
        return;
    }

    if (branch === 'Residential Grace Early End') {
        openFollowupCoerciveModal(p.openFollowupModalPersisted, {
            setShowUnifiedExecutionModal: p.setShowUnifiedExecutionModal,
            setUnifiedModalTab: p.setUnifiedModalTab,
        });
        p.showToast('تمت موافقة المنفذ — أكمل من بطاقة الطلب في «محضر المتابعة».', 'info', {
            decisionsLink: true,
            decisionId: did,
            decisionsTab: 'previous',
        });
        return;
    }

    openDecisionCardFallback();
}
