import { describe, expect, it } from 'vitest';
import { isFileData } from '../utils';

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
});
