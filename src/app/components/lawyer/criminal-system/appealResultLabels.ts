import { formatCassationResultShortLabelLite, normalizeCassationAppealResultLite } from './cassationResultSummary';

const VERDICT_CASSATION_RESULT_LABELS: Record<string, string> = {
    verdict_formal_dismissal: 'رد الطعن شكلاً',
    verdict_substantive_affirmation: 'تأييد القرار موضوعاً',
    verdict_quash_remand_retrial: 'نقض القرار وإعادة الأوراق لنفس المحكمة لإعادة المحاكمة',
    verdict_quash_referral_jurisdiction: 'نقض القرار وإحالة الدعوى لمحكمة أخرى لعدم الاختصاص',
    verdict_quash_modify_mitigate: 'نقض القرار وتعديله موضوعياً (تخفيف العقوبة / الإفراج)',
    verdict_quash_modify_aggravate: 'نقض القرار وتعديله موضوعياً (تشديد العقوبة)',
};

const CASSATION_RESULT_LABELS: Record<string, string> = {
    affirmation: 'تصديق',
    procedural_affirmation: 'تأييد القرار',
    quash_remand: 'نقض وإعادة',
    procedural_remand_direction: 'نقض وإعادة',
    quash_modify: 'نقض وتعديل',
    quash_dismissal: 'نقض (إفراج)',
    procedural_annulment: 'نقض القرار',
};

function verdictCassationResultLabelLite(resultRaw: string | undefined): string {
    const key = String(resultRaw ?? '').trim();
    if (!key) return '—';
    const exact = VERDICT_CASSATION_RESULT_LABELS[key];
    if (exact) return exact;
    if (key === 'تأييد القرار') return 'تأييد القرار';
    if (/نقض.*إعادة/i.test(key)) return 'نقض القرار وإعادة الأوراق لنفس المحكمة لإعادة المحاكمة';
    return key;
}

export function formatAppealResultLabelLite(raw: string): string {
    const key = String(raw ?? '').trim();
    if (!key) return '';
    if (key.startsWith('verdict_')) {
        const verdictLabel = verdictCassationResultLabelLite(key);
        if (verdictLabel && verdictLabel !== '—' && verdictLabel !== key) return verdictLabel;
    }
    const norm = normalizeCassationAppealResultLite(key);
    const short = formatCassationResultShortLabelLite(norm);
    if (short) return short;
    const mapped = CASSATION_RESULT_LABELS[norm] ?? CASSATION_RESULT_LABELS[key];
    if (mapped) return mapped;
    if (key === 'upheld') return 'تأييد القرار';
    if (key === 'quashed') return 'نقض القرار';
    return key;
}

export function resolveAppealResultCategoryLite(raw: string): 'upheld' | 'quashed' | '' {
    const key = String(raw ?? '').trim();
    if (!key) return '';
    const norm = normalizeCassationAppealResultLite(key);
    if (norm === 'affirmation' || norm === 'procedural_affirmation' || key === 'upheld') {
        return 'upheld';
    }
    if (
        norm === 'quash_dismissal' ||
        norm === 'quash_remand' ||
        norm === 'quash_modify' ||
        norm === 'procedural_annulment' ||
        norm === 'procedural_remand_direction' ||
        key === 'quashed'
    ) {
        return 'quashed';
    }
    if (/تأييد|تصديق/i.test(key)) return 'upheld';
    if (/نقض/i.test(key)) return 'quashed';
    return '';
}
