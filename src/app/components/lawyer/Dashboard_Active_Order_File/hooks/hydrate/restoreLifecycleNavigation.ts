import { resolveProcedureCategory } from '@/app/domain/urgent/procedureCategory';
import type { FileStatus } from '../../types';
import type { PersistedCaseRecord } from './caseRecordTypes';

type LifecycleStep = 'judge' | 'execution' | 'grievance' | 'cassation' | null;

/** يستعيد fileStatus و activeLifecycleStep من السجل المخزّن (لا يُحفظان في IDB كحقل مستقل) */
export function restoreLifecycleNavigation(found: PersistedCaseRecord): {
    fileStatus?: FileStatus;
    activeLifecycleStep?: LifecycleStep;
    isSecretMode?: boolean;
} | null {
    const ep = Number(found.defenderEntryPhase);
    if (ep === 2 || ep === 3) return null;

    const urgentDirectCassation =
        resolveProcedureCategory(found.procedureCategory, String(found.specificActionType ?? '')) ===
        'urgent_judiciary';
    const rawDecision = found.judgeDecision;
    const decision =
        rawDecision === 'accepted' || rawDecision === 'rejected' || rawDecision === 'partially_accepted'
            ? rawDecision
            : null;

    if (urgentDirectCassation && decision) {
        return { fileStatus: 'cassation', activeLifecycleStep: 'cassation', isSecretMode: false };
    }

    const legalState = String(found.legalState ?? '').trim();
    const legacyOutcomeKey = 'ap' + 'pealOutcome';
    const legacyDecisionKey = 'ap' + 'pealDecision';
    const cassationOutcome = found.cassationOutcome ?? found[legacyOutcomeKey];
    const cassationDecision = found.cassationDecision ?? found[legacyDecisionKey];
    const grievanceOutcome = found.grievanceOutcome ?? found.grievanceOutcomeDraft;
    const grievanceDecision = found.grievanceDecision;

    const hasCassationProgress =
        cassationOutcome === 'filed' ||
        cassationOutcome === 'expired' ||
        cassationDecision === 'confirmed' ||
        cassationDecision === 'modified' ||
        cassationDecision === 'canceled';

    const grievanceFiledComplete =
        grievanceOutcome === 'filed' &&
        (grievanceDecision === 'confirmed' ||
            grievanceDecision === 'modified' ||
            grievanceDecision === 'canceled');

    if (grievanceFiledComplete || (legalState === 'Awaiting_Cassation' && hasCassationProgress)) {
        return {
            fileStatus: 'cassation',
            activeLifecycleStep: hasCassationProgress && !cassationDecision ? 'cassation' : null,
            isSecretMode: false,
        };
    }

    const inGrievance =
        legalState === 'Awaiting_Grievance' ||
        grievanceOutcome === 'filed' ||
        grievanceOutcome === 'expired' ||
        found.grievanceOutcomeDraft === 'filed' ||
        found.grievanceOutcomeDraft === 'expired';

    if (inGrievance && decision) {
        if (decision === 'rejected') {
            return { fileStatus: 'rejected', activeLifecycleStep: null };
        }
        if (decision === 'accepted' || decision === 'partially_accepted') {
            const requires =
                typeof found.requiresGuarantee === 'boolean'
                    ? found.requiresGuarantee
                    : typeof found.judgeDecisionRequiresGuarantee === 'boolean'
                      ? found.judgeDecisionRequiresGuarantee
                      : false;
            const submitted =
                typeof found.guaranteeSubmitted === 'boolean'
                    ? found.guaranteeSubmitted
                    : typeof found.guaranteeStatus === 'boolean'
                      ? found.guaranteeStatus
                      : false;
            const procedureType = String(found.type ?? '').trim();
            const t = String(found.specificActionType ?? '').trim();
            const skip =
                procedureType === 'state_order' ||
                ['وضع إشارة', 'منع سفر', 'إيقاف', 'حجز'].some((k) => t.includes(k));
            if (!skip && requires && !submitted) {
                return { fileStatus: 'accepted', activeLifecycleStep: null };
            }
            return { fileStatus: 'executed', activeLifecycleStep: null, isSecretMode: false };
        }
    }

    if (decision === 'accepted' || decision === 'partially_accepted') {
        const requires =
            typeof found.requiresGuarantee === 'boolean'
                ? found.requiresGuarantee
                : typeof found.judgeDecisionRequiresGuarantee === 'boolean'
                  ? found.judgeDecisionRequiresGuarantee
                  : false;
        const submitted =
            typeof found.guaranteeSubmitted === 'boolean'
                ? found.guaranteeSubmitted
                : typeof found.guaranteeStatus === 'boolean'
                  ? found.guaranteeStatus
                  : false;
        const procedureType = String(found.type ?? '').trim();
        const t = String(found.specificActionType ?? '').trim();
        const skip =
            procedureType === 'state_order' ||
            ['وضع إشارة', 'منع سفر', 'إيقاف', 'حجز'].some((k) => t.includes(k));
        if (!skip && requires && !submitted) {
            return { fileStatus: 'accepted', activeLifecycleStep: null };
        }
        if (legalState === 'Awaiting_Grievance') {
            return { fileStatus: 'executed', activeLifecycleStep: null, isSecretMode: false };
        }
    }

    if (decision === 'rejected' && legalState === 'Awaiting_Grievance') {
        return { fileStatus: 'rejected', activeLifecycleStep: null };
    }

    return null;
}
