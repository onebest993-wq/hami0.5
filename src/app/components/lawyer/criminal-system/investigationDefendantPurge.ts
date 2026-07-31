import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import {
    DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
    type InvestigationDefendantStatus,
} from '@/app/types/investigationDefendant';
import type { CriminalCase, CriminalComplainant, CriminalDefendant, LawyerRequest } from './criminalStore';
import type { InvestigationDossierClosure } from './criminalStore';
import { resolveCaseStageFromRecord } from './criminalStageUtils';
import { PRIVATE_RIGHT_WAIVER_REQUEST_TYPE } from './criminalStageUtils';
import {
    INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE,
    INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE,
    INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
    INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE,
    isInvestigationClosureAppealablePurgeTemplate,
    isInvestigationExpirationJudicialTemplate,
    isInvestigationFinalClosureTemplate,
    isInvestigationImmediatePurgeTemplate,
    isInvestigationMergeJudicialTemplate,
    isInvestigationObjectiveFinalClosureTemplate,
    isInvestigationPurgeDecisionTemplate,
    isInvestigationSeveranceJudicialTemplate,
    normalizeProceduralRequestTemplate,
    purgeDecisionIncludesUnknownDefendants,
} from './proceduralRequestTypes';
import { isDefendantIdentityUnknown, resolveDefendantFullName } from './criminalUnknownDefendant';

export {
    formatInvestigationPurgeDecisionDisplayTitle,
    isInvestigationImmediatePurgeTemplate,
    isInvestigationClosureAppealablePurgeTemplate,
    isInvestigationPurgeDecisionTemplate,
    isInvestigationStructuralCassationTemplate,
} from './proceduralRequestTypes';

export type { InvestigationDefendantStatus } from '@/app/types/investigationDefendant';
export { DEFAULT_INVESTIGATION_DEFENDANT_STATUS } from '@/app/types/investigationDefendant';

export const INVESTIGATION_PURGE_DECISION_TEMPLATES = [
    INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
    INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE,
    INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE,
    INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE,
    PRIVATE_RIGHT_WAIVER_REQUEST_TYPE,
] as const;

export type { InvestigationDossierClosure, InvestigationDossierClosureKind } from './criminalStore';

export function isInvestigationTemporaryClosureTemplate(template: string | undefined): boolean {
    return (
        normalizeProceduralRequestTemplate(String(template ?? '').trim()) ===
        INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE
    );
}

export { isInvestigationFinalClosureTemplate, isInvestigationObjectiveFinalClosureTemplate } from './proceduralRequestTypes';

export function investigationDossierSealMessage(
    closure: InvestigationDossierClosure | undefined,
): string | null {
    if (!closure) return null;
    if (closure.kind === 'final') return 'تم غلق الإضبارة';
    if (closure.kind === 'waiver') return 'تم غلق الإضبارة بسبب التنازل';
    return null;
}

export function investigationDossierIsTemporarilyClosed(
    closure: InvestigationDossierClosure | undefined,
): boolean {
    return closure?.kind === 'temporary';
}

/** هل لا يزال هناك متهم نشط في التحقيق؟ */
export function hasActiveInvestigationDefendants(
    defendants: CriminalDefendant[] | undefined,
): boolean {
    return filterActiveInvestigationDefendants(defendants).length > 0;
}

/** يُعرض محدّد المتهم فقط عند وجود أكثر من متهم نشط واحد (بعد الغلق/الصلح/الإحالة). */
export function shouldShowInvestigationDefendantScopePicker(
    defendants: CriminalDefendant[] | undefined,
): boolean {
    return filterActiveInvestigationDefendants(defendants).length > 1;
}

/**
 * تفريق/شطب الإضبارة — يُتاح فقط عند تعدد الأطراف:
 * أكثر من متهم، أو أكثر من مشتكي، أو كلاهما.
 */
