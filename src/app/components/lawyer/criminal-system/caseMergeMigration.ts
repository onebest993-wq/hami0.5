/**
 * مُحرّك ضَم الأضابير (Case Merge & Consolidation Engine)
 *
 * يَتولّى التَّحقّقات الصَّارمة وترحيل البَيانات بشكل عَمَلية ذرّية واحدة (atomic).
 * كل دوال هذا الملف **نقية (pure)** — تَستقبل مُدخلات وتُعيد مُخرجات دون مُلامسة الـ store.
 * يُستدعى من `criminalStore.mergeCases` التي تُغلّف كل شيء داخل `set()` واحدة.
 *
 * الضَمانات المُحقَّقة هنا:
 *   - تَحقّقات صارمة عبر `validateCaseMerge` (تَرفع `MergeValidationError` برمز عربي واضح).
 *   - تَوحيد الأطراف مع منع التَّكرار وفق الاسم النَّظيف (`consolidatePartiesAfterMerge`).
 *   - تَرحيل دائم لِسجلات السَّجل الزمني والقرارات والإفادات والطلبات مع ختم تتبّع.
 *   - تَجميد الإضبارة المَضمومة كأرشيف للقراءة فقط (لا حَذف، لا فقدان بيانات).
 *   - نقاء العَملية: في حال فشل أي خطوة، لا يَحدث أي `set` (الإطار يَطلق الاستثناء قبل الكتابة).
 */

import type { CriminalCase, CriminalComplainant, CriminalDefendant, InvestigationLog, LawyerRequest, Statement, TimelineEvent } from './criminalStore';
import { isInternalCaseIdentifier, resolveOfficialCaseNumber } from './criminalCaseReferenceUtils';
import { resolveMergedCaseIds } from './criminalCaseMergeUtils';
import type { JudicialDecision } from '@/app/types/criminal';
import { areCasesSameProceduralStage, CROSS_STAGE_MERGE_ERROR_MESSAGE } from './caseMergeTimeline';
import { INVESTIGATION_MERGE_JUDICIAL_TEMPLATE, isInvestigationMergeJudicialTemplate } from './proceduralRequestTypes';

// ────────────────────────────────────────────────────────────
//  أخطاء التَّحقّق
// ────────────────────────────────────────────────────────────

/** رموز رفض الضَم — مُستخدَمة في الواجهة لِعرض الرَسالة المُناسبة. */
export type MergeValidationCode =
    | 'missing_parent'
    | 'missing_child'
    | 'self_merge'
    | 'cross_stage'
    | 'parent_already_merged'
    | 'child_already_merged'
    | 'parent_frozen'
    | 'child_frozen'
    | 'parent_archived'
    | 'child_archived'
    | 'child_severed_lineage'
    | 'child_severance_parent'
    | 'already_merged_to_parent'
    | 'empty_reason';

export class MergeValidationError extends Error {
    readonly code: MergeValidationCode;
    constructor(code: MergeValidationCode, message: string) {
        super(message);
        this.code = code;
        this.name = 'MergeValidationError';
    }
}

const MERGE_ERROR_MESSAGES: Record<MergeValidationCode, string> = {
    missing_parent: 'تعذّر تنفيذ الضم: الإضبارة الأم غير موجودة.',
    missing_child: 'تعذّر تنفيذ الضم: الإضبارة المراد ضمها غير موجودة في النظام.',
    self_merge: 'تعذّر تنفيذ الضم: لا يجوز ضم الإضبارة إلى نفسها.',
    cross_stage: CROSS_STAGE_MERGE_ERROR_MESSAGE,
    parent_already_merged: 'تعذّر تنفيذ الضم: الإضبارة الأم نفسها مُغلقة (مضمومة في إضبارة أخرى).',
    child_already_merged: 'تعذّر تنفيذ الضم: الإضبارة المراد ضمها مُغلقة سابقاً (مُجمَّدة بسبب ضمّ آخر).',
    parent_frozen: 'تعذّر تنفيذ الضم: الإضبارة الأم مُجمَّدة ولا تَقبل التَّعديل.',
    child_frozen: 'تعذّر تنفيذ الضم: الإضبارة المراد ضمها مُجمَّدة.',
    parent_archived: 'تعذّر تنفيذ الضم: الإضبارة الأم مُؤرشَفة.',
    child_archived: 'تعذّر تنفيذ الضم: الإضبارة المراد ضمها مُؤرشَفة.',
    child_severed_lineage: 'تعذّر تنفيذ الضم: الإضبارة المراد ضمها وليدة تفريق دعاوى ومرتبطة هيكلياً بإضبارتها الأم.',
    child_severance_parent:
        'تعذّر تنفيذ الضم: هذه الإضبارة أمّ لتفريق سابق ولا يُسمح بضمها إلى إضبارة أخرى ما دامت لها إضبارة فرع نشطة.',
    already_merged_to_parent: 'تعذّر تنفيذ الضم: هذه الإضبارة مضمومة بالفعل إلى الإضبارة الأم الحالية.',
    empty_reason: 'تعذّر تنفيذ الضم: يَجب كتابة سبب قانوني واضح لتَوحيد الأضابير.',
};

