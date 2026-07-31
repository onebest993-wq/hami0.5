import { describe, expect, it } from 'vitest';
import {
    assertVaultDocOwner,
    assertVaultRequester,
    assertVaultStoragePathOwner,
} from '@/app/services/vault/vaultOwnership';

describe('vaultOwnership', () => {
    it('يرفض الجلسة الفارغة', () => {
        expect(() => assertVaultRequester('')).toThrow(/تسجيل الدخول/);
        expect(() => assertVaultRequester(null)).toThrow(/تسجيل الدخول/);
    });

    it('يرفض تعديل ملف مستخدم آخر', () => {
        expect(() => assertVaultDocOwner({ authorId: 'u1' }, 'u2')).toThrow(/غير مصرح/);
        expect(() => assertVaultDocOwner({ authorId: 'u1' }, 'u1')).not.toThrow();
    });

    it('يرفض مسارات التخزين الأجنبية', () => {
        expect(() => assertVaultStoragePathOwner('u2/vault/a.pdf', 'u1')).toThrow(/غير مصرح/);
        expect(() => assertVaultStoragePathOwner('idb:vault:u2:doc1', 'u1')).toThrow(/غير مصرح/);
        expect(() => assertVaultStoragePathOwner('local:vault:u2:doc1', 'u1')).toThrow(/غير مصرح/);
        expect(() => assertVaultStoragePathOwner('u1/vault/a.pdf', 'u1')).not.toThrow();
        expect(() => assertVaultStoragePathOwner('idb:vault:u1:doc1', 'u1')).not.toThrow();
        // مسار محلي مختصر قديم بلا userId — لا يُرفض من فحص المسار
        expect(() => assertVaultStoragePathOwner('local:vault:e2e-test', 'u1')).not.toThrow();
    });
});
