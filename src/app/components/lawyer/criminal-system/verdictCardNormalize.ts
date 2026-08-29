import { computeAppealDeadline } from './trialSessionsEngine';
import type {
    VerdictCard,
    VerdictCorrectionAppealTrack,
    VerdictInterventionAppealTrack,
    VerdictOrdinaryAppealTrack,
} from './verdictCardTypes';
import { isVerdictCardOutcome } from './verdictCardPresentation';
import type { MasterPenaltyKind, StageFinalPenaltyBlock } from './stageFinalDecisionTypes';

export function normalizeVerdictCards(raw: unknown): VerdictCard[] {
    if (!Array.isArray(raw)) return [];
    const out: VerdictCard[] = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const o = row as Partial<VerdictCard>;
        const outcome = String(o.outcome ?? '').trim();
        if (!isVerdictCardOutcome(outcome)) continue;
        const id = String(o.id ?? '').trim();
        const issuedAt = String(o.issuedAt ?? '').trim();
        if (!id || !issuedAt) continue;
        out.push({
            id,
            outcome,
            issuedAt,
            appealDeadline:
                String(o.appealDeadline ?? '').trim() || computeAppealDeadline(issuedAt),
            decisionDraft:
                typeof o.decisionDraft === 'string' && o.decisionDraft.trim()
                    ? o.decisionDraft.trim()
                    : undefined,
            sourceConclusionId:
                typeof o.sourceConclusionId === 'string' && o.sourceConclusionId.trim()
                    ? o.sourceConclusionId.trim()
                    : undefined,
            proceduralNodeId:
                typeof o.proceduralNodeId === 'string' && o.proceduralNodeId.trim()
                    ? o.proceduralNodeId.trim()
                    : undefined,
            defendantIds: Array.isArray(o.defendantIds)
                ? o.defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean)
                : undefined,
            ordinaryAppeal: normalizeOrdinaryAppeal(o.ordinaryAppeal),
            interventionAppeal: normalizeInterventionAppeal(o.interventionAppeal),
            correctionAppeal: normalizeCorrectionAppeal(o.correctionAppeal),
            finalDecisionKind:
                o.finalDecisionKind === 'conviction_penalty' ||
                o.finalDecisionKind === 'acquittal' ||
                o.finalDecisionKind === 'release' ||
                o.finalDecisionKind === 'criminal_expiration' ||
                o.finalDecisionKind === 'settlement_waiver'
                    ? o.finalDecisionKind
                    : undefined,
            presenceType: o.presenceType === 'غيابي' ? 'غيابي' : o.presenceType === 'وجاهي' ? 'وجاهي' : undefined,
            penalty: normalizePenaltyBlock(o.penalty),
            caseCrimeType:
                o.caseCrimeType === 'جناية' || o.caseCrimeType === 'جنحة' || o.caseCrimeType === 'مخالفة'
                    ? o.caseCrimeType
                    : undefined,
            absentiaPublicationDate:
                typeof o.absentiaPublicationDate === 'string' && o.absentiaPublicationDate.trim()
                    ? o.absentiaPublicationDate.trim()
                    : undefined,
            absentiaObjectionDeadline:
                typeof o.absentiaObjectionDeadline === 'string' && o.absentiaObjectionDeadline.trim()
                    ? o.absentiaObjectionDeadline.trim()
                    : undefined,
            absentiaObjectionFiled: o.absentiaObjectionFiled === true ? true : undefined,
            absentiaTreatedAsInPerson: o.absentiaTreatedAsInPerson === true ? true : undefined,
            cassationAppealFiled: o.cassationAppealFiled === true ? true : undefined,
            decisionProcedurePath:
                o.decisionProcedurePath === 'summary' || o.decisionProcedurePath === 'full'
                    ? o.decisionProcedurePath
                    : undefined,
        });
    }
    return out;
}

