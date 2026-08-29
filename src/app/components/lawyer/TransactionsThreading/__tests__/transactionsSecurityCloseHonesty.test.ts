import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(...parts: string[]): string {
    return readFileSync(join(root, ...parts), 'utf8');
}

describe('transactions security close honesty', () => {
    it('persist بقائمة حقول دون نشر الكائن الخام', () => {
        const persist = src('src/app/services/transactions/sanitizeTransactionsThreadingPersist.ts');
        expect(persist).not.toMatch(/\.\.\.\s*tx\b/);
        expect(persist).not.toMatch(/\.\.\.\s*task\b/);
        expect(persist).not.toMatch(/\.\.\.\s*doc\b/);
        expect(persist).toContain('agreedFees: 0');
        expect(persist).toContain('financeRecords: []');
        expect(persist).toContain('sanitizeTransactionDocumentOwnerTag');
    });

    it('القوالب ترفض userId الفارغ ولا تستخدم any', () => {
        const templates = src('src/app/modules/transactionsThreading/taskTemplates.ts');
        expect(templates).not.toContain('as any');
        expect(templates).toMatch(/if\s*\(!isScopedUserId\(userId\)\)\s*return/);
        expect(templates).toContain('sanitizeTransactionTaskTitle');
    });

    it('دليل المنتدى والمشاركة والسحابة دون تسريب بريد', () => {
        const guide = src('src/app/services/transactions/procedureGuideNavigation.ts');
        expect(guide).toContain('sanitizeTransactionTaskTitle');
        expect(guide).toContain('MAX_GUIDE_STEPS');
        const share = src(
            'src/app/components/lawyer/TransactionsThreading/hooks/useShareProcedureModal.ts',
        );
        expect(share).not.toContain('user?.email');
        expect(share).toContain('TX_SHARE_BODY_MAX');
        expect(share).toContain('sanitizeTransactionForumAuthorName');
        const cloud = src('src/app/services/cloud/lawyerTransactionsCloud.ts');
        expect(cloud).toContain('mergeLocalTransactionsPreservingOtherUsers');
        const service = src('src/app/modules/transactionsThreading/service.ts');
        expect(service).toContain('sanitizeTransactionDocumentOwnerTag');
        expect(service).not.toMatch(/return\s*\{\s*\.\.\.\s*input/);
        const paint = src('src/app/runtime/transactionsInstantPaint.ts');
        expect(paint).toContain('innerHTML');
        expect(paint).toContain('إدارة المعاملات');
        expect(existsSync(join(root, '_tx_sec_apply.js'))).toBe(false);
    });

    it('الزوجة: شبكة KV فقط خلف مزامنة العمل؛ محلياً plaintext بلا تشفير', () => {
        const cloud = src('src/app/services/cloud/lawyerTransactionsCloud.ts');
        expect(cloud).toContain('lawyerCloudKv');
        expect(cloud).toContain('isLawyerWorkCloudLive');
        expect(cloud).toContain('persistSecurePayloadWhenReady');
        expect(cloud).toContain('readSecurePayloadWhenReady');
        expect(cloud).not.toContain('CryptoService');
        const kv = src('src/app/services/cloud/lawyerCloudKv.ts');
        expect(kv).toContain('SecureAPIClient');
        expect(kv).toContain('/api/kv-proxy');
        expect(kv).toContain('isWorkLocalKvMaterial');
        expect(kv).toContain('isLawyerWorkCloudLive');
        const proxy = src('src/app/api/kv-proxy/route.ts');
        expect(proxy).toContain('requireWifeCloudWrite');
        const ownership = src('src/app/security/kvProxyKeyOwnership.ts');
        expect(ownership).toContain('transactions:');
        expect(ownership).toContain('transactionsThreading:');
        const mirror = src('src/app/services/transactions/transactionsThreadingMirror.ts');
        expect(mirror).toContain('writeSecureAndClearLegacySync');
        expect(mirror).toContain('readSecureOrDrainLegacySync');
        expect(src('src/app/modules/transactionsThreading/taskTemplates.ts')).toContain(
            'readSecureOrDrainLegacySync',
        );
        const keys = src('src/app/services/secureStorageKeys.ts');
        expect(keys).toContain('isTransactionsLocalPlaintextKey');
        expect(keys).toContain("key.startsWith('hami:transactions:')");
        expect(keys).toContain("key.startsWith('hami:transactionsThreading:v1:')");
        expect(src('src/app/services/forumApiService.ts')).toContain('SecureAPIClient');
        expect(src('src/app/services/forum/forumAuthorResolver.ts')).toContain('لا نثق');
        expect(src('src/app/modules/transactionsThreading/service.ts')).not.toMatch(/\bfetch\s*\(/);
        expect(src('src/app/services/transactions/procedureGuideNavigation.ts')).not.toMatch(
            /\bfetch\s*\(/,
        );
    });
});
