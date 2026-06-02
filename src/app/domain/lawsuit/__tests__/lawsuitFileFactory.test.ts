import { describe, expect, it } from 'vitest';
import {
    buildFileDataFromNewCaseSave,
    filterLawsuitWorkspaceFiles,
} from '../lawsuitFileFactory';

describe('filterLawsuitWorkspaceFiles', () => {
    it('keeps active lawsuit files only', () => {
        const files = [
            { id: 1, type: 'lawsuit', status: 'active' },
            { id: 2, type: 'lawsuit', status: 'deleted' },
            { id: 3, type: 'execution', status: 'active' },
        ];
        expect(filterLawsuitWorkspaceFiles(files).map((f) => f.id)).toEqual([1]);
    });
});

describe('buildFileDataFromNewCaseSave', () => {
    it('builds from LawyerNewCase CaseFormData shape', () => {
        const file = buildFileDataFromNewCaseSave({
            title: 'lawsuit',
            type: 'civil',
            court: 'محكمة الكرخ',
            caseNumber: '100 / أ / 2026',
            subType: 'مطالبة مالية',
            parties: [
                { id: 'p1', name: 'موكل', role: 'مدعي', isClient: true },
                { id: 'p2', name: 'خصم', role: 'مدعى عليه', isClient: false },
            ],
        });
        expect(file).not.toBeNull();
        expect(file!.type).toBe('lawsuit');
        expect(file!.court).toBe('محكمة الكرخ');
        expect(file!.caseNo).toBe('100 / أ / 2026');
        expect(file!.docType).toBe('مطالبة مالية');
        expect(file!.parties).toHaveLength(2);
        expect(file!.parties[0]!.isClient).toBe(true);
    });

    it('builds from structured dashboard payload with details and parties1/2', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            parties1: [{ id: 1, name: 'المدعي', status: 'مدعي', phone: '07' }],
            parties2: [{ id: 2, name: 'المدعى', status: 'مدعى عليه' }],
            details: {
                number: '50 / ب / 2025',
                court: 'بداءة',
                type: 'تعويض',
                totalAgreedFees: '1,000,000',
            },
        });
        expect(file!.caseNo).toBe('50 / ب / 2025');
        expect(file!.feesTotal).toBe('1000000');
        expect(file!.parties).toHaveLength(2);
    });

    it('persists lawsuitJurisdiction from selectedType on structured save', () => {
        const personal = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'personal',
            parties1: [{ name: 'موكل', status: 'مدعي' }],
            parties2: [{ name: 'خصم', status: 'مدعى عليه' }],
            details: { number: '1 / أ / 2026', court: 'أحوال' },
        });
        expect(personal!.lawsuitJurisdiction).toBe('personal');

        const civil = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'civil',
            parties1: [{ name: 'موكل', status: 'مدعي' }],
            parties2: [{ name: 'خصم', status: 'مدعى عليه' }],
            details: { number: '2 / ب / 2026', court: 'بداءة' },
        });
        expect(civil!.lawsuitJurisdiction).toBe('civil');
    });
});
