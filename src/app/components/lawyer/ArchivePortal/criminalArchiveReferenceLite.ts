/**
 * مرجع جزائي خفيف لأرشيف الدعاوى — بلا criminalStagePresentationCore.
 * يكفي لعناوين الحذف/البحث؛ البطاقة الكاملة تستخدم التنسيق الغني داخل CriminalArchiveCard.
 */
export function criminalCaseReferenceLite(c: Record<string, unknown>): {
    primary: string;
    secondary: string;
} {
    const stage = String((c.basics as { stage?: string } | undefined)?.stage ?? '').trim();
    const location =
        c.location && typeof c.location === 'object' ? (c.location as Record<string, unknown>) : {};
    const courtName =
        String(location.courtName ?? '').trim() ||
        String(location.investigationCourtName ?? '').trim();
    const caseNumber =
        String(c.courtCaseNumber ?? '').trim() ||
        String(location.caseNumber ?? '').trim() ||
        String(location.investigationDossierNumber ?? '').trim() ||
        String(location.baseRegisterNumberAndDate ?? '').trim();

    if (stage === 'مرحلة التحقيق') {
        const papersAt = String(location.investigationPapersAt ?? '').trim();
        const primary = papersAt || courtName || 'مرحلة التحقيق';
        return { primary, secondary: caseNumber || '—' };
    }

    return {
        primary: courtName || stage || '—',
        secondary: caseNumber || '—',
    };
}

export function criminalSearchHaystackLite(c: Record<string, unknown>): string {
    const ref = criminalCaseReferenceLite(c);
    const basics = (c.basics && typeof c.basics === 'object' ? c.basics : {}) as Record<string, unknown>;
    const complainants = Array.isArray(c.complainants) ? c.complainants : [];
    const defendants = Array.isArray(c.defendants) ? c.defendants : [];
    const parts = [
        ref.primary,
        ref.secondary,
        String(basics.legalArticle ?? ''),
        String(basics.crimeType ?? ''),
        String(c.notes ?? ''),
        ...complainants.map((p) =>
            p && typeof p === 'object'
                ? String(
                      (p as { fullName?: string; name?: string }).fullName ??
                          (p as { name?: string }).name ??
                          '',
                  )
                : '',
        ),
        ...defendants.map((p) =>
            p && typeof p === 'object'
                ? String(
                      (p as { fullName?: string; name?: string }).fullName ??
                          (p as { name?: string }).name ??
                          '',
                  )
                : '',
        ),
    ];
    return parts.join(' ').toLowerCase();
}
