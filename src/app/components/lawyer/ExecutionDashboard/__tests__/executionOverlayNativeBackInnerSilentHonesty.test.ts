import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('execution overlay native-back and inner-silent honesty', () => {
    it('خط الرجوع يثبت onClose بالمرجع ولا يعيد التسجيل كل رسم', () => {
        const hook = read(
            'src/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss.ts',
        );
        expect(hook).toContain('onCloseRef');
        expect(hook).toContain('registerNativeBackHandler');
        expect(hook).toContain('dispatchNativeBack');
        expect(hook).toMatch(/\}, \[active\]\);/);
        expect(hook).not.toMatch(/\}, \[active, onClose\]\);/);
    });

    it('النوافذ خارج البرميل تسجّل رجوع النظام وهدف لمس 44px', () => {
        const dossier = read(
            'src/app/components/lawyer/ExecutionDashboard/components/DossierActionsModal.tsx',
        );
        const seizure = read(
            'src/app/components/lawyer/ExecutionDashboard/components/SeizureRequestSubjectModal.tsx',
        );
        const visitation = read(
            'src/app/components/lawyer/ExecutionDashboard/components/visitationSchedule/VisitationWorkspaceSheet.tsx',
        );
        const marital = read(
            'src/app/components/lawyer/ExecutionDashboard/components/maritalFurniture/MaritalFurnitureWorkspaceSheet.tsx',
        );
        const pause = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionPauseResumeOverlay.tsx',
        );
        const step = read(
            'src/app/components/lawyer/ExecutionDashboard/components/seizedPropertyPortals/SeizedPropertyStepPortal.tsx',
        );
        const auction = read(
            'src/app/components/lawyer/ExecutionDashboard/components/seizedPropertyPortals/SeizedPropertyAuctionResultPortal.tsx',
        );
        const mark = read(
            'src/app/components/lawyer/ExecutionDashboard/components/seizedPropertyPortals/SeizureMarkPortal.tsx',
        );
        const publication = read(
            'src/app/components/lawyer/ExecutionDashboard/components/seizedPropertyPortals/PublicationPortal.tsx',
        );

        for (const src of [dossier, seizure, visitation, marital]) {
            expect(src).toContain('useExecutionOverlayDismiss');
        }
        const summons = read(
            'src/app/components/lawyer/ExecutionDashboard/components/DebtorSummonsMarkerPortal.tsx',
        );
        const memo = read(
            'src/app/components/lawyer/ExecutionDashboard/components/DebtorMemoBadgePortal.tsx',
        );
        expect(summons).toContain('useExecutionOverlayDismiss');
        expect(summons).toContain('EXEC_MODAL_CLOSE_BTN_CLASS');
        expect(summons).not.toContain('aria-label="تسجيل راتب"');
        expect(memo).toContain('useExecutionOverlayDismiss');
        expect(memo).toContain('EXEC_MODAL_CLOSE_BTN_CLASS');
        for (const src of [dossier, seizure, pause, step, auction, mark, publication]) {
            expect(src).toContain('EXEC_MODAL_CLOSE_BTN_CLASS');
        }
        expect(visitation).toContain('min-h-[44px]');
        expect(marital).toContain('min-h-[44px]');
    });

    it('الانتظار الداخلي داخل النوافذ الحية صامت بلا ?? على FALLBACK العام', () => {
        const files = [
            'src/app/components/lawyer/ExecutionDashboard/components/TimelineSection.tsx',
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionFullTimelineModalContainer.tsx',
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutorWorkflowPortalModals.tsx',
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionModalsContainer.tsx',
            'src/app/components/lawyer/ExecutionDashboard/components/UnifiedSummonsModalContainer.tsx',
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionSeizedAssetsModalContainer.tsx',
            'src/app/components/lawyer/ExecutionDashboard/components/OtherPartyTab.tsx',
        ];
        for (const rel of files) {
            const src = read(rel);
            expect(src, rel).toContain('EXEC_OVERLAY_INNER_SILENT_FALLBACK');
            expect(src, rel).not.toContain(
                'EXEC_OVERLAY_LAZY_FALLBACK ?? EXEC_OVERLAY_INNER_SILENT_FALLBACK',
            );
        }
    });

    it('hover وإجراءات الإضبارة وموضوع الحجز يشتركان في نفس preloadable instance', () => {
        const prefetch = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch.ts',
        );
        const primary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyPrimarySectionsReady.tsx',
        );
        const tertiary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyTertiarySeizureSubjectModals.tsx',
        );
        const mount = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardPhoneBodyMountStages.ts',
        );
        const shell = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryShell.ts',
        );

        expect(prefetch).toContain('LazyDossierActionsModal.preload');
        expect(primary).toContain('PreloadableOverlayGate');
        expect(primary).toContain('executionDashboardDossierActionsModalLazy');
        expect(primary).not.toContain('lazy(() =>');
        expect(tertiary).toContain('PreloadableOverlayGate');
        expect(tertiary).toContain('LazySeizureRequestSubjectModal');
        expect(tertiary).not.toContain('lazy(importSeizureRequestSubjectModal)');
        expect(mount).toContain('LazySeizureRequestSubjectModal.preload');
        expect(shell).toContain('LazySeizureRequestSubjectModal.preload');
        expect(shell).not.toMatch(
            /from\s+['"]\.\/executionDashboardSeizureRequestSubjectModalLazy['"]/,
        );
    });

    it('صف المدين المحجوز يحجز شريحة 44px بدل فراغ عند شارات الكسولة', () => {
        const row = read(
            'src/app/components/lawyer/ExecutionDashboard/components/DebtorCardRowCollapsed.tsx',
        );
        expect(row).toContain('debtor-badges-paint-slot');
        expect(row).toContain('min-h-[44px]');
        expect(row).toContain('PreloadableOverlayGate');
        expect(row).toContain('debtorCardRowBadgesClusterLazy');
        expect(row).not.toContain('fallback={null}');
        expect(row).not.toContain('React.lazy');
    });

    it('أول إطار لبرميل النوافذ يغلق بوابات العقار المحجوز بدل onClose فارغ', () => {
        const paint = read(
            'src/app/components/lawyer/ExecutionDashboard/components/resolveExecutionShellOverlayInstantPaint.ts',
        );
        expect(paint).toContain('seizedPropertyStepModalOpen');
        expect(paint).toContain('seizedPropertyAuctionResultModalOpen');
        expect(paint).toContain('seizureMarkModalOpen');
        expect(paint).toContain('publicationModalOpen');
        expect(paint).toContain('setSeizedPropertyStepModalOpen');
    });
});
