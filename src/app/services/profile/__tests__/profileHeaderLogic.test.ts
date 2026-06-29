import { describe, expect, it } from 'vitest';
import {
    resolveProfileHeaderInitial,
    shouldApplyProfileHeaderUpdate,
} from '@/app/services/profile/profileHeaderLogic';

describe('profileHeaderLogic', () => {
    it('resolveProfileHeaderInitial يأخذ أول حرف من الاسم', () => {
        expect(resolveProfileHeaderInitial('أحمد')).toBe('أ');
        expect(resolveProfileHeaderInitial('  سارة  ')).toBe('س');
    });

    it('resolveProfileHeaderInitial يستخدم fallback عند الفراغ', () => {
        expect(resolveProfileHeaderInitial('')).toBe('م');
        expect(resolveProfileHeaderInitial('   ', 'ح')).toBe('ح');
    });

    it('shouldApplyProfileHeaderUpdate يطابق userId أو يقبل الحدث العام', () => {
        expect(shouldApplyProfileHeaderUpdate('u1', 'u1')).toBe(true);
        expect(shouldApplyProfileHeaderUpdate(undefined, 'u1')).toBe(true);
        expect(shouldApplyProfileHeaderUpdate('u2', 'u1')).toBe(false);
    });
});
