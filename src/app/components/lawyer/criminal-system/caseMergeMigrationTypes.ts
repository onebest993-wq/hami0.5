/**
 * Case merge validation types and error helpers
 */
import type { CriminalCase } from './criminalStore';
import { CROSS_STAGE_MERGE_ERROR_MESSAGE } from './caseMergeTimeline';

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

export function fail(code: MergeValidationCode): never {
    throw new MergeValidationError(code, MERGE_ERROR_MESSAGES[code]);
}

// ────────────────────────────────────────────────────────────
//  دوال التَّحقّق
// ────────────────────────────────────────────────────────────

export function isCaseInTrashLike(c: CriminalCase | undefined): boolean {
    if (!c) return true;
    return Boolean(c.isArchived) || c.dossierStatus === 'merged' || Boolean(String(c.mergedIntoCaseId ?? '').trim());
}

export function isCaseFrozen(c: CriminalCase | undefined): boolean {
    return c?.isFrozen === true;
}

/**
 * تَحقّقات الضم — الشرط القانوني الوحيد: نفس المرحلة الإجرائية (مع استقلال مسار الأحداث).
 */
