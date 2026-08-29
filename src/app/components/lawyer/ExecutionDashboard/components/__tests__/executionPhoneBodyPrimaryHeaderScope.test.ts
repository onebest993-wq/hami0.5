import { describe, expect, it } from 'vitest';
import { pickExecutionPhoneBodyPrimaryHeaderScope } from '../executionPhoneBodyPrimaryHeaderScope';

describe('pickExecutionPhoneBodyPrimaryHeaderScope', () => {
    it('ينسخ مفاتيح الرأس فقط ويملأ inabaTargets الفارغ', () => {
        const picked = pickExecutionPhoneBodyPrimaryHeaderScope({
            statuteStatus: 'active',
            noise: 'drop',
            persistExecutionMerge: () => true,
        });
        expect(picked.statuteStatus).toBe('active');
        expect(picked.inabaTargets).toEqual([]);
        expect(Object.prototype.hasOwnProperty.call(picked, 'noise')).toBe(false);
        expect(typeof picked.persistExecutionMerge).toBe('function');
    });
});
