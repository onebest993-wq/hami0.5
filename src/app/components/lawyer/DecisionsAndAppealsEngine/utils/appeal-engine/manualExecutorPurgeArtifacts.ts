import type { Decision } from '../../types';
import { resolveExecutorDecisionStatusFlag } from './manualExecutorIdentity';

/** يزيل نسخ الطعن القديمة ويُبقي منظومة الحالات الثلاث على البطاقة الأصلية */
export function purgeManualExecutorAppealArtifacts(all: Decision[]): {
    rows: Decision[];
    mutated: boolean;
} {
    const manualIds = new Set(
        all.filter((d) => d.manualExecutorLedgerEntry === true).map((d) => String(d.id))
    );
    const stripped = (row: Decision): Decision => {
        const flag = resolveExecutorDecisionStatusFlag(row);
        return {
            ...row,
            activeAppealCopyId: null,
            appealRequestOrigin: undefined,
            appealActor: null,
            appealMethod: null,
            appealPhase: null,
            appealStatus: 'pending',
            appealResult: undefined,
            appealWorkflowState: 'NONE',
            awaitingCassationEntryBy: null,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            manualGrievanceAppellants: undefined,
            manualCassationAppellants: undefined,
            noAppealChosen: false,
            manualExecutorEnforced: undefined,
            executorDecisionStatusFlag: flag,
            manualExecutorAppealAppellant:
                flag === 2 || flag === 3 ? row.manualExecutorAppealAppellant : undefined,
            manualExecutorAppealKind:
                flag === 2 || flag === 3 ? row.manualExecutorAppealKind : undefined,
            manualExecutorWorkflowPhase:
                flag === 2 ? row.manualExecutorWorkflowPhase : undefined,
            manualExecutorGrievanceOutcome:
                flag === 2 || flag === 3 ? row.manualExecutorGrievanceOutcome : undefined,
        };
    };
    const filtered = all.filter(
        (d) =>
            !d.appealSourceDecisionId ||
            !manualIds.has(String(d.appealSourceDecisionId))
    );
    let mutated = filtered.length !== all.length;
    const rows = filtered.map((d) => {
        if (d.manualExecutorLedgerEntry !== true) return d;
        const next = stripped(d);
        if (
            next.activeAppealCopyId !== d.activeAppealCopyId ||
            next.appealActor !== d.appealActor ||
            next.appealMethod !== d.appealMethod ||
            next.appealPhase !== d.appealPhase ||
            next.appealStatus !== d.appealStatus ||
            next.appealResult !== d.appealResult ||
            next.appealWorkflowState !== d.appealWorkflowState ||
            next.awaitingCassationEntryBy !== d.awaitingCassationEntryBy ||
            next.grievanceRejectedAwaitingTamyeez !== d.grievanceRejectedAwaitingTamyeez ||
            next.grievanceAcceptedAwaitingDebtorTamyeez !==
                d.grievanceAcceptedAwaitingDebtorTamyeez ||
            next.manualGrievanceAppellants !== d.manualGrievanceAppellants ||
            next.manualCassationAppellants !== d.manualCassationAppellants ||
            next.noAppealChosen !== d.noAppealChosen ||
            next.executorDecisionStatusFlag !== d.executorDecisionStatusFlag ||
            next.manualExecutorAppealAppellant !== d.manualExecutorAppealAppellant ||
            next.manualExecutorAppealKind !== d.manualExecutorAppealKind ||
            next.manualExecutorWorkflowPhase !== d.manualExecutorWorkflowPhase ||
            next.manualExecutorGrievanceOutcome !== d.manualExecutorGrievanceOutcome ||
            next.manualExecutorEnforced !== d.manualExecutorEnforced
        ) {
            mutated = true;
        }
        return next;
    });
    return { rows, mutated };
}
