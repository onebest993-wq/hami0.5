import type { Decision } from '../../types';
import type { CreditorDecisionEnforcementState } from './appealTypes';
import {
    isAppealDeadlinePerpetuallyEnforced,
    resolveExecutorDecisionStatusFlag,
    resolveManualExecutorWorkflowPhase,
} from './manualExecutorIdentity';

export function resolveManualExecutorLedgerEnforcementState(
    hub: Decision
): CreditorDecisionEnforcementState {
    if (isAppealDeadlinePerpetuallyEnforced(hub)) {
        return {
            visual: 'enforced',
            pillLabel: 'القرار نافذ — نهائياً',
            pillTone: 'emerald',
            enforced: true,
        };
    }
    const flag = resolveExecutorDecisionStatusFlag(hub);
    if (flag === 2) {
        const phase = resolveManualExecutorWorkflowPhase(hub);
        if (phase === 'grievance_pending') {
            return {
                visual: 'paused',
                pillLabel: 'التنفيذ موقوف لحين البت في التظلم',
                pillTone: 'amber',
                enforced: false,
            };
        }
        if (phase === 'cassation_unlocked') {
            return {
                visual: 'paused',
                pillLabel: 'موقوف — مهلة التمييز (7 أيام)',
                pillTone: 'amber',
                enforced: false,
            };
        }
        return {
            visual: 'paused',
            pillLabel: 'التنفيذ موقوف لحين حسم الطعن',
            pillTone: 'amber',
            enforced: false,
        };
    }
    if (flag === 3) {
        return {
            visual: 'withdrawn',
            pillLabel: 'قرار ملغى تمييزاً - منتهٍ',
            pillTone: 'slate',
            enforced: false,
        };
    }
    return {
        visual: 'enforced',
        pillLabel: 'قرار ساري ومُنتج لآثاره',
        pillTone: 'emerald',
        enforced: true,
    };
}
