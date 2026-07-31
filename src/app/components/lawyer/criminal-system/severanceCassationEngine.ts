import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalCase, CriminalDefendant, InvestigationLog, LawyerRequest, Statement, TimelineEvent } from './criminalCaseModel';
import { resolveDefendantFullName } from './criminalUnknownDefendant';
import { isInvestigationSeveranceJudicialTemplate } from './proceduralRequestTypes';
import {
    buildSeverancePartyIdMaps,
    statementBelongsToSeveredDefendantsByName,
} from './severanceMigrationEngine';

function collectIds(values: Array<string | undefined | null> | undefined): string[] {
    return (Array.isArray(values) ? values : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
}

function inverseRemapIdList(
    ids: string[] | undefined,
    inverseMap: Map<string, string>,
): string[] | undefined {
    const next = [...new Set(collectIds(ids).map((id) => inverseMap.get(id) ?? id))];
    return next.length ? next : undefined;
}

function stripSeveranceMigrationStamp<T extends { mergedFromCaseId?: string; mergedFromCaseNumber?: string }>(
    row: T,
): T {
    const { mergedFromCaseId: _a, mergedFromCaseNumber: _b, ...rest } = row as T & {
        mergedFromCaseId?: string;
        mergedFromCaseNumber?: string;
    };
    return rest as T;
}

function stripTimelineSeveranceOrigin(event: TimelineEvent): TimelineEvent {
    const { originCaseId: _a, originCaseNumber: _b, ...rest } = event as TimelineEvent & {
        originCaseId?: string;
        originCaseNumber?: string;
    };
    return rest;
}

export function stampSeveranceDecisionLinkage(
    parent: CriminalCase,
    input: { childCaseId: string; parentDefendantIds: string[]; sourceRequestId?: string },
): CriminalCase {
    const childCaseId = String(input.childCaseId ?? '').trim();
    const parentDefendantIds = collectIds(input.parentDefendantIds);
    if (!childCaseId || !parentDefendantIds.length) return parent;

    const sourceRequestId = String(input.sourceRequestId ?? '').trim();
    const list = Array.isArray(parent.judicialDecisions) ? parent.judicialDecisions : [];
    const idx = list.findIndex((d) => {
        const template = d.proceduralTemplate ?? d.title;
        if (!isInvestigationSeveranceJudicialTemplate(template)) return false;
        if (sourceRequestId && String(d.sourceRequestId ?? '').trim() === sourceRequestId) return true;
        return !String(d.linkedSeveranceCaseId ?? '').trim();
    });
    if (idx < 0) return parent;

    const patched: JudicialDecision = {
        ...list[idx]!,
        linkedSeveranceCaseId: childCaseId,
        severanceParentDefendantIds: parentDefendantIds,
    };
    const nextList = list.map((d, i) => (i === idx ? patched : d));
    return { ...parent, judicialDecisions: nextList };
}

export function resolveLinkedSeveranceChildCaseId(
    parent: CriminalCase,
    decision: JudicialDecision,
    allCases: Record<string, CriminalCase>,
): string | null {
    const linked = String(decision.linkedSeveranceCaseId ?? '').trim();
    if (linked && allCases[linked]) return linked;

    const issuedAt = String(decision.issuedAt ?? '').trim();
    const childIds = Array.isArray(parent.severedChildCaseIds) ? parent.severedChildCaseIds : [];
    for (let i = childIds.length - 1; i >= 0; i -= 1) {
        const childId = String(childIds[i] ?? '').trim();
        const child = childId ? allCases[childId] : undefined;
        if (!child) continue;
        if (issuedAt && String(child.severedAt ?? '').trim() === issuedAt) return childId;
        if (String(child.parentCaseId ?? '').trim() === parent.id) return childId;
    }
    return null;
}

function buildInverseSeverancePartyIdMaps(
    parentDefendantIds: string[],
    childDefendants: CriminalDefendant[],
): Map<string, string> {
    const inverse = new Map<string, string>();
    parentDefendantIds.forEach((parentId, index) => {
        const childId = String(childDefendants[index]?.id ?? '').trim();
        if (parentId && childId) inverse.set(childId, parentId);
    });
    return inverse;
}

function inverseRemapLawyerRequest(
    request: LawyerRequest,
    inverseMap: Map<string, string>,
): LawyerRequest {
    const next = stripSeveranceMigrationStamp(request);
    return {
        ...next,
        defendantIds: inverseRemapIdList(request.defendantIds, inverseMap),
        assetSeizure: request.assetSeizure
            ? {
                  perDefendant: request.assetSeizure.perDefendant.map((row) => ({
                      ...row,
                      defendantId: inverseMap.get(String(row.defendantId ?? '').trim()) ?? row.defendantId,
                  })),
              }
            : undefined,
    };
}

function inverseRemapJudicialDecision(
    decision: JudicialDecision,
    inverseMap: Map<string, string>,
): JudicialDecision {
    const next = stripSeveranceMigrationStamp(decision);
    return {
        ...next,
        defendantIds: inverseRemapIdList(decision.defendantIds, inverseMap),
        beneficiaryPartyIds: inverseRemapIdList(decision.beneficiaryPartyIds, inverseMap),
    };
}

function inverseRemapInvestigationLog(
    log: InvestigationLog,
    inverseMap: Map<string, string>,
): InvestigationLog {
    const next = stripSeveranceMigrationStamp(log);
    const linked = log.linkedPartyId ? inverseMap.get(String(log.linkedPartyId).trim()) : undefined;
    return {
        ...next,
        defendantIds: inverseRemapIdList(log.defendantIds, inverseMap),
        linkedPartyId: linked || log.linkedPartyId,
    };
}

function inverseRemapTimelineEvent(
    event: TimelineEvent,
    inverseMap: Map<string, string>,
): TimelineEvent {
    const next = stripTimelineSeveranceOrigin(stripSeveranceMigrationStamp(event));
    const target = event.targetDefendantId
        ? inverseMap.get(String(event.targetDefendantId).trim()) ?? event.targetDefendantId
        : event.targetDefendantId;
    return {
        ...next,
        defendantIds: inverseRemapIdList(event.defendantIds, inverseMap),
        complainantIds: inverseRemapIdList(event.complainantIds, inverseMap),
        targetDefendantId: target ?? null,
    };
}

function restoreParentDefendantsFromChild(
    parentDefendantIds: string[],
    childDefendants: CriminalDefendant[],
): CriminalDefendant[] {
    return parentDefendantIds
        .map((parentId, index) => {
            const childDef = childDefendants[index];
            if (!childDef) return null;
            return {
                ...childDef,
                id: parentId,
                investigationStatus: childDef.investigationStatus ?? 'active',
            } satisfies CriminalDefendant;
        })
        .filter(Boolean) as CriminalDefendant[];
}

/** نقض قرار التفريق — إعادة الإضبارة كما كانت قبل الشطر (الابنة تُؤرشف). */
export function revertSeveranceAfterCassationAnnulment(
    allCases: Record<string, CriminalCase>,
    parentCaseId: string,
    decision: JudicialDecision,
): { casesById: Record<string, CriminalCase>; error?: string } {
    const parent = allCases[parentCaseId];
    if (!parent) return { casesById: allCases, error: 'الإضبارة الأم غير موجودة.' };

    const template = decision.proceduralTemplate ?? decision.title;
    if (!isInvestigationSeveranceJudicialTemplate(template)) {
        return { casesById: allCases, error: 'القرار ليس قرار تفريقاً.' };
    }

    const childCaseId = resolveLinkedSeveranceChildCaseId(parent, decision, allCases);
    if (!childCaseId) {
        return { casesById: allCases, error: 'تعذّر تحديد الإضبارة المفرّقة المرتبطة بهذا القرار.' };
    }

    const child = allCases[childCaseId];
    if (!child) {
        return { casesById: allCases, error: 'إضبارة التفريق غير موجودة في النظام.' };
    }

    const parentDefendantIds = collectIds(decision.severanceParentDefendantIds);
    const childDefendants = Array.isArray(child.defendants) ? child.defendants : [];
    const resolvedParentIds =
        parentDefendantIds.length === childDefendants.length && parentDefendantIds.length
            ? parentDefendantIds
            : childDefendants.map((d) => d.id);

    if (!resolvedParentIds.length) {
        return { casesById: allCases, error: 'تعذّر تحديد المتهمين المفرّقين لإعادتهم.' };
    }

    const inverseMap = buildInverseSeverancePartyIdMaps(resolvedParentIds, childDefendants);
    const partyMaps = buildSeverancePartyIdMaps(parent, childDefendants, resolvedParentIds, child.complainants);
    for (const [parentId, childId] of partyMaps.defendantId.entries()) {
        inverseMap.set(childId, parentId);
    }
    for (const [parentId, childId] of partyMaps.complainantId.entries()) {
        inverseMap.set(childId, parentId);
    }

    const parentOriginId = parent.id;
    const childOriginMarker = (row: { mergedFromCaseId?: string; originCaseId?: string }) =>
        String(row.mergedFromCaseId ?? '').trim() === parentOriginId ||
        String((row as TimelineEvent).originCaseId ?? '').trim() === parentOriginId;

    const migratedRequests = (Array.isArray(child.lawyerRequests) ? child.lawyerRequests : []).filter(
        childOriginMarker,
    );
    const migratedDecisions = (Array.isArray(child.judicialDecisions) ? child.judicialDecisions : []).filter(
        childOriginMarker,
    );
    const migratedLogs = (Array.isArray(child.investigationLogs) ? child.investigationLogs : []).filter(
        childOriginMarker,
    );
    const migratedTimeline = (Array.isArray(child.timelineEvents) ? child.timelineEvents : []).filter(
        childOriginMarker,
    );

    const severedNames = new Set(
        childDefendants.map((d) => String(resolveDefendantFullName(d) ?? '').trim()).filter(Boolean),
    );
    const migratedStatements = (Array.isArray(child.statements) ? child.statements : []).filter((s) =>
        statementBelongsToSeveredDefendantsByName(s, severedNames),
    );

    const restoredDefendants = restoreParentDefendantsFromChild(resolvedParentIds, childDefendants);

    const nextParent: CriminalCase = {
        ...parent,
        defendants: [...(Array.isArray(parent.defendants) ? parent.defendants : []), ...restoredDefendants],
        statements: [
            ...(Array.isArray(parent.statements) ? parent.statements : []),
            ...migratedStatements.map(stripSeveranceMigrationStamp),
        ],
        timelineEvents: [
            ...(Array.isArray(parent.timelineEvents) ? parent.timelineEvents : [])
                .filter((ev) => ev.category !== 'تفريق الدعاوى' || !String(ev.description ?? '').includes(childCaseId))
                .filter(
                    (ev) =>
                        !(
                            ev.title === 'تفريق وشطر الإضبارة' &&
                            String(ev.date ?? '').trim() === String(decision.issuedAt ?? '').trim()
                        ),
                ),
            ...migratedTimeline.map((ev) => inverseRemapTimelineEvent(ev, inverseMap)),
        ],
        lawyerRequests: [
            ...(Array.isArray(parent.lawyerRequests) ? parent.lawyerRequests : []),
            ...migratedRequests.map((req) => inverseRemapLawyerRequest(req, inverseMap)),
        ],
        investigationLogs: [
            ...(Array.isArray(parent.investigationLogs) ? parent.investigationLogs : []),
            ...migratedLogs.map((log) => inverseRemapInvestigationLog(log, inverseMap)),
        ],
        judicialDecisions: [
            ...(Array.isArray(parent.judicialDecisions) ? parent.judicialDecisions : []),
            ...migratedDecisions.map((jd) => inverseRemapJudicialDecision(jd, inverseMap)),
        ],
        severedChildCaseIds: (Array.isArray(parent.severedChildCaseIds) ? parent.severedChildCaseIds : []).filter(
            (id) => String(id ?? '').trim() !== childCaseId,
        ),
    };

    const archivedChild: CriminalCase = {
        ...child,
        isArchived: true,
        isFrozen: true,
        dossierStatus: 'archived',
        notes: `أُلغي التفريق بموجب نقض تمييزي — ${String(decision.issuedAt ?? '').trim() || '—'}`,
    };

    return {
        casesById: {
            ...allCases,
            [parentCaseId]: nextParent,
            [childCaseId]: archivedChild,
        },
    };
}
