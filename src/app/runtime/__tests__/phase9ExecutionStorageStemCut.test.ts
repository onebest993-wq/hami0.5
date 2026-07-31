import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-9 execution-storage stem cut', () => {
    it('SecureStore يستخدم blobKeyLite فقط', () => {
        const src = readFileSync(join(root, 'src/app/services/SecureStoreService.ts'), 'utf8');
        expect(src).toContain("from '@/app/utils/executionDossierBlobKeyLite'");
        expect(src).not.toContain("from '@/app/utils/executionDossierBlobPersistence'");
    });

    it('QuantumTasksProvider لا يستورد dossierBackupStore أو useIncrementalCalendarSync بشكل sync', () => {
        const src = readFileSync(join(root, 'src/app/context/QuantumTasksProvider.tsx'), 'utf8');
        expect(src).toContain("from '@/app/utils/quantumTasksEvents'");
        expect(src).not.toMatch(/import \{[^}]*readLatestDossierBackup/);
        expect(src).not.toContain("from '@/app/hooks/useIncrementalCalendarSync'");
        expect(src).toContain("import(");
        expect(src).toContain('@/app/services/dossierPersistence/dossierBackupStore');
    });

    it('calendarAuthenticity يستورد bridgePersistence/lite و bridge/core فقط', () => {
        const src = readFileSync(join(root, 'src/app/services/calendarAuthenticity.ts'), 'utf8');
        expect(src).toContain("from '@/app/services/calendar/bridgePersistence/lite'");
        expect(src).toContain("from '@/app/services/calendar/bridge/core'");
        expect(src).not.toContain("from '@/app/services/calendarBridgePersistence'");
        expect(src).not.toContain("from '@/app/services/calendarBridge'");
    });

    it('caseShareCatalogBuilder يستخدم executionStorageKeysLite', () => {
        const src = readFileSync(
            join(root, 'src/app/services/caseShare/caseShareCatalogBuilder.ts'),
            'utf8',
        );
        expect(src).toContain("from '@/app/utils/executionStorageKeysLite'");
        expect(src).not.toContain("from '@/app/utils/executionStorageKeys'");
    });

    it('lawyer-cloud و cloudSyncEngine لا يسحبان storage sync', () => {
        const cloud = readFileSync(join(root, 'src/app/services/lawyer-cloud.ts'), 'utf8');
        const sync = readFileSync(join(root, 'src/app/services/cloudSyncEngine.ts'), 'utf8');
        expect(cloud).toContain("from '@/app/services/vault/vaultBlobPathLite'");
        expect(cloud).not.toContain("from '@/app/services/vaultBlobStore'");
        expect(sync).not.toMatch(/import \{[^}]*reconcileExecutionDossierStorageAsync/);
        expect(sync).toContain('executionDossierStorageReconcile');
    });
});
