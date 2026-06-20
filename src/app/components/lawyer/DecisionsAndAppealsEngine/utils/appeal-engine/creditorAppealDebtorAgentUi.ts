import type { ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { Decision } from '../../types';
import {
    appealCreditorRequestPauseGateMessage,
    appealCreditorRequestRevokedGateMessage,
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    hubWithInferredAppealOrigin,
    inferDecisionAppealRequestOrigin,
    isCreditorInitiatedExecutorRequest,
    isCreditorExecutorAppealSubject,
    isCreditorPartyRequest,
    isDecisionLikeRow,
    resolveRequestFilerFromDebtorAgentView,
    resolveRequestProponent,
} from '../appealRequestOrigin';
import {
    isManualExecutorLedgerDecision,
    isAppealDeadlinePerpetuallyEnforced,
} from './manualExecutorIdentity';
import { resolveManualExecutorLedgerEnforcementState } from './manualExecutorLedger';
import {
    appealPipelineRowForCard,
    effectiveExecutorOutcomeForCreditorHubPill,
    isLawyerCassationNaqdResume,
    isLawyerCassationRadReset,
} from './decisionHubPipeline';
import {
    resolveEffectiveAwaitingCassationParty,
    resolveEffectiveAppealActor,
    isCassationAffirmResult,
} from './appealProceedings';
import {
    resolveGrievanceFilerActor,
    resolveCassationFilerActor,
    isDebtorAppealEligibleApprovedHub,
    resolveAppealBaseBranch,
} from './appealWorkflowActors';
import type {
    CreditorRequestAppealGate,
    CreditorDecisionEnforcementState,
    DecisionHubStatusPillTone,
    ExecutorRequestFollowupBlock,
} from './appealTypes';

export function debtorAgentAppealStatusInHeaderPill(pillLabel: string): boolean {
    const p = String(pillLabel || '').trim();
    if (!p) return false;
    if (p === 'ضد موكّلنا — قبول المنفذ' || p === 'لصالح موكّلنا — رفض المنفذ') return false;
    if (p === 'القرار نافذ' || p === 'القرار غير نافذ') return false;
    return /الطعن|بانتظار تمييز|تمييز |طعن موكّلنا|طعن الدائن|غير نافذ — مؤقتاً|أُعيدت الدورة/.test(
        p
    );
}

export function shouldHideDebtorAgentFateLine(
    pillLabel: string,
    gate: CreditorRequestAppealGate
): boolean {
    if (gate.kind === 'paused' || gate.kind === 'revoked' || gate.kind === 'lifecycle_reset') {
        return true;
    }
    return debtorAgentAppealStatusInHeaderPill(pillLabel);
}

/** لا تُكرّر شارة نتيجة الطعن — منظور وكيل المدين يكتفي بالشارة العلوية ومسار الطعن */
export function shouldShowAppealResultChipSeparate(
    _pillLabel: string,
    perspective: import('../../appealUiLabels').AppealUiPerspective
): boolean {
    return perspective !== 'debtor_agent';
}

export const COMPACT_APPEAL_PROCEEDINGS_MAX = 3;

/** من سجّل الطعن الذي أنتج النتيجة الحالية — تظلم أو تمييز */
export function resolveAppealResultActorForClient(
    pipe: Decision,
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): 'lawyer' | 'debtor' | null {
    const result = String(pipe.appealResult ?? hub.appealResult ?? '').trim();
    if (result === 'نقض القرار' || result === 'تصديق القرار' || result === 'رد اللائحة') {
        return (
            resolveCassationFilerActor(pipe) ??
            resolveCassationFilerActor(hub) ??
            resolveEffectiveAppealActor(pipe, hub, perspective)
        );
    }
    if (result === 'قبول التظلم' || result === 'رد التظلم') {
        return (
            resolveGrievanceFilerActor(pipe, perspective) ??
            resolveGrievanceFilerActor(hub, perspective) ??
            resolveEffectiveAppealActor(pipe, hub, perspective)
        );
    }
    return resolveEffectiveAppealActor(pipe, hub, perspective);
}

/** سطر مصير الطلب — نافذية من منظور وكيل المدين */
export function resolveDebtorAgentRequestFateLine(
    enforcement: CreditorDecisionEnforcementState,
    gate: CreditorRequestAppealGate
): string {
    if (gate.kind === 'paused') {
        return 'مصير الطلب: غير نافذ مؤقتاً — الطعن يوقف التنفيذ';
    }
    if (gate.kind === 'revoked') {
        return 'مصير الطلب: طلب الدائن غير نافذ — أُغلقت دورته';
    }
    if (gate.kind === 'lifecycle_reset') {
        return 'مصير الطلب: أُعيدت الدورة — ليس بالصيغة السابقة';
    }
    if (
        enforcement.pillLabel.startsWith('طعن موكّلنا') ||
        enforcement.pillLabel.startsWith('بانتظار تمييز موكّلنا')
    ) {
        return 'مصير الطلب: قيد طعن موكّلنا — غير نافذ حتى البت';
    }
    if (
        enforcement.pillLabel.startsWith('طعن الدائن') ||
        enforcement.pillLabel.startsWith('بانتظار تمييز الدائن')
    ) {
        return 'مصير الطلب: قيد طعن الدائن — غير نافذ مؤقتاً';
    }
    if (enforcement.pillLabel.includes('الطعن لصالح موكّلنا')) {
        return 'مصير الطلب: الطعن لصالح موكّلنا — طلب الدائن غير نافذ';
    }
    if (enforcement.pillLabel.includes('الطعن ضد موكّلنا')) {
        return 'مصير الطلب: الطعن ضد موكّلنا';
    }
    if (enforcement.pillLabel.includes('ضد موكّلنا — نافذ') || enforcement.enforced) {
        return 'مصير الطلب: نافذ ضد موكّلنا';
    }
    if (enforcement.pillLabel.includes('لصالح موكّلنا — نافذ')) {
        return 'مصير الطلب: لصالح موكّلنا — نافذ';
    }
    if (enforcement.pillLabel.includes('ضد موكّلنا')) {
        return 'مصير الطلب: ضد موكّلنا — غير نافذ بعد';
    }
    if (enforcement.pillLabel.includes('لصالح موكّلنا')) {
        return 'مصير الطلب: لصالح موكّلنا';
    }
    return `مصير الطلب: ${enforcement.pillLabel}`;
}
