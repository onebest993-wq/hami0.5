// @ts-nocheck
import { buildSeizureRegistryDraftPatch } from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureRegistryBridge';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import type { SeizedMovable } from '@/app/types/execution';
import {
    dispatchGuarantorSeizureInlineFocusRoute,
    dispatchMovableSeizureInlineFocus,
    dispatchOpenSeizureCompletion,
    dispatchPropertySeizureInlineFocus,
    dispatchThirdPartySeizureInlineFocus,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import { dispatchSimpleSeizureInlineFocus } from '@/app/domain/seizure/seizureOutcomeRouter';
import { openFollowupSeizureRequestsModal } from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalOpen';
import type { SeizureDecisionOutcomeContext } from './seizureDecisionOutcomeHandler.types';
import type { SeizureOutcomeResolvedEvent } from './seizureOutcomeResolve';

/** مرحلة الموافقة المبدئية — كفيل، إشارة، غير، عقار/منقول مبدئي، إنشاء منقول من payload */
export function handleSeizureOutcomeInitPhase(
    ctx: SeizureDecisionOutcomeContext,
    event: SeizureOutcomeResolvedEvent,
): boolean {
    const { decisionId, decisionRow, resolved, requestKind, savedAtEarly, seizureTarget, dispatchId } = event;
    const subtype = resolved.subtype;
    const myId = event.myId;

    if (seizureTarget === 'guarantor' && requestKind === 'seizure' && !savedAtEarly) {
        const draftPatch = buildSeizureRegistryDraftPatch(
            ctx.executionDataRef.current as Record<string, unknown> | null | undefined,
            decisionId,
            subtype,
            decisionRow,
        );
        if (draftPatch) {
            ctx.persistExecutionMergeRef.current?.(draftPatch);
        }
        ctx.setShowCoerciveActionForm(null);
        ctx.setSeizureDetailCompletion(null);
        openFollowupSeizureRequestsModal(ctx.openFollowupModalPersisted, {
            setShowUnifiedExecutionModal: ctx.setShowUnifiedExecutionModal,
            openSeizureRequestsTabRef: ctx.openSeizureRequestsTabRef,
        });
        const focusKind: 'salary' | 'movable' | 'property' =
            subtype === 'property' ? 'property' : subtype === 'salary' ? 'salary' : 'movable';
        dispatchGuarantorSeizureInlineFocusRoute(dispatchId, decisionId, focusKind, String(decisionRow?.title || '').trim());
        return true;
    }

    const isBasicSeizureSubtype =
        subtype === 'property' ||
        subtype === 'movable' ||
        subtype === 'movable_auction' ||
        subtype === 'third_party';

    if ((requestKind === 'seizure' || isBasicSeizureSubtype) && !savedAtEarly && isBasicSeizureSubtype) {
        const draftPatch = buildSeizureRegistryDraftPatch(
            ctx.executionDataRef.current as Record<string, unknown> | null | undefined,
            decisionId,
            subtype,
            decisionRow,
        );
        if (draftPatch) {
            ctx.persistExecutionMergeRef.current?.(draftPatch);
            ctx.applyThirdPartySeizuresFromPatch(draftPatch);
        }
        const subject = String(decisionRow?.title || '').trim();
        openFollowupSeizureRequestsModal(ctx.openFollowupModalPersisted, {
            setShowUnifiedExecutionModal: ctx.setShowUnifiedExecutionModal,
            openSeizureRequestsTabRef: ctx.openSeizureRequestsTabRef,
        });
        if (subtype === 'property') {
            ctx.focusSeizurePropertyInlineRef.current(decisionId, subject);
            dispatchPropertySeizureInlineFocus(dispatchId, decisionId, subject);
            return true;
        }
        if (subtype === 'third_party') {
            ctx.focusSeizureThirdPartyInlineRef.current(decisionId, subject);
            dispatchThirdPartySeizureInlineFocus(dispatchId, decisionId, subject);
            dispatchSimpleSeizureInlineFocus('third_party', {
                executionId: dispatchId,
                decisionId,
                subject,
            });
            return true;
        }
        if (subtype === 'movable_auction' || subtype === 'movable') {
            ctx.focusSeizureMovableInlineRef.current(decisionId, subject);
            dispatchMovableSeizureInlineFocus(dispatchId, decisionId, subject);
            return true;
        }
    }

    if (requestKind === 'seizure' && subtype === 'notice' && !savedAtEarly) {
        const subject = String(decisionRow?.title || '').trim();
        ctx.focusSeizureNoticeInlineRef.current(decisionId, subject);
        dispatchSimpleSeizureInlineFocus('notice', {
            executionId: dispatchId,
            decisionId,
            subject,
        });
        return true;
    }

    if (requestKind === 'seizure' && subtype === 'salary' && !savedAtEarly) {
        openFollowupSeizureRequestsModal(ctx.openFollowupModalPersisted, {
            setShowUnifiedExecutionModal: ctx.setShowUnifiedExecutionModal,
            openSeizureRequestsTabRef: ctx.openSeizureRequestsTabRef,
        });
        dispatchOpenSeizureCompletion(dispatchId, decisionId);
        return true;
    }

    if (subtype === 'movable_auction' && !resolved.seizedMovableId) {
        const desc = resolved.movableDescription;
        const loc = resolved.movableLocation;
        const cust = resolved.judicialCustodianName;
        if (!desc || !loc) return false;
        const nowIso = new Date().toISOString();
        const prev = (ctx.executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const existingIdx = prev.findIndex((x) => String(x.decisionRowId || '') === decisionId);
        const next: SeizedMovable[] = [...prev];
        const entityId = existingIdx >= 0 ? String(next[existingIdx].id) : `sm_${decisionId}`;
        const nextRow: SeizedMovable = {
            id: entityId,
            decisionRowId: decisionId,
            movableDescription: desc,
            movableLocation: loc,
            judicialCustodianName: cust,
            status: 'seized',
            seizedAtIso: nowIso,
            subject: String(decisionRow?.title || '').trim() || undefined,
        };
        if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...nextRow };
        else next.unshift(nextRow);
        ctx.persistExecutionMergeRef.current?.({ seizedMovables: next });
        const rawJson = String(decisionRow?.seizurePayloadJson || '').trim();
        const updatedPayloadJson = (() => {
            try {
                const prevJson = rawJson ? (JSON.parse(rawJson) as Record<string, unknown>) : {};
                return JSON.stringify({
                    ...prevJson,
                    seizedMovableId: entityId,
                    movableDescription: desc,
                    movableLocation: loc,
                    judicialCustodianName: cust,
                });
            } catch {
                return JSON.stringify({
                    seizedMovableId: entityId,
                    movableDescription: desc,
                    movableLocation: loc,
                    judicialCustodianName: cust,
                });
            }
        })();
        patchExecutorDecisionRow(myId, decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: [
                `وصف المال المنقول: ${desc}`,
                `المكان: ${loc}`,
                cust ? `الحارس القضائي: ${cust}` : null,
            ]
                .filter(Boolean)
                .join('\n'),
            seizurePayloadJson: updatedPayloadJson,
        });
        ctx.pushTimelineEventRef.current?.({
            id: ctx.nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📦 قبول حجز مال منقول — إنشاء بطاقة',
            description: [
                `وصف المال المنقول: ${desc}`,
                `المكان: ${loc}`,
                cust ? `الحارس القضائي: ${cust}` : null,
            ]
                .filter(Boolean)
                .join('\n'),
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedMovableId: entityId, decisionRowId: decisionId, seizureSubtype: subtype },
        });
        return true;
    }

    return false;
}
