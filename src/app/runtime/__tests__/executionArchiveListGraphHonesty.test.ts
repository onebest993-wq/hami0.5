import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

const FORBIDDEN_LIST = [
    "from '@/app/utils/storageCache'",
    "from '@/app/services/SecureStoreService'",
    'executionFormUtils',
    'LawyerDashboardParts/utils',
    'executionModuleStrategies',
    'archiveFinancialSync',
    'executionClaimIsolation',
    'followupSpecializationVisibility',
    'ExecutionDashboard',
] as const;

describe('execution archive list graph — index path only', () => {
    it('بطاقة/فلتر/تسميات القائمة لا تستورد طبقة التخزين الثقيلة', () => {
        const files = [
            'src/app/components/lawyer/ArchivePortal/executionArchiveCardView.ts',
            'src/app/components/lawyer/ArchivePortal/executionArchiveListLabels.ts',
            'src/app/components/lawyer/ArchivePortal/executionArchiveFilterUtils.ts',
            'src/app/components/lawyer/ArchivePortal/executionArchiveStatusLabel.ts',
            'src/app/components/lawyer/ArchivePortal/components/ExecutionSmartCard.tsx',
            'src/app/components/lawyer/ArchivePortal/components/ExecutionSmartCardBody.tsx',
            'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveCardPin.tsx',
            'src/app/components/lawyer/ArchivePortal/components/ExecutionArchivePartyBlock.tsx',
            'src/app/components/lawyer/ArchivePortal/hooks/useArchivePortalController.ts',
            'src/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface.tsx',
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
            'src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx',
            'src/app/components/lawyer/ArchivePortal/executionArchivePreviewLayer.ts',
            'src/app/components/lawyer/ArchivePortal/components/ExecutionArchivePreviewPaintSlot.tsx',
            'src/app/components/lawyer/ArchivePortal/components/ArchivePortalExecutionPreviewModal.tsx',
        ];
        for (const rel of files) {
            const src = read(rel);
            for (const token of FORBIDDEN_LIST) {
                expect(src, `${rel} must not contain ${token}`).not.toContain(token);
            }
            expect(src, `${rel} must not import ArchivePortal/utils`).not.toMatch(
                /from ['"]\.\.\/utils['"]|from ['"]\.\/utils['"]/,
            );
        }
    });

    it('التثبيت والكروم والإثراء لا يسحبون براميل ثقيلة عند أول رسم', () => {
        const card = read(
            'src/app/components/lawyer/ArchivePortal/components/ExecutionSmartCard.tsx',
        );
        const chrome = read(
            'src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx',
        );
        const grid = read(
            'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid.tsx',
        );
        const enrich = read(
            'src/app/components/lawyer/ArchivePortal/executionArchiveEnrichment.ts',
        );
        expect(card).toContain("from '@/app/workspace/executionWorkspacePin'");
        expect(card).not.toContain('workspacePinBuilders');
        expect(chrome).not.toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(chrome).toContain("import('@/app/runtime/executionWorkspaceWarm')");
        expect(grid).not.toContain('جاري تحميل الإضابير');
        expect(grid).toContain('ExecutionArchiveCardPaintSlot');
        expect(enrich).not.toContain('بانتظار طعن');
        expect(enrich).not.toContain('متروكة للمراجعة');
        const entry = read(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
        );
        const controller = read(
            'src/app/components/lawyer/ArchivePortal/hooks/useArchivePortalController.ts',
        );
        expect(entry).not.toContain('LawyerDashboardParts/utils');
        expect(entry).toContain('isArchiveClickRecord');
        expect(controller).not.toContain('LAWSUIT_PORTAL_STUB');
        expect(controller).not.toContain('lawsuitJurisdiction');
        expect(controller).not.toContain('hasLawsuitLifecycle');
        expect(controller).not.toContain('ExecutionArchiveToolbar');
        expect(controller).not.toContain('hasExecutionLifecycle');
        expect(controller).not.toContain('executionTrashedCountForFilter');
        expect(controller).toContain("setDossierStatusFilter('all')");
        expect(chrome).not.toContain('hasExecutionLifecycle');
        expect(chrome).toContain('ExecutionArchivePortalState');
        expect(chrome).not.toContain('Record<string, unknown>');
        expect(grid).not.toContain('ExecutionArchiveToolbar');
        expect(grid).not.toContain('setExecutionViewMode');
    });

    it('المعاينة تفتح السجل من الفهرس أولاً وتؤجّل SecureStore', () => {
        const preview = read(
            'src/app/components/lawyer/ArchivePortal/components/ArchivePortalExecutionPreviewModal.tsx',
        );
        expect(preview).not.toContain("from '@/app/services/SecureStoreService'");
        expect(preview).not.toContain("from '../utils'");
        expect(preview).toContain("import('../executionArchivePreviewTimeline')");
        expect(preview).toContain('registerNativeBackHandler');
        expect(preview).toContain("addEventListener('keydown', onKeyDown, true)");
        expect(preview).toContain('role="dialog"');
        expect(preview).toContain('warmExecutionDossierFromArchiveCard');
        const timeline = read(
            'src/app/components/lawyer/ArchivePortal/executionArchivePreviewTimeline.ts',
        );
        expect(timeline).toContain("from '@/app/utils/executionStorageKeysLite'");
        expect(timeline).not.toContain("from '@/app/utils/executionStorageKeys'");
    });
});
