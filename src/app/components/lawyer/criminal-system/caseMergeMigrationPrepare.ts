import type { CriminalCase, InvestigationLog, LawyerRequest, Statement, TimelineEvent } from './criminalStore';
import type { JudicialDecision } from '@/app/types/criminal';
import { resolveMergedCaseIds } from './criminalCaseMergeUtils';
import { resolveOfficialCaseNumber } from './criminalCaseReferenceUtils';
import { INVESTIGATION_MERGE_JUDICIAL_TEMPLATE } from './proceduralRequestTypes';
import { validateCaseMerge } from './caseMergeMigrationValidate';
import { isInternalCaseIdentifier } from './criminalCaseReferenceUtils';
import {
    consolidatePartiesAfterMerge,
    formatMergeProvenanceBadge,
    stampStatements,
    stampTimelineEvents,
    stampInvestigationLogs,
    stampLawyerRequests,
    stampJudicialDecisions,
} from './caseMergeMigrationParties';

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

export function stripMergeMigrationStamp<T extends { mergedFromCaseId?: string; mergedFromCaseNumber?: string }>(
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