export function caseAllowsSeveranceOrDossierStrike(
    complainants: CriminalComplainant[] | undefined,
    defendants: CriminalDefendant[] | undefined,
): boolean {
    const complainantCount = Array.isArray(complainants) ? complainants.length : 0;
    const defendantCount = Array.isArray(defendants) ? defendants.length : 0;
    return complainantCount > 1 || defendantCount > 1;
}

/** متهمون قابلون للاختيار في مودال التفريق (غير مقفلين وغير مغلقين تحقيقياً). */
export function countSeveranceSelectableDefendants(
    defendants: CriminalDefendant[] | undefined,
): number {
    return filterSeveranceSelectableDefendants(defendants).length;
}

/** شطر الإضبارة يتطلب متهمين قابلين للتفريق على الأقل — لا يكفي تعدد المشتكين وحده. */
export function caseAllowsDefendantSeverance(defendants: CriminalDefendant[] | undefined): boolean {
    return countSeveranceSelectableDefendants(defendants) >= 2;
}

export function filterSeveranceSelectableDefendants(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => {
        if ((d as { isPartyRecordLocked?: boolean }).isPartyRecordLocked) return false;
        const status = String(d.investigationStatus ?? '').trim();
        if (status === 'closed_pending' || status === 'closed_final') return false;
        return true;
    });
}

/** تحقق اختيار المتهمين للتفريق (قائمة، يوميات قاضي، التزام). */
export function validateDefendantSeveranceSelection(
    defendants: CriminalDefendant[] | undefined,
    targetIds: string[],
): string | null {
    const selectable = filterSeveranceSelectableDefendants(defendants);
    if (selectable.length < 2) {
        return 'لا يُتاح التفريق إلا عند وجود متهمين اثنين قابلين للتفريق على الأقل في الإضبارة.';
    }
    const selectableIdSet = new Set(selectable.map((d) => d.id));
    const valid = (Array.isArray(targetIds) ? targetIds : [])
        .map((id) => String(id ?? '').trim())
        .filter((id) => id && selectableIdSet.has(id));
    if (!valid.length) {
        return 'حدّد متهماً واحداً على الأقل للتفريق (غير مقفل أو مغلق تحقيقياً).';
    }
    if (valid.length >= selectable.length) {
        return 'لا يمكن شطر كل المتهمين — يجب أن يبقى متهم واحد على الأقل في الإضبارة الأم.';
    }
    return null;
}

export function validateSeveranceOrDossierStrikePartyRule(
    complainants: CriminalComplainant[] | undefined,
    defendants: CriminalDefendant[] | undefined,
): string | null {
    if (!caseAllowsSeveranceOrDossierStrike(complainants, defendants)) {
        return 'لا يُتاح التفريق أو شطب الإضبارة إلا عند وجود أكثر من متهم أو أكثر من مشتكي في الإضبارة.';
    }
    return null;
}

/** تشميع الإضبارة فقط عندما لا يبقى أي متهم نشط — لا تُغلق الإضبارة إذا بقي متهم واحد فقط. */
export function shouldSealInvestigationDossierAfterPurge(caseRecord: CriminalCase): boolean {
    return !hasActiveInvestigationDefendants(caseRecord.defendants);
}

/** إضبارة تحقيق مختومة: تجميد + سجل غلق (مؤقت/نهائي/تنازل) ولا متهم نشط. */
export function investigationDossierIsSealed(caseRecord: CriminalCase): boolean {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return false;
    return (
        caseRecord.isFrozen === true &&
        Boolean(caseRecord.investigationDossierClosure) &&
        !hasActiveInvestigationDefendants(caseRecord.defendants)
    );
}

/** يمنع التعديلات على محتوى الإضبارة (ما عدا بطاقات قرار الغلق للتمييز). */
export function investigationDossierMaterialMutationBlocked(caseRecord: CriminalCase): boolean {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return false;
    if (investigationDossierIsSealed(caseRecord)) return true;
    if (caseRecord.isFrozen === true && !caseRecord.investigationDossierClosure) return true;
    return false;
}

