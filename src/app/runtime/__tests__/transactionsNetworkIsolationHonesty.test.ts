/**
 * قسم المعاملات: العزل شبكي لا تشفيري.
 *
 * المسار اليومي بلا إنترنت وبلا WIFE — الشبكة فقط خلف `isLawyerWorkCloudLive`.
 * التشفير عند الراحة يبقى: قطع الشبكة لا يحمي من نسخ IndexedDB، وأسماء الموكّلين
 * نفسها تُنسخ إلى التقويم المشفَّر فلا معنى لإسقاطها هنا.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
    isEncryptOrFailStorageKey,
    isSensitiveStorageKey,
    isTransactionsStorageKey,
    shouldEncryptValue,
} from '@/app/services/secureStorageKeys';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('transactions network isolation (encryption kept)', () => {
    it('مفاتيح القسم حسّاسة وتُشفَّر — لا استثناء plaintext', () => {
        for (const key of [
            'hami:transactions:v1',
            'hami:transactionsThreading:v1:u1',
            'hami:transactions:taskTemplates:v1:u1',
        ] as const) {
            expect(isTransactionsStorageKey(key)).toBe(true);
            expect(isSensitiveStorageKey(key)).toBe(true);
            expect(isEncryptOrFailStorageKey(key)).toBe(true);
            expect(shouldEncryptValue(key, '[{"id":"t1"}]')).toBe(true);
        }
    });

    it('السحابة خلف isLawyerWorkCloudLive فقط — والتشفير ليس مسار شبكة', () => {
        const cloud = read('src/app/services/cloud/lawyerTransactionsCloud.ts');
        expect(cloud).toContain('isLawyerWorkCloudLive');
        expect(cloud).toContain('lawyerCloudKv');
        expect(cloud).toMatch(/if\s*\(\s*!isLawyerWorkCloudLive\(\)\s*\)/);
        expect(cloud).toMatch(/if\s*\(\s*isLawyerWorkCloudLive\(\)\s*\)/);
        /* التشفير يجري داخل SecureStoreService لا في طبقة السحابة */
        expect(cloud).not.toContain('CryptoService');
        expect(cloud).not.toContain('encryptData');
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
        const service = read('src/app/modules/transactionsThreading/service.ts');
        expect(service).not.toMatch(/\bfetch\s*\(/);
    });

    it('حارس المسح يحمي سجل المعاملات وحالة الخيوط والقوالب', () => {
        const guard = read('src/app/services/dossierPersistence/protectedStorageKeys.ts');
        expect(guard).toContain("'hami:transactions:v1'");
        expect(guard).toContain('isTransactionsThreadingStateKey');
        expect(guard).toContain('isTransactionsTaskTemplatesKey');
        expect(guard).toContain("return 'transactions'");
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
    });
});
