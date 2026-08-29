import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { InvestigationDefendantStatus } from '@/app/types/investigationDefendant';
import type { CriminalCase, LawyerRequest } from './criminalStore';
import { resolveCaseStageFromRecord } from './criminalStageUtils';
import {
    INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE,
    INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
    isInvestigationFinalClosureTemplate,
    isInvestigationImmediatePurgeTemplate,
    isInvestigationObjectiveFinalClosureTemplate,
    isInvestigationPurgeDecisionTemplate,
    isInvestigationSeveranceJudicialTemplate,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';
import {
    hasActiveInvestigationDefendants,
    normalizeInvestigationDefendantStatus,
    resolveInvestigationClosureDefendantIds,
    resolvePurgeCassationRestoreDefendantIds,
    resolvePurgeDecisionDefendantIds,
} from './investigationDefendantScopeUtils';
import {
    isInvestigationTemporaryClosureTemplate,
    maybeSealInvestigationDossier,
} from './investigationDossierClosureUtils';

function resolveClosureTimestamp(request: LawyerRequest): string {
    return (
        String(request.decisionDate ?? '').trim() ||
        String(request.requestDate ?? '').trim() ||
        new Date().toISOString().slice(0, 10)
    );
}

/** إنهاء الغلق المؤقت — إعادة المتهمين من closed_pending إلى active وتفعيل الإضبارة. */
export function endInvestigationTemporaryClosureOnCase(caseRecord: CriminalCase): CriminalCase {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return caseRecord;
    if (caseRecord.investigationDossierClosure?.kind !== 'temporary') return caseRecord;
    const defs = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    const reopenIds = defs
        .filter((d) => normalizeInvestigationDefendantStatus(d.investigationStatus) === 'closed_pending')
        .map((d) => d.id);
    let next = reopenIds.length
        ? patchDefendantsInvestigationStatus(caseRecord, reopenIds, 'active')
        : caseRecord;
    return {
        ...next,
        isFrozen: false,
        investigationDossierClosure: undefined,
    };
}

export function patchDefendantsInvestigationStatus(
    caseRecord: CriminalCase,
    defendantIds: string[],
    status: InvestigationDefendantStatus,
): CriminalCase {
    const idSet = new Set(
        (Array.isArray(defendantIds) ? defendantIds : []).map((x) => String(x ?? '').trim()).filter(Boolean),
    );
    if (!idSet.size) return caseRecord;
    const nextDefendants = (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) => {
        if (!idSet.has(d.id)) return d;
        return { ...d, investigationStatus: status };
    });
    return { ...caseRecord, defendants: nextDefendants };
}

/** لا زر «قناعة» — الإزالة تتم فور إصدار البطاقة. */
export function decisionAllowsInvestigationClosureAccept(
    _caseRecord: CriminalCase,
    _decision: JudicialDecision,
): boolean {
    return false;
}

type InvestigationStageClosureKind = 'closing' | 'temporary_closing';

/** قرار غلق من مودال «قرار تحقيقي» — نفس منطق طلبات اليوميات (حالة + تشميع + بطاقة تمييز). */
function buildInvestigationClosureJudicialDecisionFromConclusion(input: {
    conclusionId: string;
    kind: InvestigationStageClosureKind;
    defendantIds: string[];
    closedAt: string;
    details?: string;
}): JudicialDecision {
    const template =
        input.kind === 'temporary_closing'
            ? INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE
            : INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE;
    const defendantIds = input.defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean);
    const closedAt = String(input.closedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const summary = String(input.details ?? '').trim() || '—';
    return {
        id: `jd_${input.conclusionId}`,
        issuedAt: closedAt,
        title: template,
        summary,
        decisionType: 'preparatory',
        defendantIds,
        beneficiaryPartyIds: defendantIds,
        proceduralTemplate: template,
        appeals: [],
        isLocked: true,
    };
}

function upsertInvestigationClosureJudicialDecision(
    caseRecord: CriminalCase,
    decision: JudicialDecision,
): CriminalCase {
    const list = Array.isArray(caseRecord.judicialDecisions) ? caseRecord.judicialDecisions : [];
    const idx = list.findIndex((d) => d.id === decision.id);
    const nextList =
        idx >= 0
            ? list.map((d, i) =>
                  i === idx ? { ...decision, appeals: list[idx]!.appeals ?? [] } : d,
              )
            : [...list, decision];
    return { ...caseRecord, judicialDecisions: nextList };
}

export function applyInvestigationClosureFromStageConclusion(
    caseRecord: CriminalCase,
    input: {
        kind: InvestigationStageClosureKind;
        defendantIds: string[];
        closedAt: string;
        conclusionId: string;
        details?: string;
    },
): CriminalCase {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return caseRecord;
    const defendantIds = input.defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean);
    if (!defendantIds.length) return caseRecord;
    const closedAt = String(input.closedAt ?? '').trim() || new Date().toISOString().slice(0, 10);

    let next: CriminalCase;
    if (input.kind === 'temporary_closing') {
        next = patchDefendantsInvestigationStatus(caseRecord, defendantIds, 'closed_pending');
        next = maybeSealInvestigationDossier(next, 'temporary', closedAt, defendantIds);
    } else {
        next = patchDefendantsInvestigationStatus(caseRecord, defendantIds, 'closed_final');
        next = maybeSealInvestigationDossier(next, 'final', closedAt, defendantIds);
    }

    const jd = buildInvestigationClosureJudicialDecisionFromConclusion({
        conclusionId: input.conclusionId,
        kind: input.kind,
        defendantIds,
        closedAt,
        details: input.details,
    });
    return upsertInvestigationClosureJudicialDecision(next, jd);
}

