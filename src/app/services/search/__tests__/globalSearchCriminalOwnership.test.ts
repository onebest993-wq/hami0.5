import { describe, expect, it } from 'vitest';
import {
    isOwnedCriminalCaseId,
    resolveCriminalCaseId,
} from '@/app/services/search/globalSearchCriminalOwnership';

describe('globalSearchCriminalOwnership', () => {
    it('يستخرج المعرّف من صف جزائي', () => {
        expect(resolveCriminalCaseId({ id: 'cr-9' })).toBe('cr-9');
        expect(resolveCriminalCaseId({ id: '' })).toBeNull();
        expect(resolveCriminalCaseId(null)).toBeNull();
    });

    it('يتحقق من الملكية ضمن قائمة المستخدم', () => {
        const cases = [{ id: 'cr-1' }, { id: 'cr-2' }];
        expect(isOwnedCriminalCaseId(cases, 'cr-1')).toBe(true);
        expect(isOwnedCriminalCaseId(cases, 'cr-9')).toBe(false);
        expect(isOwnedCriminalCaseId(cases, '  ')).toBe(false);
    });
});
