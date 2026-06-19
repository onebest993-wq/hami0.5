import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import { resolveRequestProponent } from '../appealRequestOrigin';
import {
    isManualExecutorAppealRow,
    manualExecutorAwaitingCassationParty,
    resolveManualExecutorGrievanceResult,
} from './manualExecutorLedger';
import {
    resolveGrievanceFilerActor,
    resolveHarmedPartyAppealActor,
    cassationEntryPartyAfterGrievanceGrant,
} from './appealWorkflowActors';

export function resolveAppealActorLabel(
    d: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): string {
    const debtorLabel = perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    if (d.appealActor === 'lawyer') return 'الدائن';
    if (d.appealActor === 'debtor') return debtorLabel;
    const filer =
        resolveGrievanceFilerActor(d, perspective) ??
        resolveHarmedPartyAppealActor(d, perspective);
    if (filer === 'debtor') return debtorLabel;
    if (filer === 'lawyer') return 'الدائن';
    const proponent = resolveRequestProponent(d, perspective);
    if (proponent === 'debtor') return debtorLabel;
    if (proponent === 'creditor') return 'الدائن';
    if (proponent === 'executor') return 'المنفذ';
    return '—';
}

export function appellantLabelFromLogMessage(
    message: string,
    perspective: AppealUiPerspective = 'creditor_agent'
): string | null {
    const m = String(message || '');
    const debtorLabel = perspective === 'debtor_agent' ? 'موكّلنا' : 'المدين';
    if (/موكّ?ل\s*المدين|موكّ?لنا|تظلم\s+موكّ?ل/.test(m)) return debtorLabel;
    if (/تمييز\s+موكّ?ل|تمييز\s+المدين|المدين.*تمييز|تظلم\s+المدين/.test(m)) return debtorLabel;
    if (/تمييز\s+الدائن|تمييز\s+وكيل|وكيل\s+الدائن.*تمييز|تظلم\s+الدائن|تظلم\s+وكيل/.test(m)) {
        return 'الدائن';
    }
    if (/المدين/.test(m)) return debtorLabel;
    if (/وكيل\s*الدائن|الدائن/.test(m)) return 'الدائن';
    return null;
}

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

export function isCassationAffirmResult(result: string | undefined | null): boolean {
    const r = String(result ?? '').trim();
    return r === 'تصديق القرار' || r === 'رد اللائحة';
}
