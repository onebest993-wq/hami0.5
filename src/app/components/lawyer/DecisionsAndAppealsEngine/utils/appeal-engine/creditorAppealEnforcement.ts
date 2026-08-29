import type { Decision } from '../../types';
import type { DecisionCardEnforcementVisual } from '../../decisionCardGlassShell';
import {
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    isCreditorPartyRequest,
    resolveRequestFilerFromDebtorAgentView,
} from '../appealRequestOrigin';
import {
    isManualExecutorLedgerDecision,
    isAppealDeadlinePerpetuallyEnforced,
} from './manualExecutorIdentity';
import { resolveManualExecutorLedgerEnforcementState } from './manualExecutorLedger';
import {
    effectiveExecutorOutcomeForCreditorHubPill,
} from './decisionHubPipeline';
import {
    resolveEffectiveAwaitingCassationParty,
    resolveEffectiveAppealActor,
} from './appealProceedings';
import { resolveCreditorRequestAppealGate, isCreditorRequestFlowContinues } from './creditorAppealGate';


import type {
    CreditorDecisionEnforcementState,
    DecisionHubStatusPillTone,
} from './appealTypes';
import {
    resolveAppealResultActorForClient,
} from './creditorAppealDebtorAgentUi';

function hasActiveAppealTrack(row: Decision): boolean {
    return (
        row.appealActor === 'lawyer' ||
        row.appealActor === 'debtor' ||
        row.appealMethod === 'tadhallum' ||
        row.appealMethod === 'tamyeez' ||
        row.appealStatus === 'tadhallum_filed' ||
        row.appealStatus === 'tamyeez_filed' ||
        row.appealPhase === 'grievance' ||
        row.appealPhase === 'cassation' ||
        Boolean(row.awaitingCassationEntryBy) ||
        Boolean(row.appealResult) ||
        row.appealWorkflowState === 'PENDING_APPEAL_LAWYER' ||
        row.appealWorkflowState === 'PENDING_APPEAL_DEBTOR'
    );
}

function debtorAgentAppealWorkflowPill(
    hub: Decision,
    pipe: Decision,
    all: Decision[],
    opts: { hubTab: 'current' | 'previous' | 'appeals' | 'archive' }
): CreditorDecisionEnforcementState | null {
    const appealRow = pipe.appealSourceDecisionId
        ? pipe
        : hub.appealSourceDecisionId
          ? hub
          : hasActiveAppealTrack(pipe)
            ? pipe
            : hasActiveAppealTrack(hub)
              ? hub
              : null;
    if (!appealRow && opts.hubTab !== 'appeals') return null;

    const row = appealRow ?? pipe;
    if (!hasActiveAppealTrack(row)) return null;

    const actor = resolveEffectiveAppealActor(row, hub, 'debtor_agent');
    const grievanceOpen =
        row.appealStatus === 'tadhallum_filed' || row.appealPhase === 'grievance';
    const cassationOpen =
        row.appealStatus === 'tamyeez_filed' || row.appealPhase === 'cassation';

    if (grievanceOpen) {
        if (actor === 'debtor') {
            return {
                visual: 'neutral',
                pillLabel: 'طعن موكّلنا — تظلم',
                pillTone: 'amber',
                enforced: false,
            };
        }
        if (actor === 'lawyer') {
            return {
                visual: 'neutral',
                pillLabel: 'طعن الدائن — تظلم',
                pillTone: 'red',
                enforced: false,
            };
        }
    }

    if (cassationOpen) {
        if (actor === 'debtor') {
            return {
                visual: 'neutral',
                pillLabel: 'تمييز موكّلنا',
                pillTone: 'amber',
                enforced: false,
            };
        }
        if (actor === 'lawyer') {
            return {
                visual: 'neutral',
                pillLabel: 'تمييز الدائن',
                pillTone: 'red',
                enforced: false,
            };
        }
    }

    const awaitingCassation = resolveEffectiveAwaitingCassationParty(row, hub);
    if (awaitingCassation === 'lawyer') {
        return {
            visual: 'neutral',
            pillLabel: 'بانتظار تمييز الدائن',
            pillTone: 'amber',
            enforced: false,
        };
    }
    if (awaitingCassation === 'debtor') {
        return {
            visual: 'neutral',
            pillLabel: 'بانتظار تمييز موكّلنا',
            pillTone: 'amber',
            enforced: false,
        };
    }

    const result = String(row.appealResult || '').trim();
    if (result) {
        const resultActor =
            resolveAppealResultActorForClient(row, hub, 'debtor_agent') ??
            actor ??
            row.appealActor;
        const favorableToClient = isAppealResultFavorableToDebtorClient(result, resultActor);
        return {
            visual: 'neutral',
            pillLabel: favorableToClient ? 'الطعن لصالح موكّلنا' : 'الطعن ضد موكّلنا',
            pillTone: favorableToClient ? 'emerald' : 'red',
            enforced: false,
        };
    }

    return null;
}

