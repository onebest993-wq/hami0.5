import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
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

    it('المنتدى فقط من مشاركة الدليل الصريحة — لا في المخزن/الخدمة/المرآة', () => {
        const uiRoot = join(root, 'src/app/components/lawyer/TransactionsThreading');
        const forumImporters: string[] = [];
        const walk = (dir: string) => {
            for (const name of readdirSync(dir)) {
                const full = join(dir, name);
                if (statSync(full).isDirectory()) {
                    if (name === '__tests__') continue;
                    walk(full);
                    continue;
                }
                if (!/\.(ts|tsx)$/.test(name)) continue;
                const src = readFileSync(full, 'utf8');
                if (src.includes('ForumApiService') || src.includes("'/api/forum")) {
                    forumImporters.push(full.slice(root.length + 1).replace(/\\/g, '/'));
                }
            }
        };
        walk(uiRoot);
        expect(forumImporters).toEqual([
            'src/app/components/lawyer/TransactionsThreading/hooks/useShareProcedureModal.ts',
        ]);
        expect(read('src/app/modules/transactionsThreading/store.ts')).not.toContain('ForumApiService');
        expect(read('src/app/modules/transactionsThreading/service.ts')).not.toContain('ForumApiService');
        expect(read('src/app/services/transactions/transactionsThreadingMirror.ts')).not.toContain(
            'ForumApiService',
        );
        const share = read(
            'src/app/components/lawyer/TransactionsThreading/hooks/useShareProcedureModal.ts',
        );
        expect(share).toContain('ForumApiService.createPost');
        expect(share).toContain('يلزم تسجيل الدخول لنشر الدليل في المنتدى');
        expect(share).toContain('المسار الشبكي الوحيد داخل قسم المعاملات');
    });
});
