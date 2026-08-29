/** تبويب أقسام مخزن الدعاوى: اختصاصات مدنية + الجزائي. */
export type LawsuitJurisdictionTab = 'all' | 'civil' | 'personal' | 'criminal';

type LawsuitJurisdiction = 'civil' | 'personal';

const PERSONAL_JURISDICTION_HINT =
    /أحوال|شخصية|زواج|طلاق|نفقة|حضانة|مهر|قانون\s*1959|قانون\s*2025/i;

export type LawsuitJurisdictionSource = {
    lawsuitJurisdiction?: string;
    selectedType?: string;
    court?: string;
    docType?: string;
    subInfo?: string;
};

/** يحدد اختصاص الدعوى للعرض في المخزن (محفوظ أو استنتاج من بيانات قديمة). */
export function resolveLawsuitJurisdiction(file: LawsuitJurisdictionSource): LawsuitJurisdiction {
    const raw = String(file.lawsuitJurisdiction ?? file.selectedType ?? '').toLowerCase();
    if (raw === 'personal') return 'personal';
    if (raw === 'civil') return 'civil';

    const hay = [file.court, file.docType, file.subInfo].filter(Boolean).join(' ');
    if (PERSONAL_JURISDICTION_HINT.test(hay)) return 'personal';
    return 'civil';
}

export function filterByLawsuitJurisdictionTab<T extends LawsuitJurisdictionSource>(
    files: T[],
    tab: LawsuitJurisdictionTab,
): T[] {
    if (tab === 'all') return files;
    return files.filter((f) => resolveLawsuitJurisdiction(f) === tab);
}
