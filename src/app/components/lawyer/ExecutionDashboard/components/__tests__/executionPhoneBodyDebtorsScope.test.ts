import { describe, expect, it } from 'vitest';
import { pickExecutionPhoneBodyDebtorsScope } from '../executionPhoneBodyDebtorsScope';

describe('pickExecutionPhoneBodyDebtorsScope', () => {
    it('ينسخ مفاتيح المدينين فقط', () => {
        const persist = () => true;
        const picked = pickExecutionPhoneBodyDebtorsScope({
            executionId: 'exec-1',
            noise: 'drop',
            persistExecutionMerge: persist,
        });
        expect(picked.executionId).toBe('exec-1');
        expect(picked.persistExecutionMerge).toBe(persist);
        expect(Object.prototype.hasOwnProperty.call(picked, 'noise')).toBe(false);
    });
});
