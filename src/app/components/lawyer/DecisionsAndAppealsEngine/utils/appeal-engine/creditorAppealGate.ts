import type { Decision } from '../../types';
import {
    appealCreditorRequestPauseGateMessage,
    appealCreditorRequestRevokedGateMessage,
    type AppealUiPerspective,
} from '../../appealUiLabels';
import {
    hubWithInferredAppealOrigin,
    isCreditorExecutorAppealSubject,
} from '../appealRequestOrigin';


import {
    appealPipelineRowForCard,
    isLawyerCassationNaqdResume,
    isLawyerCassationRadReset,
} from './decisionHubPipeline';
import {
    isCassationAffirmResult,
} from './appealProceedings';
import {
    isDebtorAppealEligibleApprovedHub,
} from './appealWorkflowActors';
import type {
    CreditorRequestAppealGate,
} from './appealTypes';
import { canWaiveLawyerAwaitingCassation } from './creditorAppealWaiveCassation';

function isDebtorGrievancePauseState(hub: Decision, pipe: Decision): boolean {
    if (pipe.appealStatus === 'tamyeez_filed' || pipe.appealPhase === 'cassation') return false;

    const appealResult = String(pipe.appealResult ?? hub.appealResult ?? '').trim();
    if (appealResult === 'قبول التظلم' && pipe.appealStatus !== 'final') return true;

    if (pipe.awaitingCassationEntryBy === 'lawyer' || hub.awaitingCassationEntryBy === 'lawyer') {
        return true;
    }

    const grievanceOpen =
        pipe.appealStatus === 'tadhallum_filed' ||
        pipe.appealPhase === 'grievance' ||
        hub.appealStatus === 'tadhallum_filed' ||
        hub.appealPhase === 'grievance';
    if (grievanceOpen) return true;

    const actor = pipe.appealActor ?? hub.appealActor;
    if (actor === 'debtor') {
        if (pipe.grievanceAcceptedAwaitingDebtorTamyeez || hub.grievanceAcceptedAwaitingDebtorTamyeez) {
            return true;
        }
    }

    return false;
}

export function isCreditorApprovedDecisionTemporarilyPaused(hub: Decision, all: Decision[]): boolean {
    return resolveCreditorAppealPauseGate(hub, all) !== null;
}

export function resolveCreditorAppealPauseGate(
    hub: Decision,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): Extract<CreditorRequestAppealGate, { kind: 'paused' }> | null {
    const hubRow = hubWithInferredAppealOrigin(hub);
    if (!isDebtorAppealEligibleApprovedHub(hubRow, perspective)) return null;
    const pipe = appealPipelineRowForCard(hubRow, all);
    const gate = resolveCreditorRequestAppealGate(hubRow, pipe, perspective, all);
    return gate.kind === 'paused' ? gate : null;
}

export function resolveCreditorRequestAppealGate(
    hub: Decision,
    pipe: Decision,
    perspective: AppealUiPerspective = 'creditor_agent',
    all?: Decision[]
): CreditorRequestAppealGate {
    const hubRow = hubWithInferredAppealOrigin(hub);
    const phys = hubRow.executorOutcome;
    const debtorAgentView = perspective === 'debtor_agent';

    const debtorAppealEligibleApprovedHub = isDebtorAppealEligibleApprovedHub(
        hubRow,
        perspective
    );
    const appealSubjectHub =
        debtorAppealEligibleApprovedHub ||
        isCreditorExecutorAppealSubject(hubRow, perspective);

    const grievanceFinalResult = String(pipe.appealResult ?? hubRow.appealResult ?? '').trim();
    if (
        appealSubjectHub &&
        grievanceFinalResult === 'قبول التظلم' &&
        (pipe.appealStatus === 'final' || hubRow.appealStatus === 'final')
    ) {
        const waived = pipe.noAppealChosen === true || hubRow.noAppealChosen === true;
        return {
            kind: 'revoked',
            message: appealCreditorRequestRevokedGateMessage(perspective, waived),
            showAppealsShortcut: false,
        };
    }

    if (!debtorAppealEligibleApprovedHub) {
        return { kind: 'continue' };
    }

    if (isDebtorGrievancePauseState(hubRow, pipe)) {
        const cassationFiled =
            pipe.appealStatus === 'tamyeez_filed' || pipe.appealPhase === 'cassation';
        const gateDecisions: Decision[] = (() => {
            if (Array.isArray(all) && all.length > 0) return all;
            if (pipe.id !== hubRow.id) {
                const linked: Decision = {
                    ...pipe,
                    appealSourceDecisionId: pipe.appealSourceDecisionId ?? hubRow.id,
                };
                return [hubRow, linked];
            }
            return [{ ...hubRow, ...pipe, id: hubRow.id }];
        })();
        return {
            kind: 'paused',
            message: appealCreditorRequestPauseGateMessage(perspective, { cassationFiled }),
            showAppealsShortcut: false,
            showWaiveCassation:
                !debtorAgentView && canWaiveLawyerAwaitingCassation(hubRow, gateDecisions),
        };
    }

    if (pipe.appealWorkflowState === 'REVOKED_BY_APPEAL') {
        return {
            kind: 'lifecycle_reset',
            message: 'نُقض القرار بالتمييز — أُعيدت دورة حياة الطلب.',
            showAppealsShortcut: false,
        };
    }

    if (pipe.appealResult === 'نقض القرار' && pipe.appealStatus === 'final') {
        if (!isLawyerCassationNaqdResume(pipe, hubRow)) {
            return {
                kind: 'lifecycle_reset',
                message: 'نُقض القرار بالتمييز — أُعيدت دورة حياة الطلب.',
                showAppealsShortcut: false,
            };
        }
    }

    if (isCassationAffirmResult(pipe.appealResult) && pipe.appealStatus === 'final') {
        if (isLawyerCassationRadReset(pipe, phys)) {
            return {
                kind: 'lifecycle_reset',
                message: 'صُدّق القرار بالتمييز — أُعيدت دورة حياة الطلب.',
                showAppealsShortcut: false,
            };
        }
    }

    return { kind: 'continue' };
}


export function isCreditorRequestFlowContinues(
    hub: Decision,
    pipe: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    return resolveCreditorRequestAppealGate(hub, pipe, perspective).kind === 'continue';
}
