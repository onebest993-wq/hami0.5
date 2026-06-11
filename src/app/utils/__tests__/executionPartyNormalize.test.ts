import { describe, expect, it } from 'vitest';
import { coerceExecutionFile, coerceExecutionFilePreserveId } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { getExecutionPartyDisplayName } from '@/app/utils/partyDisplayName';
import { normalizeExecutionPartyList, resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';

describe('executionPartyNormalize', () => {
    it('resolvePartyStoredName prefers fullName then name', () => {
        expect(resolvePartyStoredName({ fullName: '  أحمد  ', name: '' })).toBe('أحمد');
        expect(resolvePartyStoredName({ name: 'علي' })).toBe('علي');
    });

    it('normalizeExecutionPartyList keeps parties with fullName only', () => {
        const list = normalizeExecutionPartyList(
            [{ id: 1, fullName: 'الدائن الأول', phone: '07' }],
            'الدائن',
        );
        expect(list).toHaveLength(1);
        expect(list[0]?.name).toBe('الدائن الأول');
    });

    it('coerceExecutionFilePreserveId does not wipe creditors when only fullName is stored', () => {
        const file = coerceExecutionFilePreserveId({
            id: 'ex-1',
            type: 'execution',
            creditors: [{ id: 1, fullName: 'محمد كريم', isClient: true }],
            debtors: [{ id: 2, fullName: 'سامي جاسم' }],
        });
        expect(file.creditors?.[0]?.name).toBe('محمد كريم');
        expect(file.debtors?.[0]?.name).toBe('سامي جاسم');
    });

    it('coerce drops empty parties rows and keeps creditors with fullName', () => {
        const file = coerceExecutionFilePreserveId({
            id: 'ex-2',
            type: 'execution',
            parties: [{ id: 1, name: '' }, { id: 2, fullName: 'مدين فعلي', role: 'المدين' }],
            creditors: [{ id: 10, fullName: 'دائن مخزن' }],
        });
        expect(file.creditors?.[0]?.name).toBe('دائن مخزن');
        expect(file.debtors?.some((d) => d.name === 'مدين فعلي')).toBe(true);
    });

    it('coerceExecutionFile preserves creditors from creation payload', () => {
        const file = coerceExecutionFile(
            {
                directorate: 'تنفيذ الكرخ',
                fileNumber: '12',
                fileYear: '2026',
                creditors: [{ id: 1, name: 'علي الدائن', isClient: true }],
                debtors: [{ id: 2, name: 'حسن المدين', address: 'كرخ' }],
            },
            Date.now(),
        );
        expect(file.creditors?.[0]?.name).toBe('علي الدائن');
        expect(file.debtors?.[0]?.name).toBe('حسن المدين');
    });

    it('getExecutionPartyDisplayName uses fullName', () => {
        const disp = getExecutionPartyDisplayName(
            { id: 1, name: '', fullName: 'زينب', phone: '', address: '', occupation: '', isClient: false, nationality: '' },
            'creditor',
            0,
            null,
        );
        expect(disp.text).toBe('زينب');
    });
});
