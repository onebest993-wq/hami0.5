import { describe, expect, it } from 'vitest';
import { canOpenProfileStudio } from '@/app/services/profile/profileShellPolicy';

describe('profileShellPolicy — صلاحية الاستوديو', () => {
    it('يسمح للمالك فقط', () => {
        expect(canOpenProfileStudio(true)).toBe(true);
        expect(canOpenProfileStudio(false)).toBe(false);
    });
});
