export const DETENTION_DECISION_TEMPLATE = 'قرار توقيف المتهم';
export const BAIL_RELEASE_TEMPLATE = 'طلب إخلاء سبيل بكفالة / بتعهد';
const PRIVATE_RIGHT_WAIVER_REQUEST_TYPE = 'التنازل عن الشكوى وطلب الغلق';
const INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE = 'غلق الدعوى مؤقتاً (مادة 130)';
const INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE = 'غلق نهائي موضوعي (مادة 130)';
const INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE = 'غلق نهائي شخصي (مادة 130)';
const INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE = 'تفريق وشطر الإضبارة (قرار قضائي)';
const INVESTIGATION_MERGE_JUDICIAL_TEMPLATE = 'ضم وتوحيد الإضبارة (قرار قضائي)';

const LEGACY_TEMPLATE_ALIASES: Record<string, string> = {
    'قرار إخلاء سبيل بكفالة / تعهد': BAIL_RELEASE_TEMPLATE,
    'قرار توقيف / تمديد توقيف': DETENTION_DECISION_TEMPLATE,
    'قرار توقيف ابتداءً': DETENTION_DECISION_TEMPLATE,
    'قرار تمديد توقيف': DETENTION_DECISION_TEMPLATE,
    'غلق نهائي (مادة 130)': INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE,
};

export function normalizeProceduralRequestTemplate(template: string | undefined): string {
    const key = String(template ?? '').trim();
    return LEGACY_TEMPLATE_ALIASES[key] ?? key;
}

export function isInvestigationClosureAppealablePurgeTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return (
        key === INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE ||
        key === INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE ||
        key === INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE ||
        key === INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE
    );
}

export function isInvestigationStructuralCassationTemplate(template: string | undefined): boolean {
    return (
        isInvestigationClosureAppealablePurgeTemplate(template) ||
        normalizeProceduralRequestTemplate(String(template ?? '').trim()) ===
            INVESTIGATION_MERGE_JUDICIAL_TEMPLATE
    );
}

export function formatJudicialTemplateDisplayLabel(title: string | undefined): string {
    const key = normalizeProceduralRequestTemplate(String(title ?? '').trim());
    if (key === PRIVATE_RIGHT_WAIVER_REQUEST_TYPE) return 'صلح/ تنازل';
    if (key === DETENTION_DECISION_TEMPLATE) return 'توقيف المتهم';
    return String(title ?? '')
        .replace(/\s*\(\s*مادة\s*130\s*\)/gi, '')
        .replace(/\s*\(\s*قرار\s*قضائي\s*\)/gi, '')
        .replace(/^قرار\s*قضائي\s*:\s*/i, '')
        .replace(/\s*—\s*مادة\s*130\s*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

