import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('execution E2E storage seed honesty', () => {
    it('E2E IndexedDB يفتح نفس إصدار SecureStoreService (2)', () => {
        const service = readFileSync(join(root, 'src/app/services/SecureStoreService.ts'), 'utf8');
        const e2e = readFileSync(join(root, 'e2e/helpers/secureStoreE2EFixtures.ts'), 'utf8');
        expect(service).toContain('WEB_DB_VERSION = 2');
        expect(e2e).toContain('HAMI_SECURE_STORE_VERSION = 2');
        expect(e2e).not.toMatch(/indexedDB\.open\(\s*dbName,\s*1\s*\)/);
    });

    it('زرع إضبارة E2E يكتب فهرس المالك وبلوب :u: في IndexedDB', () => {
        const src = readFileSync(join(root, 'e2e/helpers/executionStorageFixtures.ts'), 'utf8');
        expect(src).toContain('ownerIndexKey');
        expect(src).toContain('scopedBlobKey');
        expect(src).toContain('HAMI_SECURE_STORE_VERSION');
        expect(src).toContain("type: 'execution'");
    });

    it('مساعد فتح المخزن ينقر بلاطة التنفيذ أصلياً وينتظر aria-hidden=false', () => {
        const src = readFileSync(join(root, 'e2e/helpers/executionE2EBoot.ts'), 'utf8');
        expect(src).toContain('clickHubArchiveTileNative');
        expect(src).toContain('clickNativeElement');
        expect(src).toContain("toHaveAttribute('aria-hidden', 'false'");
        expect(src).toContain('execution-archive-card');
        expect(src).toContain('__HAMI_EXEC_DOSSIER_CRASH');
        expect(src).not.toMatch(/click\(\{\s*force:\s*true/);
    });

    it('إغلاق الإضبارة ينقر زر المغادرة أصلياً وينتظر اختفاء البوابة', () => {
        const src = readFileSync(join(root, 'e2e/helpers/executionE2EFixtures.ts'), 'utf8');
        expect(src).toContain('clickNativeElement');
        expect(src).toContain('execution-dashboard-portal-open');
        expect(src).toContain('execution-dashboard-close');
        expect(src).not.toMatch(/click\(\{\s*force:\s*true/);
    });
});
