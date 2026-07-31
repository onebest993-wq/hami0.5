import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

    it('AdvancedBackgroundRuntime يستخدم owner lite + bind ثقيل dynamic', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardAdvancedBackgroundRuntime.tsx'),
            'utf8',
        );
        expect(src).toContain("from '@/app/utils/executionFilesStorageOwnerLite'");
        expect(src).toContain("import('@/app/utils/executionFilesStorage')");
        expect(src).not.toMatch(
            /import\s*\{[^}]*bindExecutionFilesStorageOwner[^}]*\}\s*from\s*'@\/app\/utils\/executionFilesStorage'/,
        );
    });

    it('lazyComponents لا يستورد vaultDocsWarmCache بشكل sync', () => {
        const src = readFileSync(join(root, 'src/app/utils/lazyComponents.tsx'), 'utf8');
        expect(src).not.toMatch(
            /import\s*\{[^}]*prefetchSmartVaultDocs[^}]*\}\s*from\s*'@\/app\/services\/vault\/vaultDocsWarmCache'/,
        );
        expect(src).toContain("import('@/app/services/vault/vaultDocsWarmCache')");
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

    it('vite يعزل debug خارج secure-api-client', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toMatch(/\/src\/app\/utils\/debug/);
        expect(src).toMatch(/return 'app-debug'/);
    });

    it('modulePreload denylist يغطي PascalCase LawyerDashboard', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toMatch(/LawyerDashboard/);
        expect(src).toMatch(/boot-ui-primitives/);
        expect(src).toMatch(/vendor-lucide/);
    });
});
