import type { Decision } from '../../types';
import { isDecisionLikeRow } from '../appealRequestOrigin';
import { compareDecisionsNewestFirst } from './decisionSortOrder';

function appealCopyHasPipelineState(copy: Decision): boolean {
    return (
        Boolean(copy.appealResult) ||
        Boolean(copy.awaitingCassationEntryBy) ||
        copy.appealStatus === 'tadhallum_filed' ||
        copy.appealStatus === 'tamyeez_filed' ||
        copy.appealPhase === 'grievance' ||
        copy.appealPhase === 'cassation' ||
        Boolean(copy.grievanceAcceptedAwaitingDebtorTamyeez) ||
        Boolean(copy.grievanceRejectedAwaitingTamyeez)
    );
}

export function getActiveAppealCopyForOriginal(original: Decision, all: Decision[]): Decision | null {
    if (!isDecisionLikeRow(original)) return null;
    if (original.appealSourceDecisionId) return null;
    if (original.activeAppealCopyId) {
        const linked = all.find((d) => d.id === original.activeAppealCopyId);
        if (linked) return linked;
    }
    const copies = all.filter((d) => d.appealSourceDecisionId === original.id);
    if (copies.length === 0) return null;
    const withPipeline = copies.filter(appealCopyHasPipelineState);
    const pool = withPipeline.length > 0 ? withPipeline : copies;
    return [...pool].sort(compareDecisionsNewestFirst)[0] ?? null;
}

export function appealPipelineRowForCard(row: Decision, all: Decision[]): Decision {
    const copy = getActiveAppealCopyForOriginal(row, all);
    if (copy) return copy;
    const sameId = all.find((d) => d.id === row.id);
    return sameId ?? row;
}
