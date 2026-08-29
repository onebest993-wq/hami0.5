import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    isTransactionsLocalPlaintextKey,
    shouldEncryptValue,
} from '@/app/services/secureStorageKeys';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('transactions local plaintext + cloud-only network honesty', () => {
    it('المسار اليومي لا يشفّر مفاتيح المعاملات محلياً', () => {
        expect(isTransactionsLocalPlaintextKey('hami:transactions:v1')).toBe(true);
        expect(isTransactionsLocalPlaintextKey('hami:transactionsThreading:v1:u1')).toBe(true);
        expect(shouldEncryptValue('hami:transactions:v1', '[{"id":"t1"}]')).toBe(false);
        expect(shouldEncryptValue('hami:transactionsThreading:v1:u1', '{}')).toBe(false);
        expect(shouldEncryptValue('hami:transactions:taskTemplates:v1:u1', '[]')).toBe(false);
    });

    it('السحابة خلف isLawyerWorkCloudLive فقط — بلا CryptoService محلي', () => {
        const cloud = read('src/app/services/cloud/lawyerTransactionsCloud.ts');
        expect(cloud).toContain('isLawyerWorkCloudLive');
        expect(cloud).toContain('lawyerCloudKv');
        expect(cloud).not.toContain('CryptoService');
        expect(cloud).not.toContain('encryptData');
        expect(cloud).toMatch(/if\s*\(\s*!isLawyerWorkCloudLive\(\)\s*\)/);
        expect(cloud).toMatch(/if\s*\(\s*isLawyerWorkCloudLive\(\)\s*\)/);
    });

    it('WIFE على kv-proxy فقط عند مزامنة العمل — لا على مسار التخزين المحلي', () => {
        const kv = read('src/app/services/cloud/lawyerCloudKv.ts');
        expect(kv).toContain('isWorkLocalKvMaterial');
        expect(kv).toContain('isLawyerWorkCloudLive');
        expect(kv).toContain('/api/kv-proxy');
        const gate = read('src/app/services/settings/lawyerWorkCloudGate.ts');
        expect(gate).toContain('transactions:');
        expect(gate).toContain('transactionsThreading:');
        const mirror = read('src/app/services/transactions/transactionsThreadingMirror.ts');
        expect(mirror).not.toContain('lawyerCloudKv');
        expect(mirror).not.toContain('/api/');
        expect(mirror).not.toContain('CryptoService');
        const service = read('src/app/modules/transactionsThreading/service.ts');
        expect(service).not.toMatch(/\bfetch\s*\(/);
        expect(service).not.toContain('CryptoService');
    });

    it('التسخين يرحّل ciphertext القديم عند خروج المفتاح من سياسة التشفير', () => {
        const secure = read('src/app/services/SecureStoreService.ts');
        expect(secure).toContain('خرج من سياسة التشفير — رحّل ciphertext القديم إلى plaintext');
        const keys = read('src/app/services/secureStorageKeys.ts');
        expect(keys).toContain('isTransactionsLocalPlaintextKey');
        expect(keys).toContain('ciphertext قديم');
    });

   