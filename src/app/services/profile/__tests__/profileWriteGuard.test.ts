import { describe, expect, it } from 'vitest';
import {
    assertCanWriteProfile,
    ProfileWriteForbiddenError,
} from '@/app/services/profile/profileWriteGuard';

describe('assertCanWriteProfile', () => {
    it('يسمح للمالك بكتابة ملفه', () => {
        expect(() => assertCanWriteProfile('user-1', 'user-1')).not.toThrow();
    });

    it('يرفض الكتابة على ملف غير مملوك', () => {
        expect(() => assertCanWriteProfile('user-1', 'user-2')).toThrow(ProfileWriteForbiddenError);
    });

    it('يرفض معرّفات فارغة', () => {
        expect(() => assertCanWriteProfile('', 'user-1')).toThrow(ProfileWriteForbiddenError);
        expect(() => assertCanWriteProfile('user-1', '')).toThrow(ProfileWriteForbiddenError);
        expect(() => assertCanWriteProfile(null, 'user-1')).toThrow(ProfileWriteForbiddenError);
    });
});