/** أدلة الإثبات الأخرى — لا تُقفل بقفل التحقيق بعد الإحالة. */
export function otherEvidenceMutationBlocked(caseRecord: CriminalCase): boolean {
    if (caseRecord.dossierStatus === 'merged' || Boolean(String(caseRecord.mergedIntoCaseId ?? '').trim())) {
        return true;
    }
    if (caseRecord.isArchived === true) return true;
    return false;
}

/** سجل الإفادات — يُقفل مع ختم الإضبارة أو التجميد الاستئنافي. */
export function investigationStatementsMutationBlocked(caseRecord: CriminalCase): boolean {
    if (caseRecord.dossierStatus === 'merged' || Boolean(String(caseRecord.mergedIntoCaseId ?? '').trim())) {
        return true;
    }
    if (caseRecord.isInvestigationLocked) return true;
    return investigationDossierMaterialMutationBlocked(caseRecord);
}

/** سجل التحقيق (مفاتحات/مبرزات) — يُقفل خارج مرحلة التحقيق وبنفس قيود الإفادات داخلها. */
export function investigationLogsMutationBlocked(caseRecord: CriminalCase): boolean {
    if (caseRecord.dossierStatus === 'merged' || Boolean(String(caseRecord.mergedIntoCaseId ?? '').trim())) {
        return true;
    }
    if (caseRecord.isArchived === true) return true;
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return true;
    return investigationStatementsMutationBlocked(caseRecord);
}

function resolveClosureTimestamp(request: LawyerRequest): string {
    return (
        String(request.decisionDate ?? '').trim() ||
        String(request.requestDate ?? '').trim() ||
        new Date().toISOString().slice(0, 10)
    );
}

function sealInvestigationDossier(
    caseRecord: CriminalCase,
    kind: InvestigationDossierClosure['kind'],
    closedAt: string,
    defendantIds: string[],
    sourceRequestId?: string,
): CriminalCase {
    const patch: Partial<CriminalCase> = {
        isFrozen: true,
        investigationDossierClosure: {
            kind,
            closedAt,
            sourceRequestId,
            defendantIds,
        },
    };
    if (kind === 'waiver') {
        patch.isPrivateRightWaived = true;
        patch.waiverDate = closedAt;
    }
    return { ...caseRecord, ...patch };
}

/** تشميع الإضبارة فقط عندما لا يبقى أي متهم نشط في التحقيق. */
function maybeSealInvestigationDossier(
    caseRecord: CriminalCase,
    kind: InvestigationDossierClosure['kind'],
    closedAt: string,
    defendantIds: string[],
    sourceRequestId?: string,
): CriminalCase {
    if (!shouldSealInvestigationDossierAfterPurge(caseRecord)) return caseRecord;
    return sealInvestigationDossier(caseRecord, kind, closedAt, defendantIds, sourceRequestId);
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

export function normalizeInvestigationDefendantStatus(
    raw: unknown,
): InvestigationDefendantStatus {
    const v = String(raw ?? '').trim();
    if (v === 'closed_pending' || v === 'closed_final' || v === 'referred') return v;
    return DEFAULT_INVESTIGATION_DEFENDANT_STATUS;
}

export function filterActiveInvestigationDefendants(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => {
        const status = normalizeInvestigationDefendantStatus(d.investigationStatus);
        return status === 'active';
    });
}

/** إخفاء المتهمين المغلق بحقهم (مؤقت/نهائي) أو المُحالين من واجهة الأطراف النشطة. */
export function filterVisibleInvestigationDefendants(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return filterActiveInvestigationDefendants(defendants);
}

/**
 * أطراف التحقيق الظاهرة في الشبكة — مع إظهار متهمي التفريق المعلّق
 * حتى لو كانت حالتهم closed_pending / referred (لا يُخفون أثناء تعبئة الشطر).
 */
