/**
 * بناء MatrixInput من مرحلة حكم محفوظة — جسر تشغيلي لمحرك القرار النقي.
 * لا يغيّر التخزين؛ يُستخدم لشريط الطعن المسمّى (resolveTopBarChallengeActions).
 */
import {
    isDisputeIndivisible,
    isPartyOperativeReleased,
    JUDGMENT_FORM_GHIABI,
    normalizePartyJudgmentDispositions,
    type DisputeIntegrity,
} from './partyJudgmentDisposition';
import {
    LANE_STATE_APPEAL,
    LANE_STATE_CASSATION,
    LANE_STATE_LAPSED,
    LANE_STATE_LAPSED_EXECUTABLE,
    LANE_STATE_OBJECTION,
    LANE_STATE_WAIVED,
    normalizePartyChallengeLanes,
} from './partyChallengeLanes';
import {
    isLawsuitDefendantRecord,
    isLawsuitPlaintiffRecord,
    partitionLawsuitPartiesByRole,
} from './lawsuitPartyRole';
import type {
    MatrixInput,
    MatrixParty,
    PartyOutcome,
    PresenceForm,
    PartyRole,
} from './litigationDecisionEngine';

const CONSUMED = new Set([
    LANE_STATE_OBJECTION,
    LANE_STATE_APPEAL,
    LANE_STATE_CASSATION,
    LANE_STATE_WAIVED,
    LANE_STATE_LAPSED,
    LANE_STATE_LAPSED_EXECUTABLE,
]);

export type MatrixStageSource = {
    stageName?: string | null;
    name?: string | null;
    judgmentForm?: string | null;
    lastJudgmentType?: string | null;
    finalDecision?: string | null;
    disputeIntegrity?: DisputeIntegrity | string | null;
    partyJudgmentDispositions?: unknown;
    partyChallengeLanes?: unknown;
    parties?: Array<{
        id?: number | string;
        name?: string | null;
        role?: string | null;
        isClient?: boolean;
    }> | null;
};

function judgmentText(stage: MatrixStageSource): string {
    return String(stage.finalDecision ?? stage.lastJudgmentType ?? '').trim();
}

function plaintiffOutcomeFromJudgment(text: string): PartyOutcome {
    const t = text;
    if (!t) return 'PARTIAL';
    if (t.includes('كلياً') && t.includes('رد')) return 'FULL_LOSS';
    if (t.includes('بالكامل') || (t.includes('إجابة') && !t.includes('جزئ'))) return 'FULL_WIN';
    if (t.includes('جزئ')) return 'PARTIAL';
    if (t.includes('رد')) return 'FULL_LOSS';
    return 'PARTIAL';
}

function presenceForm(raw: string | null | undefined): PresenceForm {
    return String(raw ?? '').includes('غيابي') ? 'GHIABI' : 'HADORI';
}

function mapRole(party: { role?: string | null }): PartyRole {
    const role = String(party.role ?? '');
    if (role.includes('اختصام') || (role.includes('شخص ثالث') && !role.includes('انضمام'))) {
        return 'interpleader';
    }
    if (isLawsuitPlaintiffRecord(party)) return 'plaintiff';
    if (isLawsuitDefendantRecord(party)) return 'defendant';
    return 'defendant';
}

/**
 * يحوّل مرحلة البداءة/الأحوال بعد الحكم إلى مدخلات المحرك.
 * يُرجع null إن لم توجد أطراف كافية.
 */
export function buildLitigationMatrixInputFromStage(params: {
    stage: MatrixStageSource;
    /** أطراف العرض إن لم تُخزَّن على المرحلة */
    partiesFallback?: MatrixStageSource['parties'];
    parentIntegrity?: DisputeIntegrity | string | null;
}): MatrixInput | null {
    const stage = params.stage;
    const rawParties = (stage.parties?.length ? stage.parties : params.partiesFallback) ?? [];
    if (rawParties.length === 0) return null;

    const dispositions = normalizePartyJudgmentDispositions(stage.partyJudgmentDispositions);
    const lanes = normalizePartyChallengeLanes(stage.partyChallengeLanes);
    const consumedIds = new Set(
        lanes.filter((lane) => CONSUMED.has(lane.laneState)).map((lane) => lane.partyId),
    );
    const dispById = new Map(dispositions.map((row) => [row.partyId, row]));
    const judgment = judgmentText(stage);
    const pOutcome = plaintiffOutcomeFromJudgment(judgment);

    const matrixParties: MatrixParty[] = rawParties.map((party) => {
        const id = String(party.id ?? '');
        const role = mapRole(party);
        const disp = dispById.get(id);
        let outcome: PartyOutcome = 'FULL_LOSS';
        if (role === 'plaintiff') {
            outcome = pOutcome;
        } else if (disp && isPartyOperativeReleased(disp)) {
            outcome = 'EXEMPT';
        } else if (role === 'interpleader') {
            outcome = pOutcome === 'FULL_WIN' ? 'FULL_LOSS' : pOutcome === 'FULL_LOSS' ? 'FULL_WIN' : 'PARTIAL';
        } else {
            outcome = 'FULL_LOSS';
        }
        return {
            id,
            name: String(party.name ?? id),
            role,
            outcome,
            form: presenceForm(disp?.form ?? stage.judgmentForm),
            challengeConsumed: consumedIds.has(id),
        };
    });

    const { plaintiffs, defendants } = partitionLawsuitPartiesByRole(rawParties);
    if (plaintiffs.length === 0 && defendants.length === 0) return null;

    const integrity = stage.disputeIntegrity ?? params.parentIntegrity;
    return {
        parties: matrixParties.filter((row) => Boolean(row.id)),
        isJointOrIndivisible: isDisputeIndivisible(integrity as DisputeIntegrity | null | undefined),
        hasCrossAppeal: false,
    };
}
