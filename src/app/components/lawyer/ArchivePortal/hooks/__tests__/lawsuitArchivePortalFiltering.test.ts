import { describe, expect, it } from 'vitest';
import {
    archiveTextMatchesQuery,
    normalizeArabicSearch,
} from '@/app/services/search/normalizeArabicSearch';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';
import {
    filterLawsuitArchiveFiles,
    filterLawsuitCriminalCases,
    resolveLawsuitLifecycleSourceFiles,
} from '@/app/components/lawyer/ArchivePortal/hooks/lawsuitArchivePortalFiltering';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';

function file(partial: Partial<FileData> & { id: number }): FileData {
    return {
        type: 'lawsuit',
        status: 'active',
        caseNo: '',
        court: '',
        parties: [],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
        ...partial,
    } as FileData;
}

describe('normalizeArabicSearch (professional search foundation)', () => {
    it('folds alef variants and ta-marbuta / alif maqsura', () => {
        expect(normalizeArabicSearch('أحمد')).toBe(normalizeArabicSearch('احمد'));
        expect(normalizeArabicSearch('مدرسة')).toBe(normalizeArabicSearch('مدرسه'));
        expect(normalizeArabicSearch('على')).toBe(normalizeArabicSearch('علي'));
    });

    it('strips tashkeel', () => {
        expect(normalizeArabicSearch('مُحَمَّد')).toBe(normalizeArabicSearch('محمد'));
    });

    it('folds Indic and Persian digits to Western', () => {
        expect(normalizeArabicSearch('٢٠٢٤/١')).toBe('2024/1');
        expect(normalizeArabicSearch('۲۰۲۴')).toBe('2024');
    });

    it('collapses spaces around case-number slashes', () => {
        expect(normalizeArabicSearch('2024 / 15')).toBe('2024/15');
    });

    it('strips bidi overrides', () => {
        expect(normalizeArabicSearch('علي\u202Eخصم')).toBe(normalizeArabicSearch('عليخصم'));
    });

    it('archiveTextMatchesQuery treats empty query as match-all', () => {
        expect(archiveTextMatchesQuery('أي نص', '   ')).toBe(true);
        expect(archiveTextMatchesQuery('أحمد علي', 'احمد')).toBe(true);
        expect(archiveTextMatchesQuery('رقم ٢٠٢٥/٣', '2025/3')).toBe(true);
    });
});

describe('filterLawsuitArchiveFiles', () => {
    const pool: FileData[] = [
        file({
            id: 1,
            caseNo: '2025/ب/100',
            court: 'بداءة الكرخ',
            lawsuitJurisdiction: 'civil',
            parties: [{ id: 'p1', name: 'أحمد محمود', role: 'plaintiff' }],
        }),
        file({
            id: 2,
            caseNo: '٢٠٢٥/ش/٢٠',
            court: 'محكمة الأحوال الشخصية',
            lawsuitJurisdiction: 'personal',
            title: 'نفقة زوجية',
            parties: [{ id: 'p2', name: 'فاطمة حسن', role: 'plaintiff' }],
        }),
        file({
            id: 3,
            caseNo: '2024 / 9',
            court: 'استئناف بغداد',
            lawsuitJurisdiction: 'civil',
            parties: [{ id: 'p3', name: 'شركة النور', role: 'defendant' }],
        }),
    ];

    it('empty / whitespace query returns full jurisdiction pool', () => {
        expect(filterLawsuitArchiveFiles(pool, 'all', '')).toHaveLength(3);
        expect(filterLawsuitArchiveFiles(pool, 'all', '   ')).toHaveLength(3);
    });

    it('matches caseNo, court, and party with Arabic fold', () => {
        expect(filterLawsuitArchiveFiles(pool, 'all', 'احمد')).toHaveLength(1);
        expect(filterLawsuitArchiveFiles(pool, 'all', 'الكرخ')).toHaveLength(1);
        expect(filterLawsuitArchiveFiles(pool, 'all', '2025/ب/100')).toHaveLength(1);
    });

    it('matches Indic digits against Western query', () => {
        const hits = filterLawsuitArchiveFiles(pool, 'all', '2025/ش/20');
        expect(hits).toHaveLength(1);
        expect(hits[0]?.id).toBe(2);
    });

    it('matches case numbers with spaced slashes', () => {
        expect(filterLawsuitArchiveFiles(pool, 'all', '2024/9')).toHaveLength(1);
    });

    it('respects civil / personal jurisdiction tabs', () => {
        expect(filterLawsuitArchiveFiles(pool, 'civil', '')).toHaveLength(2);
        expect(filterLawsuitArchiveFiles(pool, 'personal', '')).toHaveLength(1);
        expect(filterLawsuitArchiveFiles(pool, 'criminal', 'احمد')).toHaveLength(0);
    });

    it('clamps unsafe / oversized queries safely', () => {
        const long = `${'ا'.repeat(200)}<script>alert(1)</script>`;
        const clamped = clampGlobalSearchQuery(long);
        expect(clamped.length).toBeLessThanOrEqual(128);
        expect(clamped).not.toContain('<script>');
        expect(() => filterLawsuitArchiveFiles(pool, 'all', long)).not.toThrow();
    });

    it('returns empty results (not throw) for no match', () => {
        expect(filterLawsuitArchiveFiles(pool, 'all', 'لايوجدهذاالنص')).toEqual([]);
    });
});

describe('resolveLawsuitLifecycleSourceFiles + criminal filter', () => {
    it('picks trash/archived pools', () => {
        const active = [file({ id: 1 })];
        const archived = [file({ id: 2 })];
        const trash = [file({ id: 3 })];
        expect(resolveLawsuitLifecycleSourceFiles('active', active, archived, trash)[0]?.id).toBe(1);
        expect(resolveLawsuitLifecycleSourceFiles('archived', active, archived, trash)[0]?.id).toBe(2);
        expect(resolveLawsuitLifecycleSourceFiles('trash', active, archived, trash)[0]?.id).toBe(3);
    });

    it('filters criminal cases with Arabic-normalized haystack', () => {
        const cases = [
            {
                id: 'c1',
                isArchived: false,
                createdAt: '2026-01-02T00:00:00.000Z',
                basics: { crimeType: 'سرقة', stage: 'مرحلة المحاكمة' },
                complainants: [{ fullName: 'أحمد' }],
                defendants: [{ name: 'خالد' }],
                location: { courtName: 'جنايات الكرخ', caseNumber: '١٢٣' },
            },
        ];
        const hits = filterLawsuitCriminalCases(cases, 'active', 'criminal', 'احمد', true);
        expect(hits).toHaveLength(1);
        expect(filterLawsuitCriminalCases(cases, 'active', 'criminal', '123', true)).toHaveLength(1);
        expect(filterLawsuitCriminalCases(cases, 'trash', 'criminal', 'احمد', true)).toHaveLength(0);
    });
});
