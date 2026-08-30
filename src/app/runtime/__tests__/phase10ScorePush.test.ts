import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractViteFunction, readViteConfigSource } from './viteConfigSource';

const root = process.cwd();

describe('phase-10 score push — storage stem + preload denylist', () => {
    it('lawsuitFilesRepository يحمّل dossierPersistenceService بشكل dynamic فقط', () => {
        const src = readFileSync(join(root, 'src/app/domain/lawsuit/lawsuitFilesRepository.ts'), 'utf8');
        expect(src).toMatch(/await\s+import\s*\(/);
        expect(src).toContain('@/app/services/dossierPersistence/dossierPersistenceService');
        expect(src).not.toMatch(
            /import\s*\{[^}]*loadDossierCollectionAsync[^}]*\}\s*from\s*'@\/app\/services\/dossierPersistence\/dossierPersistenceService'/,
        );
    });

    it('lawsuitFilesStorage يستخدم dossierCollectionSyncLite فقط', () => {
        const src = readFileSync(join(root, 'src/app/utils/lawsuitFilesStorage.ts'), 'utf8');
        expect(src).toContain("from '@/app/services/dossierPersistence/dossierCollectionSyncLite'");
        expect(src).not.toContain("from '@/app/services/dossierPersistence/dossierPersistenceService'");
    });

    /*
     * حُذف الفحص الذي كان يقرأ `LawyerDashboardAdvancedBackgroundRuntime.tsx`:
     * الملفّ لم يستورده أحد، فكان الفحص يصف مكوّناً لا يُشحن. الضمانة المقابلة
     * الحيّة هي أن الوحدة الخفيفة تبقى منفصلة عن المخزن الثقيل، وهذا ما يلي.
     */
    it('executionFilesStorageOwnerLite يبقى وحدة خفيفة منفصلة عن المخزن الثقيل', () => {
        const lite = readFileSync(join(root, 'src/app/utils/executionFilesStorageOwnerLite.ts'), 'utf8');
        expect(lite).not.toContain("from '@/app/utils/executionFilesStorage'");
    });

    /*
     * كان يشترط وجود `import('…vaultDocsWarmCache')` الديناميّ في `lazyComponents`، أي
     * يحمي **صيغة** الاستيراد داخل `warmVaultWorkspace`. ثم ثبت أن تلك الدالّة وأختها
     * `warmSettingsAndVault` ميتتان: لا تستوردهما جهة ولا تنادي عضوهما، فحُذفتا مع ٣٨
     * تصديراً ميتاً آخر. والغاية الأصلية — ألّا يُشحن كاش وثائق المخزن مع المحور —
     * صارت مُحقَّقة أقوى: لا استيراد بأي صيغة.
     */
    it('lazyComponents لا يشحن كاش وثائق المخزن بأي صيغة', () => {
        const src = readFileSync(join(root, 'src/app/utils/lazyComponents.tsx'), 'utf8');
        expect(src).not.toMatch(/import[^\n]*['"][^'"\n]*vaultDocsWarmCache/);
        expect(src).not.toMatch(/import\(\s*['"][^'"\n]*vaultDocsWarmCache/);
    });

    it('GlobalErrorBoundary لا يستورد lazyComponents', () => {
        const src = readFileSync(
            join(root, 'src/app/components/shared/GlobalErrorBoundary.tsx'),
            'utf8',
        );
        expect(src).toContain("from '@/app/runtime/archivePortalPrefetch'");
        expect(src).not.toContain("from '@/app/utils/lazyComponents'");
    });

    it('deferredShellPrefetch لا يستورد lazyComponents بشكل sync', () => {
        const src = readFileSync(join(root, 'src/app/runtime/deferredShellPrefetch.ts'), 'utf8');
        expect(src).toContain("import('@/app/utils/lazyComponents')");
        expect(src).not.toMatch(
            /import\s*\{[^}]*prefetchLawyerHomeShellWidgets[^}]*\}\s*from\s*'@\/app\/utils\/lazyComponents'/,
        );
    });

    it('vite يعزل debug خارج boot-runtime', () => {
        const src = readViteConfigSource();
        const boot = extractViteFunction(src, 'resolveBootRuntimeChunk');
        expect(boot).not.toContain('/src/app/utils/debug');
    });

    it('modulePreload html allowlist ضيّق على React وboot-runtime', () => {
        const src = readViteConfigSource();
        expect(src).toContain('vendor-react|boot-runtime');
        expect(src).toContain('LawyerDashboard');
        expect(src).toContain('vendor-lucide');
    });
});