function normalizePenaltyBlock(raw: unknown): StageFinalPenaltyBlock | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    const masterKind = String(o.masterKind ?? '').trim();
    if (
        masterKind !== 'severe_imprisonment' &&
        masterKind !== 'simple_imprisonment' &&
        masterKind !== 'fine' &&
        masterKind !== 'combined_imprisonment_fine'
    ) {
        return undefined;
    }
    const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return {
        masterKind: masterKind as MasterPenaltyKind,
        years: num(o.years),
        months: num(o.months),
        fineAmountIqd: num(o.fineAmountIqd),
        substituteImprisonmentDays: num(o.substituteImprisonmentDays),
        substituteImprisonmentMonths: num(o.substituteImprisonmentMonths),
        suspendedExecution: o.suspendedExecution === true ? true : undefined,
        suspendedExecutionReason:
            typeof o.suspendedExecutionReason === 'string' && o.suspendedExecutionReason.trim()
                ? o.suspendedExecutionReason.trim()
                : undefined,
        penalties_supplementary: (() => {
            const fromNew =
                typeof o.penalties_supplementary === 'string' ? o.penalties_supplementary.trim() : '';
            if (fromNew) return fromNew;
            const fromLegacy = typeof o.accessory_penalties === 'string' ? o.accessory_penalties.trim() : '';
            return fromLegacy || undefined;
        })(),
    };
}

function normalizeOrdinaryAppeal(raw: unknown): VerdictOrdinaryAppealTrack | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as VerdictOrdinaryAppealTrack;
    const next: VerdictOrdinaryAppealTrack = {};
    if (typeof o.cassationDossierNumber === 'string' && o.cassationDossierNumber.trim()) {
        next.cassationDossierNumber = o.cassationDossierNumber.trim();
    }
    if (typeof o.filedAt === 'string' && o.filedAt.trim()) next.filedAt = o.filedAt.trim();
    if (typeof o.result === 'string' && o.result.trim()) next.result = o.result.trim();
    if (typeof o.courtLabel === 'string' && o.courtLabel.trim()) next.courtLabel = o.courtLabel.trim();
    if (typeof o.issuedBy === 'string' && o.issuedBy.trim()) next.issuedBy = o.issuedBy.trim();
    if (typeof o.resultRecordedAt === 'string' && o.resultRecordedAt.trim()) {
        next.resultRecordedAt = o.resultRecordedAt.trim();
    }
    if (typeof o.referredCourtStage === 'string' && o.referredCourtStage.trim()) {
        next.referredCourtStage = o.referredCourtStage.trim();
    }
    if (typeof o.bindingDirections === 'string' && o.bindingDirections.trim()) {
        next.bindingDirections = o.bindingDirections.trim();
    }
    if (typeof o.penaltyModificationText === 'string' && o.penaltyModificationText.trim()) {
        next.penaltyModificationText = o.penaltyModificationText.trim();
    }
    return Object.keys(next).length ? next : undefined;
}

function normalizeInterventionAppeal(raw: unknown): VerdictInterventionAppealTrack | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as VerdictInterventionAppealTrack;
    const next: VerdictInterventionAppealTrack = {};
    if (typeof o.targetedDecisionDescription === 'string' && o.targetedDecisionDescription.trim()) {
        next.targetedDecisionDescription = o.targetedDecisionDescription.trim();
    }
    if (typeof o.interventionRequestNumber === 'string' && o.interventionRequestNumber.trim()) {
        next.interventionRequestNumber = o.interventionRequestNumber.trim();
    }
    if (typeof o.referredToAuthority === 'string' && o.referredToAuthority.trim()) {
        next.referredToAuthority = o.referredToAuthority.trim();
    }
    if (typeof o.status === 'string' && o.status.trim()) next.status = o.status.trim();
    return Object.keys(next).length ? next : undefined;
}

function normalizeCorrectionAppeal(raw: unknown): VerdictCorrectionAppealTrack | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as VerdictCorrectionAppealTrack;
    const next: VerdictCorrectionAppealTrack = {};
    if (typeof o.targetedDecisionDescription === 'string' && o.targetedDecisionDescription.trim()) {
        next.targetedDecisionDescription = o.targetedDecisionDescription.trim();
    }
    if (typeof o.correctionRequestNumber === 'string' && o.correctionRequestNumber.trim()) {
        next.correctionRequestNumber = o.correctionRequestNumber.trim();
    }
    if (typeof o.filedAt === 'string' && o.filedAt.trim()) next.filedAt = o.filedAt.trim();
    if (typeof o.status === 'string' && o.status.trim()) next.status = o.status.trim();
    return Object.keys(next).length ? next : undefined;
}
