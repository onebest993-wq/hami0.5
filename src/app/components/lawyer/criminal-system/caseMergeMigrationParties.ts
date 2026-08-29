import type { CriminalCase, CriminalComplainant, CriminalDefendant, InvestigationLog, LawyerRequest, Statement, TimelineEvent } from './criminalStore';
import type { JudicialDecision } from '@/app/types/criminal';

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

export function stampStatements(child: CriminalCase, childNumber: string): Statement[] {
    const list = Array.isArray(child.statements) ? child.statements : [];
    return list.map((s) => ({
        ...s,
        mergedFromCaseId: child.id,
        mergedFromCaseNumber: childNumber || s.mergedFromCaseNumber,
    }));
}

export function stampTimelineEvents(child: CriminalCase, childNumber: string): TimelineEvent[] {
    const list = Array.isArray(child.timelineEvents) ? child.timelineEvents : [];
    return list.map((ev) => ({
        ...ev,
        mergedFromCaseId: child.id,
        mergedFromCaseNumber: childNumber || ev.mergedFromCaseNumber,
    }));
}

export function stampInvestigationLogs(child: CriminalCase, childNumber: string): InvestigationLog[] {
    const list = Array.isArray(child.investigationLogs) ? child.investigationLogs : [];
    return list.map((il) => ({
        ...il,
        mergedFromCaseId: child.id,
        mergedFromCaseNumber: childNumber || il.mergedFromCaseNumber,
    }));
}

export function stampLawyerRequests(child: CriminalCase, childNumber: string): LawyerRequest[] {
    const list = Array.isArray(child.lawyerRequests) ? child.lawyerRequests : [];
    return list.map((lr) => ({
        ...lr,
        mergedFromCaseId: child.id,
        mergedFromCaseNumber: childNumber || lr.mergedFromCaseNumber,
    }));
}

export function stampJudicialDecisions(child: CriminalCase, childNumber: string): JudicialDecision[] {
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

