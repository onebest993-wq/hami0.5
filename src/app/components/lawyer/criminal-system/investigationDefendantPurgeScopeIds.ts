import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalCase, CriminalComplainant, CriminalDefendant, LawyerRequest } from './criminalStore';
import { isDefendantIdentityUnknown } from './criminalUnknownDefendant';
import {
    isInvestigationObjectiveFinalClosureTemplate,
    normalizeProceduralRequestTemplate,
    purgeDecisionIncludesUnknownDefendants,
} from './proceduralRequestTypes';
import { filterActiveInvestigationDefendants } from './investigationDefendantFilterScope';

function resolvePartyToDefendantId(
    complainants: CriminalComplainant[],
    defendants: CriminalDefendant[],
    partyId: string,
    isMutualComplaint: boolean,
): string {
    const id = String(partyId ?? '').trim();
    if (!id) return '';
    if (defendants.some((d) => d.id === id)) return id;
    const complainant = complainants.find((c) => c.id === id);
    if (complainant && isMutualComplaint) {
        const name = String(complainant.fullName ?? '').trim();
        if (!name) return '';
        const match = defendants.find((d) => String(d.fullName ?? '').trim() === name);
        return match?.id ?? '';
    }
    return '';
}

function resolveInvestigationPartyDefendantIds(
    caseRecord: CriminalCase,
    partyIds: string[],
): string[] {
    const complainants = Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [];
    const defendants = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    const mutual = caseRecord.isMutualComplaint === true;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of partyIds) {
        const resolved = resolvePartyToDefendantId(complainants, defendants, raw, mutual);
        if (!resolved || seen.has(resolved)) continue;
        seen.add(resolved);
        out.push(resolved);
    }
    return out;
}

function filterToExistingDefendantIds(caseRecord: CriminalCase, ids: string[]): string[] {
    const defendants = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    const defIdSet = new Set(defendants.map((d) => d.id));
    return ids.filter((id) => defIdSet.has(id));
}

type PurgeDecisionRef = Pick<
    JudicialDecision,
    'defendantIds' | 'beneficiaryPartyIds' | 'proceduralTemplate' | 'title' | 'sourceRequestId'
>;

/** يحلّ معرّفات المتهمين المشمولين حصراً بقرار الغلق/الصلح/التفريق — لا توسّع لبقية الإضبارة. */
export function resolvePurgeDecisionDefendantIds(
    caseRecord: CriminalCase,
    decision: PurgeDecisionRef,
): string[] {
    const raw = (decision.defendantIds ?? decision.beneficiaryPartyIds ?? [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);

    const template = normalizeProceduralRequestTemplate(
        decision.proceduralTemplate ?? decision.title ?? '',
    );
    const includeUnknown = purgeDecisionIncludesUnknownDefendants(template);
    const objectiveFinal = isInvestigationObjectiveFinalClosureTemplate(template);

    let ids = filterToExistingDefendantIds(caseRecord, resolveInvestigationPartyDefendantIds(caseRecord, raw));

    if (objectiveFinal && !ids.length) {
        ids = (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) => d.id);
    }

    ids = ids.filter((id) => {
        const defs = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
        const d = defs.find((x) => x.id === id);
        if (!d) return false;
        if (!includeUnknown && isDefendantIdentityUnknown(d)) return false;
        return true;
    });

    if (includeUnknown) {
        const defs = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
        const activeUnknownIds = filterActiveInvestigationDefendants(
            defs.filter((d) => isDefendantIdentityUnknown(d)),
        ).map((d) => d.id);
        ids = [...new Set([...ids, ...activeUnknownIds])];
    }

    if (!ids.length) {
        const reqId = String(decision.sourceRequestId ?? '').trim();
        if (reqId) {
            const reqs = Array.isArray(caseRecord.lawyerRequests) ? caseRecord.lawyerRequests : [];
            const req = reqs.find((r) => r.id === reqId);
            if (req) {
                const fromReq = (Array.isArray(req.defendantIds) ? req.defendantIds : [])
                    .map((x) => String(x ?? '').trim())
                    .filter(Boolean);
                ids = filterToExistingDefendantIds(
                    caseRecord,
                    resolveInvestigationPartyDefendantIds(caseRecord, fromReq),
                );
                ids = ids.filter((id) => {
                    const defs = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
                    const d = defs.find((x) => x.id === id);
                    if (!d) return false;
                    if (!includeUnknown && isDefendantIdentityUnknown(d)) return false;
                    return true;
                });
            }
        }
    }

    return ids;
}

/** معرّفات المتهمين المُعادون إلى active عند نقض قرار الغلق/الصلح/التفريق. */
export function resolvePurgeCassationRestoreDefendantIds(
    caseRecord: CriminalCase,
    decision: JudicialDecision,
    appeal: JudicialDecisionAppeal,
): string[] {
    const primary = resolvePurgeDecisionDefendantIds(caseRecord, decision);
    if (primary.length) return primary;

    const appealPartyIds = [
        ...(Array.isArray(appeal.targetDefendantIds) ? appeal.targetDefendantIds : []),
        ...(Array.isArray(appeal.beneficiaryIds) ? appeal.beneficiaryIds : []),
    ]
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const fromAppeal = filterToExistingDefendantIds(
        caseRecord,
        resolveInvestigationPartyDefendantIds(caseRecord, appealPartyIds),
    );
    if (fromAppeal.length) return fromAppeal;

    return [];
}

export function resolveInvestigationClosureDefendantIds(
    caseRecord: CriminalCase,
    request: LawyerRequest,
): string[] {
    return resolvePurgeDecisionDefendantIds(caseRecord, {
        defendantIds: request.defendantIds,
        proceduralTemplate: request.proceduralTemplate ?? request.type,
        title: request.type,
        sourceRequestId: request.id,
    });
}
