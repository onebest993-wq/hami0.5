/**
 * توجيهات ما بعد حكم الاعتراض — شارات الاستئناف المستأخر دون تغيير الشكل.
 */
import type { CaseStage } from '../../LawyerShared';
import {
    classifyAbsentObjectionOutcome,
    resolveObjectionAppealNotices,
    resolveObjectionResumeWarning,
    type AbsentObjectionClientRole,
    type AbsentObjectionOutcome,
} from '@/app/domain/lawsuit/objectionAppealConsequence';
import {
    isDisputeIndivisible,
    isPresentLikeJudgmentForm,
    normalizePartyJudgmentDispositions,
    partyDispositionId,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { resolveAbsentObjectionClientRole } from './absentJudgmentFlow';
import { isAbsentObjectionStageName } from './absentJudgmentStageNames';
import { isArt172AppealStayActive, isGhayabiObjectionPending, resolvePriorFirstInstanceJudgmentSource } from './art172AppealStay';
import { isAppealStageName } from './judgmentStageNames';
import { normalizePartyId, readAppellantPartyIds } from './judgmentStageMetadataTypes';
import { resolveClientMarkedParty } from './clientMarkedParty';

function findObjectionStage(stages?: CaseStage[] | null): CaseStage | undefined {
    return (stages ?? []).find((stage) => isAbsentObjectionStageName(String(stage.stageName ?? stage.name ?? '')));
}

function findAppealStage(stages?: CaseStage[] | null): CaseStage | undefined {
    return (stages ?? []).find((stage) => isAppealStageName(String(stage.stageName ?? stage.name ?? '')));
}

/** منطوق حكم البداءة (ربح/جزئي) لا يُقرأ كحسم للاعتراض إلا إذا ذُكر الاعتراض أو الغياب صراحة. */
function looksLikeObjectionMeritText(text: string): boolean {
    const t = text.trim();
    if (!t) return false;
    return (
        t.includes('اعتراض')
        || t.includes('الحكم الغيابي')
        || t.includes('م/179')
        || t.includes('تأييد الحكم')
        || t.includes('تعديل الحكم الغيابي')
        || t.includes('تعديل جزئي')
    );
}

export function resolveDossierObjectionOutcome(stages?: CaseStage[] | null): AbsentObjectionOutcome | null {
    const objection = findObjectionStage(stages);
    if (!objection) return null;
    const decided = String(objection.finalDecision ?? '').trim();
    const dated = String(objection.decisionDate ?? '').trim();
    if (!decided && !dated) return null;
    if (decided) {
        const fromFinal = classifyAbsentObjectionOutcome(decided);
        if (fromFinal) return fromFinal;
    }
    const last = String(objection.lastJudgmentType ?? '').trim();
    if (!looksLikeObjectionMeritText(last)) return null;
    return classifyAbsentObjectionOutcome(last);
}

export function resolveDossierObjectionClientRole(stages?: CaseStage[] | null): AbsentObjectionClientRole {
    const objection = findObjectionStage(stages);
    return resolveAbsentObjectionClientRole(objection?.parties ?? null);
}

function clientIsPresentAppellant(params: {
    stages?: CaseStage[] | null;
    displayStage?: CaseStage | null;
}): boolean {
    const appeal = findAppealStage(params.stages) ?? (
        isAppealStageName(String(params.displayStage?.stageName ?? '')) ? params.displayStage : null
    );
    if (!appeal) return false;
    const client = resolveClientMarkedParty(appeal.parties)
        ?? resolveClientMarkedParty(params.displayStage?.parties);
    const clientId = normalizePartyId(client?.id ?? null);
    if (!clientId) return false;
    const appellantIds = readAppellantPartyIds(appeal.appealMetadata);
    if (!appellantIds.includes(clientId)) return false;
    const source = resolvePriorFirstInstanceJudgmentSource(params.stages);
    const dispositions = normalizePartyJudgmentDispositions(source?.partyJudgmentDispositions);
    const row = dispositions.find((item) => partyDispositionId({ id: item.partyId }) === clientId);
    if (row) return isPresentLikeJudgmentForm(row.form);
    return true;
}

export function resolveObjectionAppealGuidanceNotices(params: {
    displayStage?: CaseStage | null;
    stages?: CaseStage[] | null;
    parentIntegrity?: string | null;
}): string[] {
    const outcome = resolveDossierObjectionOutcome(params.stages);
    const viewingName = String(params.displayStage?.stageName ?? params.displayStage?.name ?? '');
    if (!isAppealStageName(viewingName) && !isAbsentObjectionStageName(viewingName)) {
        return [];
    }
    const objectionResolved = !isGhayabiObjectionPending({ stages: params.stages });
    if (!outcome || !objectionResolved) return [];
    return resolveObjectionAppealNotices({
        outcome,
        clientRole: resolveDossierObjectionClientRole(params.stages),
        stayActive: isArt172AppealStayActive(params.displayStage)
            || isArt172AppealStayActive(findAppealStage(params.stages)),
        objectionResolved,
        indivisible: isDisputeIndivisible(
            params.parentIntegrity
            ?? resolvePriorFirstInstanceJudgmentSource(params.stages)?.disputeIntegrity,
        ),
        clientIsPresentAppellant: clientIsPresentAppellant(params),
    });
}

export function resolveArt172ResumeWarning(params: {
    stages?: CaseStage[] | null;
}): string | null {
    return resolveObjectionResumeWarning({
        outcome: resolveDossierObjectionOutcome(params.stages),
        clientRole: resolveDossierObjectionClientRole(params.stages),
    });
}
