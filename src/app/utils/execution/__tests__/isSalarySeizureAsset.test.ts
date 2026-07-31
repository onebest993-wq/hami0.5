import { describe, expect, it } from 'vitest';
import { isSalarySeizureAsset } from '@/app/utils/execution/isSalarySeizureAsset';

describe('isSalarySeizureAsset', () => {
    it('detects salary ui kind and type labels', () => {
        expect(isSalarySeizureAsset({ details: { seizureUiKind: 'salary' } })).toBe(true);
        expect(isSalarySeizureAsset({ type: 'راتب' })).toBe(true);
        expect(isSalarySeizureAsset({ type: 'salary' })).toBe(true);
        expect(isSalarySeizureAsset({ type: 'منقول' })).toBe(false);
        expect(isSalarySeizureAsset(null)).toBe(false);
    });
});
