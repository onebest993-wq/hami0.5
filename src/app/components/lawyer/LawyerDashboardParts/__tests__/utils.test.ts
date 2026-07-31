import { describe, expect, it } from 'vitest';
import { buildFileDataFromNewCaseSave } from '@/app/domain/lawsuit/lawsuitFileFactory';
import {
    coerceExecutionFilePreserveId,
    isFileData,
    mapLawsuitFilesToLegalCases,
    normalizeFileDataForOpen,
    resolveOpenableFileData,
} from '../utils';

describe('LawyerDashboard utils', () => {
    it('isFileData accepts numeric and string ids', () => {
        const base = {
            type: 'lawsuit',
            caseNo: '1/2026',
            court: 'اختبار',
            parties: [],
            status: 'active',
        };
        expect(isFileData({ ...base, id: 42 })).toBe(true);
        expect(isFileData({ ...base, id: 'legacy-id' })).toBe(true);
        expect(isFileData({ ...base, id: '' })).toBe(false);
        expect(isFileData({ ...base, id: null })).toBe(false);
    });

    it('isFileData accepts caseNumber alias and court object', () => {
        expect(
            isFileData({
                id: 1,
                type: 'lawsuit',
                caseNumber: '234 / ب / 2024',
                court: { name: 'بداءة الكرخ' },
                parties: [],
                status: 'active',
            }),
        ).toBe(true);
    });

    it('resolveOpenableFileData normalizes archive rows and resolves from pool', () => {
        const poolFile = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            parties1: [{ name: 'مدعي', status: 'مدعي' }],
            parties2: [{ name: 'مدعى', status: 'مدعى عليه' }],
            details: { number: '10 / ب / 2026', court: 'محكمة' },
        })!;
        const enrichedRow = { ...poolFile, smartStatus: { label: 'مستمرة' } };
        expect(resolveOpenableFileData(enrichedRow, [poolFile])?.caseNo).toBe('10 / ب / 2026');
        expect(
            normalizeFileDataForOpen({
                id: 99,
                type: 'lawsuit',
                caseNumber: '1 / أ / 2025',
                court: { name: 'استئناف' },
                parties: [{ id: 1, name: 'أ', role: 'مدعي', isClient: true }],
                status: 'active',
            })?.court,
        ).toBe('استئناف');
    });

    it('file id equality is compared as strings in dashboard merge paths', () => {
        expect(String(990_001)).toBe(String('990001'));
        expect(990_001 === ('990001' as unknown as number)).toBe(false);
    });

    it('coerceExecutionFilePreserveId keeps debtor employment from debtors[] over creditor/debtor singletons', () => {
        const normalized = coerceExecutionFilePreserveId({
            id: 'exec-1',
            type: 'execution',
            status: 'active',
            creditor: { id: 1, name: 'دائن', role: 'الدائن' },
            debtor: { id: 2, name: 'مدين', role: 'المدين' },
            debtors: [
                {
                    id: 2,
                    name: 'مدين',
                    role: 'المدين',
                    occupation: 'موظف',
                    employmentType: 'موظف',
                    isEmployee: true,
                },
            ],
        });
        const d0 = normalized.debtors?.[0] as { isEmployee?: boolean; occupation?: string } | undefined;
        expect(d0?.isEmployee).toBe(true);
        expect(d0?.occupation).toBe('موظف');
    });

    it('coerceExecutionFilePreserveId keeps notes as string only, not lawsuit array', () => {
        const fromArray = coerceExecutionFilePreserveId({
            id: 'exec-notes',
            type: 'execution',
            notes: [{ id: 1, text: 'legacy' }],
        });
        expect(Array.isArray(fromArray.notes)).toBe(false);
        expect(fromArray.notes).toBeUndefined();

        const fromString = coerceExecutionFilePreserveId({
            id: 'exec-notes-2',
            type: 'execution',
            notes: '  ملاحظة تنفيذ  ',
        });
        expect(fromString.notes).toBe('ملاحظة تنفيذ');
    });

    it('coerceExecutionFilePreserveId keeps instrument fields from creation payload', () => {
        const normalized = coerceExecutionFilePreserveId({
            id: 'exec-instrument',
            type: 'execution',
            status: 'active',
            classification: 'مدني',
            docType: 'قرارات وأحكام المحاكم',
            docNumber: '441/ب/2024',
            judgmentDate: '2024-06-15',
            claimType: 'مبلغ نقدي',
            directorate: 'مديرية تنفيذ الكرخ',
            fileNumber: '100',
            fileYear: '2026',
        });
        expect(normalized.docType).toBe('قرارات وأحكام المحاكم');
        expect(normalized.docNumber).toBe('441/ب/2024');
        expect(normalized.judgmentDate).toBe('2024-06-15');
        expect(normalized.claimType).toBe('مبلغ نقدي');
        expect(normalized.classification).toBe('مدني');
        expect(normalized.directorate).toBe('مديرية تنفيذ الكرخ');
    });

    it('mapLawsuitFilesToLegalCases يحوّل الأطراف والحالة', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            parties1: [{ name: 'المدعي', status: 'مدعي', isClient: true }],
            parties2: [{ name: 'المدعى عليه', status: 'مدعى عليه' }],
            details: { number: '5 / ب / 2026', court: 'محكمة الكرخ' },
        })!;
        const [mapped] = mapLawsuitFilesToLegalCases([file]);
        expect(mapped.clientName).toBe('المدعي');
        expect(mapped.opponentName).toBe('المدعى عليه');
        expect(mapped.status).toBe('active');
        expect(mapped.id).toBe(String(file.id));
    });
});