function fail(code: MergeValidationCode): never {
    throw new MergeValidationError(code, MERGE_ERROR_MESSAGES[code]);
}

// ────────────────────────────────────────────────────────────
//  دوال التَّحقّق
// ────────────────────────────────────────────────────────────

function isCaseInTrashLike(c: CriminalCase | undefined): boolean {
    if (!c) return true;
    return Boolean(c.isArchived) || c.dossierStatus === 'merged' || Boolean(String(c.mergedIntoCaseId ?? '').trim());
}

function isCaseFrozen(c: CriminalCase | undefined): boolean {
    return c?.isFrozen === true;
}

/**
 * تَحقّقات الضم — الشرط القانوني الوحيد: نفس المرحلة الإجرائية (مع استقلال مسار الأحداث).
 */
export function validateCaseMerge(
    parent: CriminalCase | undefined,
    child: CriminalCase | undefined,
    mergeReason: string,
    _casesById?: Record<string, CriminalCase | undefined>,
): asserts parent is CriminalCase {
    if (!parent) fail('missing_parent');
    if (!child) fail('missing_child');

    if (!parent.id || !child.id) fail('missing_child');
    if (isInternalCaseIdentifier(parent.id) && !parent.basics) fail('missing_parent');
    if (isInternalCaseIdentifier(child.id) && !child.basics) fail('missing_child');

    if (parent.id === child.id) fail('self_merge');

    if (parent.dossierStatus === 'merged' || String(parent.mergedIntoCaseId ?? '').trim()) {
        fail('parent_already_merged');
    }
    if (child.dossierStatus === 'merged' || String(child.mergedIntoCaseId ?? '').trim()) {
        fail('child_already_merged');
    }

    if (!areCasesSameProceduralStage(parent, child)) fail('cross_stage');

    if (resolveMergedCaseIds(parent).includes(child.id)) fail('already_merged_to_parent');

    if (!String(mergeReason ?? '').trim()) fail('empty_reason');
}

// ────────────────────────────────────────────────────────────
//  توحيد الأطراف
// ────────────────────────────────────────────────────────────