function debtorAgentExecutorOutcomePill(
    underlying: Decision,
    pipe: Decision,
    state: CreditorDecisionEnforcementState,
    opts: { appealLegallyFinal: boolean }
): CreditorDecisionEnforcementState {
    const neutralVisual: DecisionCardEnforcementVisual = 'neutral';
    const filer = resolveRequestFilerFromDebtorAgentView(underlying);
    const eff = effectiveExecutorOutcomeForCreditorHubPill(underlying, pipe, 'debtor_agent');
    const approved = eff === 'approved' || eff === 'alternative';
    const rejected = eff === 'rejected';

    const adverse =
        (filer === 'creditor' && approved) || (filer === 'debtor' && rejected);
    const favorable =
        (filer === 'creditor' && rejected) || (filer === 'debtor' && approved);

    if (adverse) {
        return {
            ...state,
            visual: neutralVisual,
            pillLabel: approved
                ? state.enforced && opts.appealLegallyFinal
                    ? 'ضد موكّلنا — نافذ'
                    : 'ضد موكّلنا — قبول المنفذ'
                : 'ضد موكّلنا — رفض المنفذ',
            pillTone: 'red',
        };
    }
    if (favorable) {
        return {
            ...state,
            visual: neutralVisual,
            pillLabel: rejected
                ? 'لصالح موكّلنا — رفض المنفذ'
                : state.enforced && opts.appealLegallyFinal
                  ? 'لصالح موكّلنا — نافذ'
                  : 'لصالح موكّلنا — قبول المنفذ',
            pillTone: 'emerald',
        };
    }

    return { ...state, visual: neutralVisual };
}

function remapDebtorAgentEnforcementPresentation(
    state: CreditorDecisionEnforcementState,
    hub: Decision,
    pipe: Decision,
    all: Decision[],
    opts: {
        hubTab: 'current' | 'previous' | 'appeals' | 'archive';
        appealLegallyFinal: boolean;
    }
): CreditorDecisionEnforcementState {
    const appealPill = debtorAgentAppealWorkflowPill(hub, pipe, all, opts);
    if (appealPill) return appealPill;

    const neutralVisual: DecisionCardEnforcementVisual = 'neutral';
    const keepLabelVisuals = new Set<DecisionCardEnforcementVisual>([
        'pending',
        'paused',
        'lifecycle_reset',
        'withdrawn',
    ]);
    if (keepLabelVisuals.has(state.visual)) {
        return { ...state, visual: neutralVisual };
    }

    const underlying = resolveUnderlyingDecisionHub(hub, all);
    return debtorAgentExecutorOutcomePill(underlying, pipe, state, opts);
}

