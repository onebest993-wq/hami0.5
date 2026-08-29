import { describe, expect, it } from 'vitest';
import {
    filterByLawsuitJurisdictionTab,
    resolveLawsuitJurisdiction,
} from '../lawsuitJurisdiction';

describe('resolveLawsuitJurisdiction', () => {
    it('uses stored lawsuitJurisdiction when present', () => {
        expect(resolveLawsuitJurisdiction({ lawsuitJurisdiction: 'personal' })).toBe('personal');
        expect(resolveLawsuitJurisdiction({ selectedType: 'civil' })).toBe('civil');
    });

    it('infers personal from court/docType hints for legacy files', () => {
        expect(
            resolveLawsuitJurisdiction({ court: 'محكمة الأحوال الشخصية', docType: 'نفقة' }),
        ).toBe('personal');
    });

    it('defaults to civil when no personal signal', () => {
        expect(resolveLawsuitJurisdiction({ court: 'بداءة الكرخ', docType: 'تعويض' })).toBe('civil');
    });
});

describe('isPersonalStatusFile follows the same jurisdiction source', () => {
    it('treats legacy court hints as personal, not civil-first', async () => {
        const { isPersonalStatusFile } = await import(
            '@/app/components/lawyer/personal-status/personalStatusValidation'
        );
        expect(isPersonalStatusFile({ court: 'محكمة الأحوال الشخصية' })).toBe(true);
        expect(isPersonalStatusFile({ lawsuitJurisdiction: 'personal' })).toBe(true);
        expect(isPersonalStatusFile({ lawsuitJurisdiction: 'civil' })).toBe(false);
        expect(isPersonalStatusFile({ court: 'بداءة الكرخ', docType: 'تعويض' })).toBe(false);
    });
});

describe('filterByLawsuitJurisdictionTab', () => {
    const files = [
        { id: 1, lawsuitJurisdiction: 'civil' as const },
        { id: 2, lawsuitJurisdiction: 'personal' as const },
        { id: 3, court: 'محكمة الأحوال الشخصية' },
    ];

    it('returns all files for tab all', () => {
        expect(filterByLawsuitJurisdictionTab(files, 'all')).toHaveLength(3);
    });

    it('filters by civil or personal tab', () => {
        expect(filterByLawsuitJurisdictionTab(files, 'civil').map((f) => f.id)).toEqual([1]);
        expect(filterByLawsuitJurisdictionTab(files, 'personal').map((f) => f.id)).toEqual([2, 3]);
    });
});