/** مفتاح تَطبيع للاسم — لِكَشف التَّكرار بين الإضبارتين (يَتَجاهل المسافات الزائدة). */
function normalizePartyKey(value: string | undefined): string {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

export type ConsolidatedParties = {
    complainants: CriminalComplainant[];
    defendants: CriminalDefendant[];
    /** عدد الأطراف الذين دُمجوا (نَسخة من الطِفل دخَلت في الأم). */
    addedComplainants: number;
    addedDefendants: number;
    /** عدد الأطراف الذين كانوا مُكرَّرين (موجودون في الإضبارتين بنَفس الاسم — لم يُضافوا مَرتين). */
    deduplicatedComplainants: number;
    deduplicatedDefendants: number;
};

/**
 * يُوحّد قَوائم الأطراف بين الأم والطِفل دون تَكرار.
 * • مفتاح التَّطابُق: الاسم الكامل بعد التَّطبيع (حَالة الأحرف والمَسافات).
 * • التَّرتيب النهائي: أطراف الأم أولاً (بِتَرتيبهم الأصلي)، ثم الأطراف الجُدد من الطِفل.
 * • لا تَعديل لأي طرف موجود مُسبقاً في الأم — تَجنّباً لِفَقد بيانات تَفصيلية مَخزّنة.
 */
export function consolidatePartiesAfterMerge(parent: CriminalCase, child: CriminalCase): ConsolidatedParties {
    const parentComplainants = Array.isArray(parent.complainants) ? parent.complainants : [];
    const childComplainants = Array.isArray(child.complainants) ? child.complainants : [];
    const parentDefendants = Array.isArray(parent.defendants) ? parent.defendants : [];
    const childDefendants = Array.isArray(child.defendants) ? child.defendants : [];

    const parentComplainantKeys = new Set(parentComplainants.map((p) => normalizePartyKey(p.fullName)));
    const parentDefendantKeys = new Set(parentDefendants.map((d) => normalizePartyKey(d.fullName)));

    const newComplainants: CriminalComplainant[] = [];
    let deduplicatedComplainants = 0;
    for (const c of childComplainants) {
        const key = normalizePartyKey(c.fullName);
        if (!key) continue;
        if (parentComplainantKeys.has(key)) {
            deduplicatedComplainants += 1;
            continue;
        }
        parentComplainantKeys.add(key);
        newComplainants.push(c);
    }

    const newDefendants: CriminalDefendant[] = [];
    let deduplicatedDefendants = 0;
    for (const d of childDefendants) {
        const key = normalizePartyKey(d.fullName);
        if (!key) continue;
        if (parentDefendantKeys.has(key)) {
            deduplicatedDefendants += 1;
            continue;
        }
        parentDefendantKeys.add(key);
        newDefendants.push(d);
    }

    return {
        complainants: [...parentComplainants, ...newComplainants],
        defendants: [...parentDefendants, ...newDefendants],
        addedComplainants: newComplainants.length,
        addedDefendants: newDefendants.length,
        deduplicatedComplainants,
        deduplicatedDefendants,
    };
}

// ────────────────────────────────────────────────────────────
//  ختم التَتبّع البصري
// ────────────────────────────────────────────────────────────

/**
 * صياغة ختم التَتبّع `[📌 مرحّل من الإضبارة المنضمة: <المحكمة/الرقم>]`.
 * يُستخدَم في الواجهة لِعرض الأصل بِشكل لَطيف بِجانب البَطاقة/الإجراء.
 */
export function formatMergeProvenanceBadge(caseNumberOrLabel: string | undefined): string {
    const label = String(caseNumberOrLabel ?? '').trim() || 'إضبارة دون رقم';
    return `📌 مرحّل من الإضبارة المنضمة: ${label}`;
}

// ────────────────────────────────────────────────────────────
//  ترحيل السِجلّات (Migration)
// ────────────────────────────────────────────────────────────

function stampStatements(child: CriminalCase, childNumber: string): Statement[] {
    const list = Array.isArray(child.statements) ? child.statements : [];
    return list.map((s) => ({
        ...s,
        mergedFromCaseId: child.id,
        mergedFromCaseNumber: childNumber || s.mergedFromCaseNumber,
    }));
}

function stampTimelineEvents(child: CriminalCase, childNumber: string): TimelineEvent[] {
    const list = Array.isArray(child.timelineEvents) ? child.timelineEvents : [];
    return list.map((ev) => ({
        ...ev,
        mergedFromCaseId: child.id,
        mergedFromCaseNumber: childNumber || ev.mergedFromCaseNumber,
    }));
}

function stampInvestigationLogs(child: CriminalCase, childNumber: string): InvestigationLog[] {
    const list = Array.isArray(child.investigationLogs) ? child.investigationLogs : [];
    return list.map((il) => ({
        ...il,
        mergedFromCaseId: child.id,
        mergedFromCaseNumber: childNumber || il.mergedFromCaseNumber,
    }));
}

function stampLawyerRequests(child: CriminalCase, childNumber: string): LawyerRequest[] {
    const list = Array.isArray(child.lawyerRequests) ? child.lawyerRequests : [];
    return list.map((lr) => ({
        ...lr,
        mergedFromCaseId: child.id,
        mergedFromCaseNumber: childNumber || lr.mergedFromCaseNumber,
    }));
}

function stampJudicialDecisions(child: CriminalCase, childNumber: string): JudicialDecision[] {
    const list = Array.isArray(child.judicialDecisions) ? child.judicialDecisions : [];
    return list.map((jd) => ({
        ...jd,
        mergedFromCaseId: child.id,
        mergedFromCaseNumber: childNumber || jd.mergedFromCaseNumber,
    }));
}

// ────────────────────────────────────────────────────────────
//  المُحضِّر الذَّرّي (Transactional Preparator)
// ────────────────────────────────────────────────────────────

export type MergedCaseTransactionResult = {
    updatedParent: CriminalCase;
    frozenChild: CriminalCase;
    /** نَص الإشعار الذي يُكتب على timeline الأم — مَلَخّص الضَم. */
    parentMergeEvent: TimelineEvent;
    /** ملخص ما تَمّ ترحيله — تَشخيصي للاختبارات وواجهة المُحاسَبة. */
    summary: {
        migratedStatements: number;
        migratedTimelineEvents: number;
        migratedInvestigationLogs: number;
        migratedLawyerRequests: number;
        migratedJudicialDecisions: number;
        addedComplainants: number;
        addedDefendants: number;
        deduplicatedComplainants: number;
        deduplicatedDefendants: number;
    };
};

/**
 * تَجمع كل التَّحقّقات والتَّرحيلات وتُعيد كائنين جاهزَين للكتابة في `set()` واحدة.
 * • لا تُلامس الـ store — كل العَمليات نقية.
 * • أي خَلل يَرفع `MergeValidationError` قبل أن تُكتب أي بيانات (rollback مَجاني).
 */
export function prepareMergedCaseTransaction(
    parent: CriminalCase | undefined,
    child: CriminalCase | undefined,
    mergeReason: string,
    options: { now?: string; createId: () => string } = { createId: () => `${Date.now()}_${Math.random().toString(16).slice(2)}` },
    casesById?: Record<string, CriminalCase | undefined>,
): MergedCaseTransactionResult {
    validateCaseMerge(parent, child, mergeReason, casesById);
    // بعد التَّأكيد أعلاه، parent و child مَعروفان بِيَقين للنوع.
    const parentDef = parent as CriminalCase;
    const childDef = child as CriminalCase;

    const now = options.now ?? new Date().toISOString().slice(0, 10);
    const reason = String(mergeReason).trim();
    const parentCaseNumber = resolveOfficialCaseNumber(parentDef);
    const childCaseNumber = resolveOfficialCaseNumber(childDef);
    const parentNumLabel = parentCaseNumber !== '—' ? parentCaseNumber : 'غير مسجّل';
    const childNumLabel = childCaseNumber !== '—' ? childCaseNumber : 'غير مسجّل';

    // 1) توحيد الأطراف
    const consolidatedParties = consolidatePartiesAfterMerge(parentDef, childDef);

    // 2) ختم سِجلّات الطِفل بختم التَتبّع
    const stampedStatements = stampStatements(childDef, childCaseNumber);
    const stampedTimelineEvents = stampTimelineEvents(childDef, childCaseNumber);
    const stampedInvestigationLogs = stampInvestigationLogs(childDef, childCaseNumber);
    const stampedLawyerRequests = stampLawyerRequests(childDef, childCaseNumber);
    const stampedJudicialDecisions = stampJudicialDecisions(childDef, childCaseNumber);

    // 3) دَمج سجلات الطِفل إلى الأم
    const mergedStatements = [
        ...(Array.isArray(parentDef.statements) ? parentDef.statements : []),
        ...stampedStatements,
    ];
    const mergedInvestigationLogs = [
        ...(Array.isArray(parentDef.investigationLogs) ? parentDef.investigationLogs : []),
        ...stampedInvestigationLogs,
    ];
    const mergedLawyerRequests = [
        ...(Array.isArray(parentDef.lawyerRequests) ? parentDef.lawyerRequests : []),
        ...stampedLawyerRequests,
    ];
    const mergedJudicialDecisions = [
        ...(Array.isArray(parentDef.judicialDecisions) ? parentDef.judicialDecisions : []),
        ...stampedJudicialDecisions,
    ];

    // 4) حدث وحيد على tail تايم لاين الأم يُوثّق الضَم
    const mergeBanner: TimelineEvent = {
        id: options.createId(),
        date: now,
        type: 'decision',
        category: 'ضم وإغلاق إضبارة',
        title: 'ضم وإغلاق إضبارة',
        description: `تم ضم الإضبارة رقم ${childNumLabel} ضمن هذه الإضبارة الأم. السبب: ${reason}`,
    };

    const parentTimeline = [
        ...(Array.isArray(parentDef.timelineEvents) ? parentDef.timelineEvents : []),
        ...stampedTimelineEvents,
        mergeBanner,
    ];

    // 5) سَجلّات السِّجل المضمومة على الأم (شارات النصوص والمعرّفات)
    const prevTexts = (Array.isArray(parentDef.mergedCasesTexts) ? parentDef.mergedCasesTexts : [])
        .map((x) => String(x ?? '').trim())
        .filter((x) => x.length > 0 && !isInternalCaseIdentifier(x));
    const nextTexts =
        childCaseNumber !== '—' && !prevTexts.includes(childCaseNumber) ? [...prevTexts, childCaseNumber] : prevTexts;
    const prevChildIds = resolveMergedCaseIds(parentDef);
    const nextChildIds = prevChildIds.includes(childDef.id) ? prevChildIds : [...prevChildIds, childDef.id];

    const mergeDecision: JudicialDecision = {
        id: options.createId(),
        issuedAt: now,
        title: INVESTIGATION_MERGE_JUDICIAL_TEMPLATE,
        summary: reason,
        decisionType: 'dispositive',
        proceduralTemplate: INVESTIGATION_MERGE_JUDICIAL_TEMPLATE,
        linkedMergedCaseId: childDef.id,
        appeals: [],
        isLocked: true,
        decisionAppealability: 'قابل للطعن على انفراد',
    };

    // 6) الكائن النهائي للأم
    const updatedParent: CriminalCase = {
        ...parentDef,
        complainants: consolidatedParties.complainants,
        defendants: consolidatedParties.defendants,
        statements: mergedStatements,
        timelineEvents: parentTimeline,
        investigationLogs: mergedInvestigationLogs,
        lawyerRequests: mergedLawyerRequests,
        judicialDecisions: [...mergedJudicialDecisions, mergeDecision],
        dossierStatus: 'active',
        mergedCasesTexts: nextTexts,
        mergedCaseIds: nextChildIds,
    };

    // 7) تجميد الطِفل كأرشيف للقراءة فقط مع تَفريغ السجلات (المراجع الآن في الأم).
    const burnNote = `أُغلقت إدارياً وضُمّت إلى الإضبارة رقم ${parentNumLabel} بموجب قرار قضائي${reason ? ` — ${reason}` : ''}`;

    const frozenChild: CriminalCase = {
        ...childDef,
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        lawyerRequests: [],
        judicialDecisions: [],
        dossierStatus: 'merged',
        isArchived: true,
        isFrozen: true,
        mergedIntoCaseId: parentDef.id,
        mergedIntoCaseNumber: parentCaseNumber,
        notes: burnNote,
    };

    return {
        updatedParent,
        frozenChild,
        parentMergeEvent: mergeBanner,
        summary: {
            migratedStatements: stampedStatements.length,
            migratedTimelineEvents: stampedTimelineEvents.length,
            migratedInvestigationLogs: stampedInvestigationLogs.length,
            migratedLawyerRequests: stampedLawyerRequests.length,
            migratedJudicialDecisions: stampedJudicialDecisions.length,
            addedComplainants: consolidatedParties.addedComplainants,
            addedDefendants: consolidatedParties.addedDefendants,
            deduplicatedComplainants: consolidatedParties.deduplicatedComplainants,
            deduplicatedDefendants: consolidatedParties.deduplicatedDefendants,
        },
    };
}

function stripMergeMigrationStamp<T extends { mergedFromCaseId?: string; mergedFromCaseNumber?: string }>(
    row: T,
): T {
    const { mergedFromCaseId: _a, mergedFromCaseNumber: _b, ...rest } = row;
    return rest as T;
}

export function resolveLinkedMergedChildCaseId(
    parent: CriminalCase,
    decision: JudicialDecision,
    allCases: Record<string, CriminalCase>,
): string | null {
    const linked = String(decision.linkedMergedCaseId ?? '').trim();
    if (linked && allCases[linked]) return linked;
    const mergedIds = resolveMergedCaseIds(parent);
    if (mergedIds.length === 1 && allCases[mergedIds[0]!]) return mergedIds[0]!;
    return null;
}

/** نقض قرار التوحيد — فك الضم وإعادة الإضبارة المضمومة كما كانت. */
export function revertCaseMergeAfterCassationAnnulment(
    allCases: Record<string, CriminalCase>,
    parentCaseId: string,
    decision: JudicialDecision,
): { casesById: Record<string, CriminalCase>; error?: string } {
    const parent = allCases[parentCaseId];
    if (!parent) return { casesById: allCases, error: 'الإضبارة الأم غير موجودة.' };

    const template = decision.proceduralTemplate ?? decision.title;
    if (!isInvestigationMergeJudicialTemplate(template)) {
        return { casesById: allCases, error: 'القرار ليس قرار توحيد/ضم.' };
    }

    const childCaseId = resolveLinkedMergedChildCaseId(parent, decision, allCases);
    if (!childCaseId) {
        return { casesById: allCases, error: 'تعذّر تحديد الإضبارة المضمومة المرتبطة بهذا القرار.' };
    }

    const archivedChild = allCases[childCaseId];
    if (!archivedChild) {
        return { casesById: allCases, error: 'الإضبارة المضمومة غير موجودة في النظام.' };
    }

    const childPartyIds = new Set<string>([
        ...(Array.isArray(archivedChild.complainants) ? archivedChild.complainants : []).map((c) => c.id),
        ...(Array.isArray(archivedChild.defendants) ? archivedChild.defendants : []).map((d) => d.id),
    ]);

    const pickMigrated = <T extends { mergedFromCaseId?: string }>(rows: T[] | undefined): T[] =>
        (Array.isArray(rows) ? rows : []).filter((r) => String(r.mergedFromCaseId ?? '').trim() === childCaseId);

    const migratedStatements = pickMigrated(parent.statements).map(stripMergeMigrationStamp);
    const migratedTimeline = pickMigrated(parent.timelineEvents).map(stripMergeMigrationStamp);
    const migratedLogs = pickMigrated(parent.investigationLogs).map(stripMergeMigrationStamp);
    const migratedRequests = pickMigrated(parent.lawyerRequests).map(stripMergeMigrationStamp);
    const migratedDecisions = pickMigrated(parent.judicialDecisions).map(stripMergeMigrationStamp);

    const childNumLabel = resolveOfficialCaseNumber(archivedChild);
    const nextParent: CriminalCase = {
        ...parent,
        complainants: (Array.isArray(parent.complainants) ? parent.complainants : []).filter(
            (c) => !childPartyIds.has(c.id),
        ),
        defendants: (Array.isArray(parent.defendants) ? parent.defendants : []).filter(
            (d) => !childPartyIds.has(d.id),
        ),
        statements: (Array.isArray(parent.statements) ? parent.statements : []).filter(
            (s) => String(s.mergedFromCaseId ?? '').trim() !== childCaseId,
        ),
        timelineEvents: (Array.isArray(parent.timelineEvents) ? parent.timelineEvents : []).filter(
            (ev) =>
                String(ev.mergedFromCaseId ?? '').trim() !== childCaseId &&
                !(
                    ev.category === 'ضم وإغلاق إضبارة' &&
                    String(ev.description ?? '').includes(childNumLabel !== '—' ? childNumLabel : childCaseId)
                ),
        ),
        investigationLogs: (Array.isArray(parent.investigationLogs) ? parent.investigationLogs : []).filter(
            (il) => String(il.mergedFromCaseId ?? '').trim() !== childCaseId,
        ),
        lawyerRequests: (Array.isArray(parent.lawyerRequests) ? parent.lawyerRequests : []).filter(
            (lr) => String(lr.mergedFromCaseId ?? '').trim() !== childCaseId,
        ),
        judicialDecisions: (Array.isArray(parent.judicialDecisions) ? parent.judicialDecisions : []).filter(
            (jd) => String(jd.mergedFromCaseId ?? '').trim() !== childCaseId,
        ),
        mergedCaseIds: resolveMergedCaseIds(parent).filter((id) => id !== childCaseId),
        mergedCasesTexts: (Array.isArray(parent.mergedCasesTexts) ? parent.mergedCasesTexts : []).filter(
            (text) => text !== childNumLabel && text !== childCaseId,
        ),
    };

    const restoredChild: CriminalCase = {
        ...archivedChild,
        isArchived: false,
        isFrozen: false,
        dossierStatus: 'active',
        mergedIntoCaseId: undefined,
        mergedIntoCaseNumber: undefined,
        notes: undefined,
        statements: migratedStatements,
        timelineEvents: migratedTimeline,
        investigationLogs: migratedLogs,
        lawyerRequests: migratedRequests,
        judicialDecisions: migratedDecisions.length ? migratedDecisions : archivedChild.judicialDecisions,
    };

    return {
        casesById: {
            ...allCases,
            [parentCaseId]: nextParent,
            [childCaseId]: restoredChild,
        },
    };
}