/** مصدر واحد لشارة البطاقة ولونها — يعكس النفاذ الفعلي لا الموافقة الظاهرية فقط */
export function resolveCreditorDecisionEnforcementState(
    hub: Decision,
    pipe: Decision,
    opts: {
        hubTab: 'current' | 'previous' | 'appeals' | 'archive';
        appealLegallyFinal: boolean;
        needsExecutor: boolean;
        appealPerspective?: import('../../appealUiLabels').AppealUiPerspective;
        allDecisions?: Decision[];
    }
): CreditorDecisionEnforcementState {
    const all = Array.isArray(opts.allDecisions) ? opts.allDecisions : [];
    const finalize = (state: CreditorDecisionEnforcementState): CreditorDecisionEnforcementState =>
        opts.appealPerspective === 'debtor_agent'
            ? remapDebtorAgentEnforcementPresentation(state, hub, pipe, all, opts)
            : state;

    if (opts.needsExecutor) {
        return finalize({
            visual: 'pending',
            pillLabel: 'بانتظار القرار',
            pillTone: 'amber',
            enforced: false,
        });
    }

    if (hub.executorOutcome === 'withdrawn' || hub.lawyerWithdrawn === true) {
        return finalize({
            visual: 'withdrawn',
            pillLabel: 'تنازل / سحب الطلب',
            pillTone: 'slate',
            enforced: false,
        });
    }

    const perspective = opts.appealPerspective ?? 'creditor_agent';

    if (isManualExecutorLedgerDecision(hub)) {
        return finalize(resolveManualExecutorLedgerEnforcementState(hub));
    }

    if (isAppealDeadlinePerpetuallyEnforced(hub) || isAppealDeadlinePerpetuallyEnforced(pipe)) {
        return finalize({
            visual: 'enforced',
            pillLabel: 'القرار نافذ — نهائياً',
            pillTone: 'emerald',
            enforced: true,
        });
    }

    const gate = resolveCreditorRequestAppealGate(hub, pipe, perspective);
    if (gate.kind === 'paused') {
        return finalize({
            visual: 'paused',
            pillLabel: 'غير نافذ — مؤقتاً',
            pillTone: 'amber',
            enforced: false,
        });
    }
    if (gate.kind === 'lifecycle_reset') {
        return finalize({
            visual: 'lifecycle_reset',
            pillLabel: 'أُعيدت الدورة',
            pillTone: 'violet',
            enforced: false,
        });
    }
    if (gate.kind === 'revoked') {
        const waived = pipe.noAppealChosen === true || hub.noAppealChosen === true;
        return finalize({
            visual: 'not_enforced',
            pillLabel: waived ? 'مختوم — حسوم' : 'غير نافذ',
            pillTone: waived ? 'slate' : 'red',
            enforced: false,
        });
    }

    const phys = hub.executorOutcome;
    const eff = effectiveExecutorOutcomeForCreditorHubPill(hub, pipe, perspective);
    const creditorApproved =
        isCreditorPartyRequest(hub, perspective) &&
        (phys === 'approved' || phys === 'alternative');
    const effApproved = eff === 'approved' || eff === 'alternative';
    const enforced =
        creditorApproved &&
        effApproved &&
        isCreditorRequestFlowContinues(hub, pipe, perspective) &&
        (opts.appealLegallyFinal || effApproved);

    if (creditorApproved) {
        if (enforced && opts.appealLegallyFinal) {
            return finalize({
                visual: 'enforced',
                pillLabel: 'القرار نافذ',
                pillTone: 'emerald',
                enforced: true,
            });
        }
        if (effApproved && isCreditorRequestFlowContinues(hub, pipe, perspective)) {
            return finalize({
                visual: 'enforced',
                pillLabel: opts.hubTab === 'previous' ? 'قرار قبول' : 'قبول المنفذ',
                pillTone: 'emerald',
                enforced: true,
            });
        }
        return finalize({
            visual: 'not_enforced',
            pillLabel: eff === 'rejected' ? 'رفض المنفذ' : 'غير نافذ',
            pillTone: 'red',
            enforced: false,
        });
    }

    if (phys === 'rejected' || eff === 'rejected') {
        return finalize({
            visual: 'not_enforced',
            pillLabel: 'رفض المنفذ',
            pillTone: 'red',
            enforced: false,
        });
    }

    if (phys === 'approved' || phys === 'alternative') {
        if (opts.appealLegallyFinal) {
            return finalize({
                visual: 'enforced',
                pillLabel: 'القرار نافذ',
                pillTone: 'emerald',
                enforced: true,
            });
        }
        return finalize({
            visual: 'enforced',
            pillLabel: opts.hubTab === 'previous' ? 'قرار قبول' : 'قبول المنفذ',
            pillTone: 'emerald',
            enforced: true,
        });
    }

    return finalize({
        visual: 'not_enforced',
        pillLabel: 'غير نافذ',
        pillTone: 'slate',
        enforced: false,
    });
}

/** شارة حالة القرار على البطاقة — مع مراعاة التوقف المؤقت بعد قبول تظلم المدين */
export function resolveCreditorDecisionHubStatusPill(
    hub: Decision,
    pipe: Decision,
    opts: {
        hubTab: 'current' | 'previous' | 'appeals' | 'archive';
        appealLegallyFinal: boolean;
        phys: Decision['executorOutcome'];
        needsExecutor?: boolean;
        appealPerspective?: AppealUiPerspective;
        allDecisions?: Decision[];
    }
): { label: string; tone: DecisionHubStatusPillTone } | null {
    const state = resolveCreditorDecisionEnforcementState(hub, pipe, {
        hubTab: opts.hubTab,
        appealLegallyFinal: opts.appealLegallyFinal,
        needsExecutor: Boolean(opts.needsExecutor),
        appealPerspective: opts.appealPerspective,
        allDecisions: opts.allDecisions,
    });
    if (
        opts.phys !== 'approved' &&
        opts.phys !== 'alternative' &&
        state.visual === 'not_enforced' &&
        state.pillLabel === 'غير نافذ'
    ) {
        return { label: state.pillLabel, tone: state.pillTone };
    }
    if (opts.phys !== 'approved' && opts.phys !== 'alternative' && state.visual === 'enforced') {
        return null;
    }
    return { label: state.pillLabel, tone: state.pillTone };
}
