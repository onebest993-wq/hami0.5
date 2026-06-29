import { describe, expect, it } from 'vitest';
import { canOpenProfileStudio } from '@/app/services/profile/profileStudioAccessLogic';

describe('profileStudioAccessLogic', () => {
    it('يسمح للمالك فقط', () => {
        expect(canOpenProfileStudio(true)).toBe(true);
        expect(canOpenProfileStudio(false)).toBe(false);
    });
});