/** إعادة فتح المتهمين المغلقين/المشطوبين عند إعادة فتح الإضبارة (ما عدا المُحالين). */
export function reopenInvestigationDefendantsOnCase(caseRecord: CriminalCase): CriminalCase {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return caseRecord;
    const defs = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    const reopenIds = defs
        .filter((d) => {
            const status = normalizeInvestigationDefendantStatus(d.investigationStatus);
            return status === 'closed_pending' || status === 'closed_final';
        })
        .map((d) => d.id);
    if (!reopenIds.length) return caseRecord;
    return patchDefendantsInvestigationStatus(caseRecord, reopenIds, 'active');
}

/** عند توثيق قرار غلق/صلح/تفريق — تحديث حالة المتهمين وحالة الإضبارة. */
export function applyInvestigationClosureFromRequest(
    caseRecord: CriminalCase,
    request: LawyerRequest,
): CriminalCase {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return caseRecord;
    if (request.status !== 'executed' && request.status !== 'approved') return caseRecord;
    const template = normalizeProceduralRequestTemplate(request.proceduralTemplate ?? request.type);
    if (!isInvestigationPurgeDecisionTemplate(template)) return caseRecord;
    if (isInvestigationSeveranceJudicialTemplate(template)) {
        return caseRecord;
    }
    const closedAt = resolveClosureTimestamp(request);
    const resolveClosureTargetIds = (): string[] => {
        if (isInvestigationObjectiveFinalClosureTemplate(template)) {
            return (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) => d.id);
        }
        return resolveInvestigationClosureDefendantIds(caseRecord, request);
    };

    if (isInvestigationTemporaryClosureTemplate(template)) {
        const defendantIds = resolveClosureTargetIds();
        if (!defendantIds.length) return caseRecord;
        let next = patchDefendantsInvestigationStatus(caseRecord, defendantIds, 'closed_pending');
        return maybeSealInvestigationDossier(next, 'temporary', closedAt, defendantIds, request.id);
    }

    if (isInvestigationFinalClosureTemplate(template)) {
        const defendantIds = resolveClosureTargetIds();
        if (!defendantIds.length) return caseRecord;
        const next = patchDefendantsInvestigationStatus(caseRecord, defendantIds, 'closed_final');
        return maybeSealInvestigationDossier(next, 'final', closedAt, defendantIds, request.id);
    }

    const defendantIds = resolveInvestigationClosureDefendantIds(caseRecord, request);
    if (!defendantIds.length) return caseRecord;

    if (isInvestigationImmediatePurgeTemplate(template)) {
        const next = patchDefendantsInvestigationStatus(caseRecord, defendantIds, 'closed_final');
        return maybeSealInvestigationDossier(next, 'waiver', closedAt, defendantIds, request.id);
    }

    return caseRecord;
}

function cassationResultFinalizesInvestigationClosure(result: string | undefined): boolean {
    const r = String(result ?? '').trim();
    return r === 'affirmation' || r === 'procedural_affirmation';
}

function cassationResultReopensInvestigationDefendant(result: string | undefined): boolean {
    const r = String(result ?? '').trim();
    return (
        r === 'quash_remand' ||
        r === 'quash_modify' ||
        r === 'quash_dismissal' ||
        r === 'procedural_annulment' ||
        r === 'procedural_remand_direction'
    );
}

export function applyInvestigationPurgeAfterCassation(
    caseRecord: CriminalCase,
    decision: JudicialDecision,
    appeal: JudicialDecisionAppeal,
): CriminalCase {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return caseRecord;
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (!isInvestigationPurgeDecisionTemplate(template)) return caseRecord;
    const result = typeof appeal.result === 'string' ? appeal.result : '';
    if (!cassationResultFinalizesInvestigationClosure(result) && !cassationResultReopensInvestigationDefendant(result)) {
        return caseRecord;
    }
    const targets = resolvePurgeDecisionDefendantIds(caseRecord, decision);
    const beneficiaryIds = Array.isArray(appeal.beneficiaryIds) ? appeal.beneficiaryIds : [];
    const scoped = cassationResultReopensInvestigationDefendant(result)
        ? resolvePurgeCassationRestoreDefendantIds(caseRecord, decision, appeal)
        : beneficiaryIds.length
          ? targets.filter((id) => beneficiaryIds.includes(id))
          : targets;
    if (!scoped.length) return caseRecord;
    const nextStatus: InvestigationDefendantStatus = cassationResultReopensInvestigationDefendant(result)
        ? 'active'
        : 'closed_final';
    let next = patchDefendantsInvestigationStatus(caseRecord, scoped, nextStatus);

    if (cassationResultReopensInvestigationDefendant(result)) {
        if (next.investigationDossierClosure && hasActiveInvestigationDefendants(next.defendants)) {
            next = {
                ...next,
                isFrozen: false,
                investigationDossierClosure: undefined,
            };
        }
        return next;
    }

    if (
        cassationResultFinalizesInvestigationClosure(result) &&
        next.investigationDossierClosure?.kind === 'temporary'
    ) {
        next = patchDefendantsInvestigationStatus(next, scoped, 'closed_final');
        next = {
            ...next,
            investigationDossierClosure: {
                ...next.investigationDossierClosure!,
                kind: 'final',
            },
        };
    }

    return next;
}
