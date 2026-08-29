import type { CriminalCase, InvestigationLog, LawyerRequest, Statement, TimelineEvent } from './criminalStore';
import type { JudicialDecision } from '@/app/types/criminal';
import { isInvestigationMergeJudicialTemplate } from './proceduralRequestTypes';
import {
    resolveLinkedMergedChildCaseId,
    stripMergeMigrationStamp,
} from './caseMergeMigrationPrepare';
import { resolveMergedCaseIds } from './criminalCaseMergeUtils';
import { resolveOfficialCaseNumber } from './criminalCaseReferenceUtils';

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

