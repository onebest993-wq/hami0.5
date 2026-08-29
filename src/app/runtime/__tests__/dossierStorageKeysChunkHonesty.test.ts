import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('dossier-storage-keys chunk honesty', () => {
    it('يفصل مفاتيح التخزين عن boot-runtime قبل امتصاص SecureStore', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("return 'dossier-storage-keys'");
        expect(vite).toMatch(
            /dossierStorageKeys[\s\S]*?return 'dossier-storage-keys'[\s\S]*?SecureStoreService/,
        );
        expect(vite).toContain('/src/app/utils/lawsuitFilesStorage');
        expect(vite).toContain('/src/app/services/dossierPersistence/dossierCollectionSyncLite');
    });

    it('يفصل storageDomains عن boot-runtime قبل امتصاص workspace-store', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("return 'storage-domain-keys'");
        expect(vite).toMatch(
            /storageDomains[\s\S]*?return 'storage-domain-keys'[\s\S]*?dossierStorageKeys/,
        );
        expect(vite).toContain('/src/app/infrastructure/persistence/storageDomains');
    });

    it('يفصل persist foundation عن lawyer-boot-stores قبل workspace-store', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("return 'hami-persist-foundation'");
        expect(vite).toContain('/src/app/services/securePersistStorage');
        expect(vite).toContain('/src/app/infrastructure/persistence/zustandPersistFoundation');
        const persistIdx = vite.indexOf("return 'hami-persist-foundation'");
        const workspaceIdx = vite.indexOf('resolveLawyerWorkspaceStoreChunk(id)');
        const bootStoresIdx = vite.indexOf('resolveLawyerBootSharedChunk(id)');
        expect(persistIdx).toBeGreaterThan(0);
        expect(workspaceIdx).toBeGreaterThan(persistIdx);
        expect(bootStoresIdx).toBeGreaterThan(workspaceIdx);
    });

    it('يفصل clientEnv عن boot-runtime قبل دورة command-hub', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("return 'supabase-client-env'");
        expect(vite).toContain("return 'supabase-browser-client'");
        expect(vite).toContain('/src/utils/supabase/clientEnv');
        expect(vite).toMatch(/supabaseClient\\\.\(js\|ts\)/);
        const envIdx = vite.indexOf("return 'supabase-client-env'");
        const browserIdx = vite.indexOf("return 'supabase-browser-client'");
        expect(envIdx).toBeGreaterThan(0);
        expect(browserIdx).toBeGreaterThan(envIdx);
    });

    it('كسر دورة boot↔paint من المصدر: أوراق flush/announce + سطح الإقلاع', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("return 'boot-paint-leaves'");
        expect(vite).toContain("return 'boot-surface-paint-cache'");
        expect(vite).toContain('/src/app/bootstrap/bootTypographyFlush');
        expect(vite).toContain('/src/app/bootstrap/homeMainGridPaintAnnounce');
        const announce = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/homeMainGridPaintAnnounce.ts'),
            'utf8',
        );
        expect(announce).not.toContain("from '@/app/bootstrap/homeBootChrome'");
        expect(vite).toContain('/src/app/bootstrap/homeBootChromeState');
        const shell = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/bootStaticShell.ts'),
            'utf8',
        );
        expect(shell).toContain("from '@/app/bootstrap/bootTypographyFlush'");
        expect(shell).not.toContain("from '@/app/services/settings/apply'");
        const grid = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/HomeMainGrid.tsx'),
            'utf8',
        );
        expect(grid).toContain("from '@/app/bootstrap/homeMainGridPaintAnnounce'");
        expect(grid).not.toContain("from '@/app/bootstrap/homeMainGridPaintGate'");
    });

    it('هيكل المنزل لا يستورد مقاييس البلاطة من مجلد commandHub', () => {
        const skeleton = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/HomeWidgetSlotSkeleton.tsx'),
            'utf8',
        );
        expect(skeleton).toContain("from './hubHalfTileMetrics'");
        expect(skeleton).not.toContain("from './commandHub/hubHalfTileMetrics'");
        expect(
            fs.existsSync(path.join(root, 'src/app/components/lawyer/dashboard/hubHalfTileMetrics.ts')),
        ).toBe(true);
    });
});