export function resolveVisibleInvestigationDefendants(
    defendants: CriminalDefendant[] | undefined,
    options?: { alwaysIncludeDefendantIds?: string[] },
): CriminalDefendant[] {
    const visible = filterVisibleInvestigationDefendants(defendants);
    const extraIds = new Set(
        (Array.isArray(options?.alwaysIncludeDefendantIds) ? options.alwaysIncludeDefendantIds : [])
            .map((x) => String(x ?? '').trim())
            .filter(Boolean),
    );
    if (!extraIds.size) return visible;
    const list = Array.isArray(defendants) ? defendants : [];
    const visibleIds = new Set(visible.map((d) => d.id));
    const extras = list.filter((d) => extraIds.has(d.id) && !visibleIds.has(d.id));
    return extras.length ? [...visible, ...extras] : visible;
}

/** خياران حصريان لنتيجة التمييز على قرار غلق/صلح/تفريق. */
export const INVESTIGATION_PURGE_CASSATION_RESULT_OPTIONS = [
    { value: 'procedural_affirmation' as const, label: 'تأييد / تصديق القرار' },
    { value: 'procedural_annulment' as const, label: 'نقض القرار' },
];

export function validateInvestigationPurgeCassationResult(result: string | undefined): string | null {
    const r = String(result ?? '').trim();
    if (!r) return 'اختر نتيجة التمييز.';
    if (r !== 'procedural_affirmation' && r !== 'procedural_annulment') {
        return 'نتيجة غير صالحة لقرار الغلق/الصلح/التفريق.';
    }
    return null;
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

export type PurgeDecisionRef = Pick<
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

/** أطراف مؤهلون لسجل الإفادات — نشطون ومعلومون فقط (المجهول شبح إجرائي). */
export function filterStatementEligibleDefendants(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return filterActiveInvestigationDefendants(defendants).filter(
        (d) => !isDefendantIdentityUnknown(d),
    );
}

export function resolveAcceptablePurgeDefendantIds(
    caseRecord: CriminalCase,
    decision: JudicialDecision,
): string[] {
    const ids = resolvePurgeDecisionDefendantIds(caseRecord, decision);
    const defs = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    return ids.filter((id) => {
        const status = normalizeInvestigationDefendantStatus(
            defs.find((d) => d.id === id)?.investigationStatus,
        );
        return status === 'active' || status === 'closed_pending';
    });
}

/** لا زر «قناعة» — الإزالة تتم فور إصدار البطاقة. */
export function decisionAllowsInvestigationClosureAccept(
    _caseRecord: CriminalCase,
    _decision: JudicialDecision,
): boolean {
    return false;
}

/** هل يُعرض زر الطعن التمييزي على قرار تصفية تحقيقي؟ (الصلح/التنازل = لا). */
export function investigationPurgeDecisionAllowsCassationAppeal(
    decision: Pick<JudicialDecision, 'proceduralTemplate' | 'title'>,
): boolean {
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (isInvestigationMergeJudicialTemplate(template)) return true;
    if (!isInvestigationClosureAppealablePurgeTemplate(template)) return false;
    if (isInvestigationImmediatePurgeTemplate(template)) return false;
    return true;
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

export type InvestigationStageClosureKind = 'closing' | 'temporary_closing';

/** قرار غلق من مودال «قرار تحقيقي» — نفس منطق طلبات اليوميات (حالة + تشميع + بطاقة تمييز). */
export function buildInvestigationClosureJudicialDecisionFromConclusion(input: {
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

export function cassationResultFinalizesInvestigationClosure(result: string | undefined): boolean {
    const r = String(result ?? '').trim();
    return r === 'affirmation' || r === 'procedural_affirmation';
}

export function cassationResultReopensInvestigationDefendant(result: string | undefined): boolean {
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

export function decisionHasPendingInvestigationPurge(
    caseRecord: CriminalCase,
    decision: JudicialDecision,
): boolean {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return false;
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (!isInvestigationPurgeDecisionTemplate(template)) return false;
    const ids = resolvePurgeDecisionDefendantIds(caseRecord, decision);
    if (!ids.length) return false;
    const defs = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    return ids.some((id) => {
        const d = defs.find((x) => x.id === id);
        return normalizeInvestigationDefendantStatus(d?.investigationStatus) === 'closed_pending';
    });
}

/** أسماء المتهمين المشمولين بقرار (للعرض على البطاقة). */
export function formatInvestigationDecisionDefendantNames(
    caseRecord: CriminalCase | undefined,
    decision: JudicialDecision,
    partyLabel?: (id: string) => string,
): string {
    if (!caseRecord) return '';
    const ids = resolvePurgeDecisionDefendantIds(caseRecord, decision);
    if (!ids.length) return '';
    const defs = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    const names = ids
        .map((id) => {
            const d = defs.find((x) => x.id === id);
            const fromDef = d ? resolveDefendantFullName(d) : '';
            if (fromDef) return fromDef;
            const fromLabel = partyLabel ? partyLabel(id) : '';
            return fromLabel && fromLabel !== '—' ? fromLabel : '';
        })
        .filter(Boolean);
    if (names.length) return [...new Set(names)].join('، ');

    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (isInvestigationSeveranceJudicialTemplate(template)) {
        const summary = String(decision.summary ?? '').trim();
        const match = summary.match(/المتهمون[^:\n]*:\s*([^\n]+)/u);
        if (match?.[1]) {
            return String(match[1]).trim();
        }
        const reqId = String(decision.sourceRequestId ?? '').trim();
        if (reqId) {
            const req = (Array.isArray(caseRecord.lawyerRequests) ? caseRecord.lawyerRequests : []).find(
                (r) => r.id === reqId,
            );
            const note = String(req?.lawyerNote ?? '').trim();
            const fromNote = note.match(/المتهمون[^:\n]*:\s*([^\n]+)/u);
            if (fromNote?.[1]) return String(fromNote[1]).trim();
        }
    }
    return '';
}

export function requiresInvestigationPurgeDefendantScope(template: string | undefined): boolean {
    if (isInvestigationObjectiveFinalClosureTemplate(template)) return false;
    return (
        isInvestigationPurgeDecisionTemplate(template) ||
        isInvestigationExpirationJudicialTemplate(template)
    );
}

export type InvestigationPurgeCassationUiTone = 'default' | 'pending' | 'affirmed' | 'annulled';

export type InvestigationPurgeCassationContext = {
    headline: string;
    detail: string;
    tone: InvestigationPurgeCassationUiTone;
};

function resolvePurgeAppealAppellantLabel(
    appeal: JudicialDecisionAppeal,
    partyLabel: (id: string) => string,
): string {
    const manual = String(appeal.appellantManualLabel ?? '').trim();
    if (manual) return manual;
    const ids = (Array.isArray(appeal.appellantIds) ? appeal.appellantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const names = ids.map(partyLabel).filter((n) => n && n !== '—');
    return names.length ? names.join('، ') : '—';
}

function isPurgeCassationResultFinalized(appeal: JudicialDecisionAppeal): boolean {
    const r = String(appeal.result ?? '').trim();
    return (
        appeal.cassationStatus === 'concluded' &&
        (r === 'procedural_affirmation' || r === 'procedural_annulment')
    );
}

/** سياق الطعn على بطاقة قرار الغلق/التفريق — الطعn التمiيزi هو المسار الوحيد. */
export function resolveInvestigationPurgeCassationContext(
    decision: JudicialDecision,
    partyLabel: (id: string) => string,
    pendingAppeal?: JudicialDecisionAppeal,
): InvestigationPurgeCassationContext | null {
    if (!investigationPurgeDecisionAllowsCassationAppeal(decision)) return null;

    const appeals = Array.isArray(decision.appeals) ? decision.appeals : [];
    const concluded = appeals.filter(isPurgeCassationResultFinalized);
    const latestConcluded = concluded.length ? concluded[concluded.length - 1]! : undefined;

    if (latestConcluded) {
        const result = String(latestConcluded.result ?? '').trim();
        const appellant = resolvePurgeAppealAppellantLabel(latestConcluded, partyLabel);
        if (result === 'procedural_annulment') {
            const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
            const isSeverance = isInvestigationSeveranceJudicialTemplate(template);
            const isMerge = isInvestigationMergeJudicialTemplate(template);
            return {
                headline: '⚖️ طعن تمييزي — نقض القرار',
                detail: isSeverance
                    ? `الطاعن: ${appellant}. نُقِض قرار التفريق — أُعيدت الإضبارة كما كانت قبل الشطر.`
                    : isMerge
                      ? `الطاعن: ${appellant}. نُقِض قرار التوحيد — فُكّ الضم واستُردت الإضبارة المضمومة.`
                      : `الطاعن: ${appellant}. نُقِض القرار وأُعيدت الإضبارة للحياة — يمكن متابعة التحقيق.`,
                tone: 'annulled',
            };
        }
        if (result === 'procedural_affirmation') {
            const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
            const isSeverance = isInvestigationSeveranceJudicialTemplate(template);
            const isMerge = isInvestigationMergeJudicialTemplate(template);
            return {
                headline: '⚖️ طعن تمييزي — تأييد القرار',
                detail: isSeverance
                    ? `الطاعن: ${appellant}. أُيد قرار التفريق — يستمر مسار الإضبارة المفرّقة.`
                    : isMerge
                      ? `الطاعن: ${appellant}. أُيد قرار التوحيد — يستمر العمل في الإضبارة الموحّدة.`
                      : `الطاعن: ${appellant}. أُيد القرار ويبقى الغلق سارياً.`,
                tone: 'affirmed',
            };
        }
    }

    if (pendingAppeal) {
        const appellant = resolvePurgeAppealAppellantLabel(pendingAppeal, partyLabel);
        const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
        const isSeverance = isInvestigationSeveranceJudicialTemplate(template);
        const isMerge = isInvestigationMergeJudicialTemplate(template);
        return {
            headline: '⚖️ طعن تمييزي مُسجَّل — بانتظار النتيجة',
            detail: isSeverance
                ? `الطاعن: ${appellant}. سجّل النتيجة: تأييد (يبقى التفريق) أو نقض (إلغاء الشطر كأنما لم يكن).`
                : isMerge
                  ? `الطاعن: ${appellant}. سجّل النتيجة: تأييد (يستمر الضم) أو نقض (فك التوحيد وإعادة الإضبارة).`
                  : `الطاعن: ${appellant}. سجّل النتيجة: تأييد (يبقى الغلق) أو نقض (إعادة الإضبارة للحياة).`,
            tone: 'pending',
        };
    }

    if (!appeals.length) {
        const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
        const isSeverance = isInvestigationSeveranceJudicialTemplate(template);
        const isMerge = isInvestigationMergeJudicialTemplate(template);
        return {
            headline: isSeverance
                ? '⚖️ مسار التفريق والتمييز'
                : isMerge
                  ? '⚖️ مسار التوحيد والتمييز'
                  : '⚖️ مسار الغلق والتمييز',
            detail: isSeverance
                ? 'قرار تفريق وشطر — الطعن التمييزي الوحيد. النقض يُلغي الشطر ويعيد الإضبارة كما كانت؛ التأييد يُبقي التفريق.'
                : isMerge
                  ? 'قرار ضم وتوحيد — الطعن التمييزي الوحيد. النقض يفك الضم؛ التأييد يُبقي الإضبارة موحّدة.'
                  : 'يُخفى المتهم المشمول بالغلق (مؤقت أو نهائي) من قائمة الأطراف النشطة. الطعن التمييزي هو الإجراء الوحيد على هذا القرار — النقض يُعيد الإضبارة للحياة مثل زر «إنهاء الغلق المؤقت».',
            tone: 'default',
        };
    }

    return null;
}

export function resolvePendingPurgeDefendantIds(
    caseRecord: CriminalCase,
    decision: JudicialDecision,
): string[] {
    return resolveAcceptablePurgeDefendantIds(caseRecord, decision);
}
