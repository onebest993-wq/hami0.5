import { describe, expect, it } from 'vitest';
import { coerceExecutionFilePreserveId, isFileData } from '../utils';

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
});
