import type { CriminalCase, InvestigationPapersAt } from './criminalCaseModel';

export const CASE_IDENTITY_CORRECTION_CATEGORY = 'تصحيح بيانات الإضبارة';

export function validateIdentityCorrectionInput(newValue: string, reason: string): string | null {
    const next = String(newValue ?? '').trim();
    const why = String(reason ?? '').trim();
    if (!next) return 'أدخل القيمة الصحيحة الجديدة.';
    if (next.length < 2) return 'الاسم قصير جداً — تحقق من الإدخال.';
    if (why && why.length < 4) return 'سبب التصحيح قصير — اذكر المبرر باختصار.';
    return null;
}

export function validatePartyPhoneCorrection(value: string): string | null {
    const next = String(value ?? '').trim();
    if (!next) return 'أدخل رقم الهاتف.';
    if (next.length < 7) return 'رقم الهاتف قصير — تحقق من الإدخال.';
    return null;
}

export function validateIdentityCorrectionReason(reason: string): string | null {
    const why = String(reason ?? '').trim();
    if (!why) return 'أدخل سبب التصحيح.';
    if (why.length < 4) return 'سبب التصحيح قصير — اذكر المبرر باختصار.';
    return null;
}

export function validateDepositionCorrectionInput(
    papersAt: InvestigationPapersAt,
    entityName: string,
    reason: string,
): string | null {
    if (papersAt !== 'مركز شرطة' && papersAt !== 'مكتب تحقيق قضائي') {
        return 'اختر نوع جهة الإيداع (مركز شرطة أو مكتب تحقيق).';
    }
    return validateIdentityCorrectionInput(entityName, reason);
}

export function caseIdentityCorrectionBlocked(target: CriminalCase | undefined | null): boolean {
    if (!target) return true;
    if (target.isArchived) return true;
    if (target.isFrozen) return true;
    if (target.dossierStatus === 'merged' || Boolean(String(target.mergedIntoCaseId ?? '').trim())) {
        return true;
    }
    return false;
}

/** تعديل ترويسة الإضbارة (محكمة، مادة، أرقام) — مسموح حتى لو كانت مجمدة إجرائياً. */
export function caseHeaderMetadataEditBlocked(target: CriminalCase | undefined | null): boolean {
    if (!target) return true;
    if (target.isArchived) return true;
    if (target.dossierStatus === 'merged' || Boolean(String(target.mergedIntoCaseId ?? '').trim())) {
        return true;
    }
    return false;
}

export function identityCorrectionTimelineDescription(
    label: string,
    prior: string,
    next: string,
    reason: string,
): string {
    const field = String(label ?? '').trim() || 'البيان';
    const from = String(prior ?? '').trim() || '—';
    const to = String(next ?? '').trim() || '—';
    const why = String(reason ?? '').trim();
    const body = `تصحيح ${field}\nمن: ${from}\nإلى: ${to}`;
    return why ? `${body}\nالسبب: ${why}` : body;
}
