import type { CriminalCase, CriminalComplainant, CriminalDefendant, InvestigationLog, LawyerRequest, TimelineEvent } from './criminalStore';
import type { JudicialDecision } from '@/app/types/criminal';
import { resolveDefendantFullName } from './criminalUnknownDefendant';

export type SeverancePartyIdMaps = {
    defendantId: Map<string, string>;
    complainantId: Map<string, string>;
};

function normalizePartyName(value: string): string {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ');
}

function collectIds(values: Array<string | undefined | null> | undefined): string[] {
    return (Array.isArray(values) ? values : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
}

function uniqueIds(ids: string[]): string[] {
    return [...new Set(ids)];
}

/** يبني خريطة معرّفات الأم → الابنة للمتهمين المفرّقين والمشتكين (بالاسم). */
export function buildSeverancePartyIdMaps(
    parent: CriminalCase,
    childDefendants: CriminalDefendant[],
    parentSeveredDefendantIds: string[],
    childComplainants: CriminalComplainant[] | undefined,
): SeverancePartyIdMaps {
    const defendantId = new Map<string, string>();
    parentSeveredDefendantIds.forEach((parentId, index) => {
        const childId = String(childDefendants[index]?.id ?? '').trim();
        if (parentId && childId) defendantId.set(parentId, childId);
    });

    const complainantId = new Map<string, string>();
    const parentComplainants = Array.isArray(parent.complainants) ? parent.complainants : [];
    const childList = Array.isArray(childComplainants) ? childComplainants : [];
    for (const pc of parentComplainants) {
        const parentName = normalizePartyName(pc.fullName);
        if (!parentName) continue;
        const match = childList.find((c) => normalizePartyName(c.fullName) === parentName);
        if (match?.id) complainantId.set(pc.id, match.id);
    }

    return { defendantId, complainantId };
}

function remapPartyId(id: string, maps: SeverancePartyIdMaps): string {
    const trimmed = String(id ?? '').trim();
    if (!trimmed) return trimmed;
    return maps.defendantId.get(trimmed) ?? maps.complainantId.get(trimmed) ?? trimmed;
}

function remapIdList(ids: string[] | undefined, maps: SeverancePartyIdMaps): string[] | undefined {
    const next = uniqueIds(collectIds(ids ?? []).map((id) => remapPartyId(id, maps)));
    return next.length ? next : undefined;
}

/** كل معرّفات الأطراف المرتبطة بطلب المحامي. */
export function resolveLawyerRequestPartyIds(
    request: LawyerRequest,
    _parent?: CriminalCase,
): string[] {
    const ids: string[] = [...collectIds(request.defendantIds)];
    for (const row of request.assetSeizure?.perDefendant ?? []) {
        ids.push(String(row.defendantId ?? '').trim());
    }
    return uniqueIds(ids.filter(Boolean));
}

export function resolveJudicialDecisionPartyIds(decision: JudicialDecision): string[] {
    return uniqueIds([
        ...collectIds(decision.defendantIds),
        ...collectIds(decision.beneficiaryPartyIds),
    ]);
}

export function resolveInvestigationLogPartyIds(log: InvestigationLog): string[] {
    return uniqueIds([
        ...collectIds(log.defendantIds),
        ...collectIds(log.linkedPartyId ? [log.linkedPartyId] : []),
    ]);
}

export function resolveTimelineEventPartyIds(event: TimelineEvent): string[] {
    return uniqueIds([
        ...collectIds(event.defendantIds),
        ...collectIds(event.complainantIds),
        ...collectIds(event.targetDefendantId ? [event.targetDefendantId] : []),
    ]);
}

/**
 * يُرحَّل العنصر فقط إذا:
 * - له معرّفات أطراف صريحة،
 * - كل متهم مُشار إليه ضمن المفرّقين،
 * - أي مشتكٍ مُشار إليه مربوط بحصراً بالمفرّقين (شكوى متقابلة)،
 * - لا يوجد أي إشارة لمتهم غير مفرّق.
 */
export function shouldMigrateExclusivePartyItem(
    partyIds: string[],
    allowedSeveredDefendantIds: Set<string>,
    parent: CriminalCase,
): boolean {
    const ids = uniqueIds(collectIds(partyIds));
    if (!ids.length) return false;

    const parentDefIds = new Set(
        (Array.isArray(parent.defendants) ? parent.defendants : []).map((d) => d.id),
    );
    const complainants = Array.isArray(parent.complainants) ? parent.complainants : [];
    const complainantById = new Map(complainants.map((c) => [c.id, c]));

    for (const id of ids) {
        if (allowedSeveredDefendantIds.has(id)) continue;

        if (parentDefIds.has(id)) {
            return false;
        }

        const complainant = complainantById.get(id);
        if (complainant) {
            const targets = Array.isArray(complainant.counterComplaintTargetDefendantIds)
                ? complainant.counterComplaintTargetDefendantIds
                      .map((x) => String(x ?? '').trim())
                      .filter(Boolean)
                : [];
            if (!targets.length) return false;
            if (!targets.every((targetId) => allowedSeveredDefendantIds.has(targetId))) {
                return false;
            }
            continue;
        }

        return false;
    }

    return true;
}

export function partitionLawyerRequestsForSeverance(
    requests: LawyerRequest[] | undefined,
    allowedSeveredDefendantIds: Set<string>,
    parent: CriminalCase,
): { kept: LawyerRequest[]; migrated: LawyerRequest[] } {
    const list = Array.isArray(requests) ? requests : [];
    const kept: LawyerRequest[] = [];
    const migrated: LawyerRequest[] = [];
    for (const req of list) {
        const partyIds = resolveLawyerRequestPartyIds(req, parent);
        if (shouldMigrateExclusivePartyItem(partyIds, allowedSeveredDefendantIds, parent)) {
            migrated.push(req);
        } else {
            kept.push(req);
        }
    }
    return { kept, migrated };
}

export function partitionJudicialDecisionsForSeverance(
    decisions: JudicialDecision[] | undefined,
    allowedSeveredDefendantIds: Set<string>,
    parent: CriminalCase,
): { kept: JudicialDecision[]; migrated: JudicialDecision[] } {
    const list = Array.isArray(decisions) ? decisions : [];
    const kept: JudicialDecision[] = [];
    const migrated: JudicialDecision[] = [];
    for (const decision of list) {
        const partyIds = resolveJudicialDecisionPartyIds(decision);
        if (shouldMigrateExclusivePartyItem(partyIds, allowedSeveredDefendantIds, parent)) {
            migrated.push(decision);
        } else {
            kept.push(decision);
        }
    }
    return { kept, migrated };
}

export function partitionInvestigationLogsForSeverance(
    logs: InvestigationLog[] | undefined,
    allowedSeveredDefendantIds: Set<string>,
    parent: CriminalCase,
): { kept: InvestigationLog[]; migrated: InvestigationLog[] } {
    const list = Array.isArray(logs) ? logs : [];
    const kept: InvestigationLog[] = [];
    const migrated: InvestigationLog[] = [];
    for (const log of list) {
        const partyIds = resolveInvestigationLogPartyIds(log);
        if (shouldMigrateExclusivePartyItem(partyIds, allowedSeveredDefendantIds, parent)) {
            migrated.push(log);
        } else {
            kept.push(log);
        }
    }
    return { kept, migrated };
}

export function partitionTimelineEventsForSeverance(
    events: TimelineEvent[] | undefined,
    allowedSeveredDefendantIds: Set<string>,
    parent: CriminalCase,
): { kept: TimelineEvent[]; migrated: TimelineEvent[] } {
    const list = Array.isArray(events) ? events : [];
    const kept: TimelineEvent[] = [];
    const migrated: TimelineEvent[] = [];
    for (const event of list) {
        const partyIds = resolveTimelineEventPartyIds(event);
        if (shouldMigrateExclusivePartyItem(partyIds, allowedSeveredDefendantIds, parent)) {
            migrated.push(event);
        } else {
            kept.push(event);
        }
    }
    return { kept, migrated };
}

export function remapLawyerRequestForSeveredChild(
    request: LawyerRequest,
    maps: SeverancePartyIdMaps,
    origin: { caseId: string; caseNumber: string },
): LawyerRequest {
    return {
        ...request,
        defendantIds: remapIdList(request.defendantIds, maps),
        assetSeizure: request.assetSeizure
            ? {
                  perDefendant: request.assetSeizure.perDefendant.map((row) => ({
                      ...row,
                      defendantId: remapPartyId(row.defendantId, maps),
                  })),
              }
            : undefined,
        mergedFromCaseId: origin.caseId,
        mergedFromCaseNumber: origin.caseNumber,
    };
}

export function remapJudicialDecisionForSeveredChild(
    decision: JudicialDecision,
    maps: SeverancePartyIdMaps,
    origin: { caseId: string; caseNumber: string },
): JudicialDecision {
    return {
        ...decision,
        defendantIds: remapIdList(decision.defendantIds, maps),
        beneficiaryPartyIds: remapIdList(decision.beneficiaryPartyIds, maps),
        mergedFromCaseId: origin.caseId,
        mergedFromCaseNumber: origin.caseNumber,
    };
}

export function remapInvestigationLogForSeveredChild(
    log: InvestigationLog,
    maps: SeverancePartyIdMaps,
    origin: { caseId: string; caseNumber: string },
): InvestigationLog {
    const linked = log.linkedPartyId ? remapPartyId(log.linkedPartyId, maps) : undefined;
    return {
        ...log,
        defendantIds: remapIdList(log.defendantIds, maps),
        linkedPartyId: linked || undefined,
        mergedFromCaseId: origin.caseId,
        mergedFromCaseNumber: origin.caseNumber,
    };
}

export function remapTimelineEventForSeveredChild(
    event: TimelineEvent,
    maps: SeverancePartyIdMaps,
    origin: { caseId: string; caseNumber: string },
): TimelineEvent {
    const target = event.targetDefendantId
        ? remapPartyId(event.targetDefendantId, maps)
        : event.targetDefendantId;
    return {
        ...event,
        defendantIds: remapIdList(event.defendantIds, maps),
        complainantIds: remapIdList(event.complainantIds, maps),
        targetDefendantId: target ?? null,
        originCaseId: origin.caseId,
        originCaseNumber: origin.caseNumber,
    };
}

/** إفادة المتهم — بالاسم لا بالمعرّف. */
export function statementBelongsToSeveredDefendantsByName(
    statement: { giverType?: string; giverName?: string },
    severedDefendantNames: Set<string>,
): boolean {
    if (statement.giverType !== 'defendant') return false;
    const giver = normalizePartyName(String(statement.giverName ?? ''));
    if (!giver) return false;
    if (severedDefendantNames.has(giver)) return true;
    for (const name of severedDefendantNames) {
        if (normalizePartyName(name) === giver) return true;
    }
    return false;
}

export function buildSeveredDefendantNameSet(defendantSnapshots: CriminalDefendant[]): Set<string> {
    return new Set(
        defendantSnapshots
            .map((d) => normalizePartyName(resolveDefendantFullName(d)))
            .filter(Boolean),
    );
}
