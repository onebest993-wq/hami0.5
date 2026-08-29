import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    isManualExecutorAppealRow,
} from './manualExecutorLedger';
import {
    manualExecutorAwaitingCassationParty,
    resolveManualExecutorGrievanceResult,
} from './manualExecutorAppealActors';
import { cassationEntryPartyAfterGrievanceGrant, resolveGrievanceFilerActor, resolveHarmedPartyAppealActor } from './appealActorFiling';
export { resolveAppealActorLabel, appellantLabelFromLogMessage } from './appealActorLabels';
export { isCassationAffirmResult } from './appealCassationResultLabels';

/** يستنتج الطاعن لعرض شارة نتيجة الطعن عند غياب appealActor */
export function resolveEffectiveAppealActor(
    pipe: Decision,
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): 'lawyer' | 'debtor' | null {
    const result = String(pipe.appealResult ?? hub.appealResult ?? '').trim();
    if (result === 'قبول التظلم' || result === 'رد التظلم') {
        const filer =
            resolveGrievanceFilerActor(pipe, perspective) ??
            resolveGrievanceFilerActor(hub, perspective);
        if (filer) return filer;
    }
    if (pipe.appealActor === 'lawyer' || pipe.appealActor === 'debtor') return pipe.appealActor;
    if (hub.appealActor === 'lawyer' || hub.appealActor === 'debtor') return hub.appealActor;
    const filer = resolveGrievanceFilerActor(pipe, perspective) ?? resolveGrievanceFilerActor(hub, perspective);
    if (filer) return filer;
    const harmed = resolveHarmedPartyAppealActor(hub, perspective);
    if (harmed) return harmed;
    return null;
}

/** يصحّح الطرف المنتظر للتمييز عند تعارض الحقول القديمة مع نتيجة التظلم */
export function resolveEffectiveAwaitingCassationParty(
    pipe: Decision,
    hub?: Decision,
    all?: Decision[]
): 'lawyer' | 'debtor' | null {
    const h = hub ?? pipe;
    const underlying =
        all && all.length > 0 ? resolveUnderlyingDecisionHub(pipe, all) : h;
    const status = pipe.appealStatus ?? h.appealStatus;
    const phase = pipe.appealPhase ?? h.appealPhase;
    if (status === 'tamyeez_filed' || phase === 'cassation') {
        return null;
    }
    if (status === 'final') return null;

    const appealResult = String(pipe.appealResult ?? h.appealResult ?? '').trim();
    if (
        (status === 'tadhallum_filed' || phase === 'grievance') &&
        !appealResult &&
        !resolveManualExecutorGrievanceResult(pipe) &&
        !pipe.grievanceRejectedAwaitingTamyeez &&
        !h.grievanceRejectedAwaitingTamyeez
    ) {
        return null;
    }
    if (isManualExecutorAppealRow(pipe, all ?? [pipe, h, underlying])) {
        return (
            manualExecutorAwaitingCassationParty(pipe) ??
            manualExecutorAwaitingCassationParty(underlying)
        );
    }

    if (appealResult === 'قبول التظلم') {
        return (
            cassationEntryPartyAfterGrievanceGrant(pipe) ??
            cassationEntryPartyAfterGrievanceGrant(h) ??
            'lawyer'
        );
    }

    const stored = pipe.awaitingCassationEntryBy ?? h.awaitingCassationEntryBy ?? null;
    if (
        appealResult === 'رد التظلم' &&
        (pipe.grievanceRejectedAwaitingTamyeez || h.grievanceRejectedAwaitingTamyeez)
    ) {
        return stored ?? cassationEntryPartyAfterGrievanceGrant(pipe) ?? 'debtor';
    }

    return stored;
}
