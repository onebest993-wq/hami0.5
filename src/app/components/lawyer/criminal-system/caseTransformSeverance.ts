/**
 * Pure case transforms for CriminalCase — investigation severance domain:
 * target validation, party-id scrubbing, judicial severance requests, and
 * exclusive-membership partition helpers used when splitting a dossier.
 * None of these touch the Zustand store directly.
 */
import {
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    JudicialDecision,
} from '@/app/types/criminal';
import type {
    CriminalCase,
    CriminalComplainant,
    CriminalDefendant,
    LawyerRequest,
    PendingSeveranceContext,
    Statement,
} from './criminalCaseModel';
import {
    INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE,
} from './proceduralRequestTypes';
import {
    statementBelongsToSeveredDefendantsByName,
} from './severanceMigrationEngine';
import {
    stampSeveranceDecisionLinkage,
} from './severanceCassationEngine';
import {
    resolveDefendantFullName,
} from './criminalUnknownDefendant';
import {
    validateDefendantSeveranceSelection,
} from './investigationDefendantPurge';
import {
    stampProceduralNodeId,
} from './caseTransformShared';
import {
    upsertJudicialDecisionOnCase,
} from './caseTransformJudicialOutcome';

export function validateInvestigationSeveranceTargets(
    defendants: CriminalDefendant[] | undefined,
    targetIds: string[],
): string | null {
    return validateDefendantSeveranceSelection(defendants, targetIds);
}

export function statementBelongsToSeveredDefendants(
    statement: Statement,
    severedNames: Set<string>,
): boolean {
    return statementBelongsToSeveredDefendantsByName(statement, severedNames);
}

export function scrubRemovedPartyIdsFromLawyerRequests(
    requests: LawyerRequest[] | undefined,
    removedIds: Set<string>,
): LawyerRequest[] {
    return (Array.isArray(requests) ? requests : []).map((req) => {
        const nextIds = (Array.isArray(req.defendantIds) ? req.defendantIds : [])
            .map((x) => String(x ?? '').trim())
            .filter((id) => id && !removedIds.has(id));
        return {
            ...req,
            defendantIds: nextIds.length ? nextIds : undefined,
        };
    });
}

export function scrubRemovedPartyIdsFromJudicialDecisions(
    decisions: JudicialDecision[] | undefined,
    removedIds: Set<string>,
): JudicialDecision[] {
    return (Array.isArray(decisions) ? decisions : []).map((d) => {
        const defendantIds = (Array.isArray(d.defendantIds) ? d.defendantIds : [])
            .map((x) => String(x ?? '').trim())
            .filter((id) => id && !removedIds.has(id));
        const beneficiaryPartyIds = (Array.isArray(d.beneficiaryPartyIds) ? d.beneficiaryPartyIds : [])
            .map((x) => String(x ?? '').trim())
            .filter((id) => id && !removedIds.has(id));
        return {
            ...d,
            defendantIds: defendantIds.length ? defendantIds : undefined,
            beneficiaryPartyIds: beneficiaryPartyIds.length ? beneficiaryPartyIds : undefined,
        };
    });
}

export function appendJudicialSeveranceRequestOnParent(
    caseRecord: CriminalCase,
    ctx: PendingSeveranceContext,
    linkage?: { childCaseId: string; parentDefendantIds: string[] },
): CriminalCase {
    const draft = ctx.judicialSeveranceDraft;
    if (!draft) return caseRecord;
    const requestDate = String(draft.requestDate ?? '').trim();
    const lawyerNoteBase = String(draft.lawyerNote ?? '').trim();
    if (!requestDate || !lawyerNoteBase) return caseRecord;
    const severedNames = ctx.defendantSnapshots
        .map((d) => resolveDefendantFullName(d))
        .filter(Boolean)
        .join('، ');
    const lawyerNote = severedNames
        ? `${lawyerNoteBase}\nالمتهمون المشمولون: ${severedNames}`
        : lawyerNoteBase;
    const request: LawyerRequest = {
        id: createId(),
        requestDate,
        type: INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE,
        lawyerNote,
        status: 'executed',
        defendantIds: undefined,
        proceduralTemplate: INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE,
        isAppealable: draft.isAppealable === true,
        isLocked: true,
        decisionArchived: true,
        judgeMargin: lawyerNote,
        decisionDate: requestDate,
    };
    const nodeId = resolveCurrentJourneyNodeId(caseRecord.stageJourney);
    const stamped = stampProceduralNodeId(request, nodeId);
    const reqs = Array.isArray(caseRecord.lawyerRequests) ? caseRecord.lawyerRequests : [];
    let nextCase: CriminalCase = { ...caseRecord, lawyerRequests: [...reqs, stamped] };
    nextCase = upsertJudicialDecisionOnCase(nextCase, stamped);
    if (linkage?.childCaseId && linkage.parentDefendantIds?.length) {
        nextCase = stampSeveranceDecisionLinkage(nextCase, {
            childCaseId: linkage.childCaseId,
            parentDefendantIds: linkage.parentDefendantIds,
            sourceRequestId: stamped.id,
        });
    }
    return nextCase;
}

export function pruneCounterComplaintTargetsAfterPartyRemoval(
    complainants: CriminalComplainant[],
    removedPartyId: string,
): CriminalComplainant[] {
    const rid = String(removedPartyId ?? '').trim();
    if (!rid) return complainants;
    return complainants.map((c) => {
        const raw = c.counterComplaintTargetDefendantIds;
        if (raw === undefined) return c;
        const next = (Array.isArray(raw) ? raw : []).filter((id) => String(id ?? '').trim() !== rid);
        if (!next.length) {
            const { counterComplaintTargetDefendantIds: _drop, ...rest } = c;
            return { ...rest, counterComplaintTargetDefendantIds: undefined };
        }
        return { ...c, counterComplaintTargetDefendantIds: next };
    });
}

/**
 * يفحص ما إذا كان مصفوفة المعرّفات (defendantIds الخاصة بعنصر) منتمية حصراً إلى المجموعة `allowed`.
 * - عنصر بلا أي معرّفات لا يُعدّ «حصرياً» (يبقى في الإضبارة الأم) — احتراز ضد الترحيل غير المقصود.
 * - عنصر يحوي معرّفاً واحداً على الأقل خارج المجموعة لا يُرحَّل (مشترك).
 */
export function itemIsExclusiveToDefendants(itemIds: string[] | undefined, allowed: Set<string>): boolean {
    const ids = (Array.isArray(itemIds) ? itemIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (!ids.length) return false;
    return ids.every((id) => allowed.has(id));
}

/**
 * يُقسّم قائمة عناصر إلى مجموعتين: (kept) لتبقى في الإضبارة الأم،
 * و (migrated) لتُرحَّل إلى الإضبارة الجديدة المُفرَّقة.
 */
export function partitionItemsByDefendantsExclusive<T>(
    items: T[] | undefined,
    allowed: Set<string>,
    getIds: (item: T) => string[] | undefined,
): { kept: T[]; migrated: T[] } {
    const list = Array.isArray(items) ? items : [];
    const kept: T[] = [];
    const migrated: T[] = [];
    for (const item of list) {
        if (itemIsExclusiveToDefendants(getIds(item), allowed)) {
            migrated.push(item);
        } else {
            kept.push(item);
        }
    }
    return { kept, migrated };
}
