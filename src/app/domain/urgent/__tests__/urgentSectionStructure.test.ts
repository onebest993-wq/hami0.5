import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const lawyerRoot = path.join(process.cwd(), 'src/app/components/lawyer');
const domainRoot = path.join(process.cwd(), 'src/app/domain/urgent');

function read(rel: string): string {
    return fs.readFileSync(path.join(lawyerRoot, rel), 'utf8');
}

function listProductionFiles(root: string): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
                walk(full);
            } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
                out.push(full);
            }
        }
    };
    walk(root);
    return out;
}

describe('urgent lawsuits section structural closure', () => {
    it('workspace shell exposes urgent tab with 44px touch target', () => {
        const shell = read('dashboard/LawsuitsWorkspaceShell.tsx');
        expect(shell).toContain('tabUrgent');
        expect(shell).toContain('min-h-[44px]');
        expect(shell).toContain('onUrgentTabIntent');
    });

    it('urgent party remove controls meet 44px floor', () => {
        const party1 = read('Form_Urgent_Actions/UrgentActionsParty1Section.tsx');
        const party2 = read('Form_Urgent_Actions/UrgentActionsParty2Section.tsx');
        expect(party1).toContain('min-h-[44px] min-w-[44px] h-11 w-11');
        expect(party2).toContain('min-h-[44px] min-w-[44px] h-11 w-11');
        expect(party1).not.toContain('w-8 h-8 rounded-full border border-red-500/40');
        expect(party2).not.toContain('w-8 h-8 rounded-full border border-red-500/40');
    });

    it('workspace host lazy-loads urgent dashboard with prefetch', () => {
        const host = read('dashboard/LawsuitsWorkspaceHost.tsx');
        expect(host).toContain('LawsuitsWorkspaceUrgentTab');
        expect(host).toContain('prefetchUrgentOrdersViewModule');
        expect(host).toContain('prefetchUrgentDashboard');
        expect(host).toContain('preloadActiveOrderFilePanel');
        expect(host).toContain('Form_Urgent_Actions');
        expect(host).toContain('requestIdleCallback');
        const storage = read('View_Urgent_And_Orders_Dashboard/hooks/useUrgentCasesStorage.ts');
        expect(storage).toContain('peekState');
        expect(storage).not.toContain('invalidateCache');
        const sections = read('View_Urgent_And_Orders_Dashboard/UrgentDashboardSections.tsx');
        expect(sections).toContain('storageReady');
        expect(sections).toContain('urgent-dashboard-hydrating');
        const shell = read('dashboard/LawsuitsWorkspaceShell.tsx');
        expect(shell).toContain('onPointerDown');
    });

    it('urgent dashboard uses lifecycle hook and overlay composer', () => {
        const dash = read('View_Urgent_And_Orders_Dashboard.tsx');
        expect(dash).toContain('useUrgentLifecycleModals');
        expect(dash).toContain('UrgentDashboardOverlays');
        expect(dash).toContain('UrgentDashboardSections');
        expect(dash).not.toContain('useUrgentQuickLog');
        expect(dash).not.toContain('@ts-nocheck');
        expect(dash.split('\n').length).toBeLessThan(200);
    });

    it('standalone urgent page hero stays dense with ≥44px back target', () => {
        const dash = read('View_Urgent_And_Orders_Dashboard.tsx');
        expect(dash).toContain("px-3 py-2 pb-20");
        expect(dash).toContain('text-lg font-bold text-white');
        expect(dash).toContain('min-h-[44px] min-w-[44px]');
        expect(dash).not.toContain("p-6 pb-24");
        expect(dash).not.toContain('text-2xl font-bold text-white mb-0.5');
        expect(dash).not.toContain('bg-gradient-to-r from-rose');
        const sections = read('View_Urgent_And_Orders_Dashboard/UrgentDashboardSections.tsx');
        expect(sections).toContain('text-center py-6');
        expect(sections).not.toContain('text-center py-10');
        expect(sections).not.toContain('text-center py-20');
        const shell = read('dashboard/LawsuitsWorkspaceShell.tsx');
        expect(shell).toContain('URGENT_WORKSPACE_TAB_ACTIVE');
        expect(shell).not.toContain('bg-gradient-to-r from-rose-600');
        expect(read('Form_Urgent_Actions/constants.ts')).not.toContain('⚖️');
        expect(read('dashboard/LawsuitsWorkspaceShell.tsx')).toContain('urgent-active-order-dossier');
        const dossierUi = read('Dashboard_Active_Order_File/layout/urgentDossierUi.ts');
        expect(dossierUi).not.toContain('backdrop-blur');
        expect(dossierUi).not.toContain('shadow-lg');
        expect(read('Form_Urgent_Actions/ProcedureCategoryActionPicker.tsx')).not.toContain('backdrop-blur');
        expect(read('Form_Urgent_Actions/ProcedureCategoryActionPicker.tsx')).not.toContain('shadow-[');
        const emojiOffenders = [
            'Dashboard_Active_Order_File/panels/judge/JudgeFastForwardBanner.tsx',
            'Dashboard_Active_Order_File/panels/cassation/CassationPhaseBody.tsx',
            'Form_Urgent_Actions/constants.ts',
            'View_Urgent_And_Orders_Dashboard/UrgentDashboardSections.tsx',
        ].filter((rel) => /[⚠️✅⏳✔️📌💡⏩⚖️]/.test(read(rel)));
        expect(emojiOffenders).toEqual([]);
    });

    it('deferred dossier loader has no @ts-nocheck', () => {
        const deferred = read('DeferredActiveOrderFile.tsx');
        expect(deferred).not.toContain('@ts-nocheck');
        expect(deferred).toContain('preloadActiveOrderFilePanel');
    });

    it('active order orchestration uses workspace and lifecycle clusters', () => {
        const orchestration = fs.readFileSync(
            path.join(lawyerRoot, 'Dashboard_Active_Order_File/hooks/useActiveOrderFileOrchestration.tsx'),
            'utf8',
        );
        expect(orchestration).toContain('useActiveOrderFileWorkspaceCluster');
        expect(orchestration).toContain('useActiveOrderFileLifecycleCluster');
        expect(orchestration).toContain('assembleActiveOrderFileViewProps');
        const lines = orchestration.split('\n').length;
        expect(lines).toBeLessThan(90);
    });

    it('urgent actions form shell delegates logic to useUrgentActionsForm', () => {
        const form = read('Form_Urgent_Actions.tsx');
        expect(form).toContain('useUrgentActionsForm');
        expect(form).not.toContain('isParty1Plural');
        const lines = form.split('\n').length;
        // Smell gate (not a design law): thin composer after JSX peel Aug 2026 (~111 LOC).
        expect(lines).toBeLessThan(160);
        const formHook = read('Form_Urgent_Actions/useUrgentActionsForm.ts');
        expect(formHook).toContain('useUrgentActionsFormParties');
        expect(formHook.split('\n').length).toBeLessThan(200);
    });

    it('active order file uses assembleActiveOrderFileViewProps', () => {
        const orchestration = fs.readFileSync(
            path.join(lawyerRoot, 'Dashboard_Active_Order_File/hooks/useActiveOrderFileOrchestration.tsx'),
            'utf8',
        );
        expect(orchestration).toContain('assembleActiveOrderFileViewProps');
        expect(fs.existsSync(path.join(lawyerRoot, 'Dashboard_Active_Order_File/hooks/assembleActiveOrderFileViewProps.ts'))).toBe(true);
    });

    it('AOF/urgent lifecycle controls meet 44px floor (no residual 36/40)', () => {
        const files = [
            'Dashboard_Active_Order_File/panels/grievance/GrievanceTimingSection.tsx',
            'Dashboard_Active_Order_File/panels/grievance/GrievanceFiledHearingsSection.tsx',
            'Dashboard_Active_Order_File/panels/grievance/GrievanceFiledDetailsSection.tsx',
            'Dashboard_Active_Order_File/panels/judge/JudgeDecisionFormPanel.tsx',
            'Dashboard_Active_Order_File/panels/judge/JudgeStateOrderIntervention.tsx',
            'Dashboard_Active_Order_File/components/ConfirmDialogPortal.tsx',
            'Dashboard_Active_Order_File/components/PartyCardItem.tsx',
            'Dashboard_Active_Order_File/layout/AdminWorkspacePanel.tsx',
            'Dashboard_Active_Order_File/modals/DossierEditModal.tsx',
            'Dashboard_Active_Order_File/modals/MetaEditModal.tsx',
            'View_Urgent_And_Orders_Dashboard/UrgentLifecycleModals.tsx',
            'View_Urgent_And_Orders_Dashboard/UrgentDashboardErrorFallbacks.tsx',
        ];
        for (const rel of files) {
            const src = read(rel);
            expect(src, rel).not.toMatch(/min-h-\[36px\]/);
            expect(src, rel).not.toMatch(/min-h-\[40px\]/);
        }
        expect(read('View_Urgent_And_Orders_Dashboard/UrgentDashboardErrorFallbacks.tsx')).toContain(
            'bg-[#0B1021] p-4 text-center',
        );
        expect(read('View_Urgent_And_Orders_Dashboard/UrgentDashboardErrorFallbacks.tsx')).not.toContain(
            'bg-[#0B1021] p-6 text-center',
        );
    });

    it('urgent domain package has no @ts-nocheck in production files', () => {
        const offenders = listProductionFiles(domainRoot).filter((file) => {
            const head = fs.readFileSync(file, 'utf8').slice(0, 80);
            return head.includes('@ts-nocheck');
        });
        expect(offenders).toEqual([]);
    });

    it('urgent status and scope helpers are the single source of truth', () => {
        const status = read('Component_Urgent_Card.status.ts');
        expect(status).toContain('export function isUrgentCaseFinalized');
        expect(status).toContain('export function isUrgentCaseInArchiveScope');
        expect(status).toContain('export function getUrgentCasePhaseLabel');
        expect(status).toContain('export function hasUrgentGrievanceLogged');
        const dash = read('View_Urgent_And_Orders_Dashboard.tsx');
        expect(dash).toContain('isUrgentCaseInArchiveScope');
        expect(dash).not.toContain('handleCaseClickWithPreload');
        expect(dash).not.toContain('onViewDetails');
        expect(dash).not.toContain('completedCases');
        const section = read('View_Urgent_And_Orders_Dashboard/DashboardSection.tsx');
        expect(section.match(/cases\.map/g)?.length).toBe(1);
        expect(section).toContain('UrgentCardsGrid');
        expect(read('View_Urgent_And_Orders_Dashboard/UrgentDashboardErrorFallbacks.tsx')).toContain(
            'function OverlayErrorFallback',
        );
        expect(read('View_Urgent_And_Orders_Dashboard/UrgentDashboardSections.tsx')).toContain(
            'function UrgentEmptyState',
        );
        expect(read('View_Urgent_And_Orders_Dashboard/UrgentDashboardSections.tsx')).not.toContain(
            'منجزة ومكتسبة الدرجة القطعية',
        );
        expect(read('View_Urgent_And_Orders_Dashboard/UrgentLifecycleModals.tsx')).not.toContain('أرشفة الملف');
        expect(read('Component_Urgent_CardView.tsx')).toContain('buildUrgentCardPresentation');
        expect(read('Component_Urgent_CardView.tsx')).toContain('metaLayout="grid"');
        expect(read('Component_Urgent_CardView.tsx')).not.toContain('subtitle=');
        expect(fs.existsSync(path.join(domainRoot, 'hydrateCaseParts.ts'))).toBe(true);
        expect(
            fs.existsSync(
                path.join(lawyerRoot, 'Dashboard_Active_Order_File/layout/adminWorkspace/AdminWorkspaceTasksTab.tsx'),
            ),
        ).toBe(true);
        expect(read('Dashboard_Active_Order_File/layout/AdminWorkspaceTabContent.tsx').split('\n').length).toBeLessThan(
            80,
        );
    });

    it('urgent dashboard subtree has no @ts-nocheck in production files', () => {
        const roots = [
            path.join(lawyerRoot, 'View_Urgent_And_Orders_Dashboard'),
            path.join(lawyerRoot, 'Form_Urgent_Actions'),
            path.join(lawyerRoot, 'Component_Urgent_Card.tsx'),
        ];
        const offenders: string[] = [];
        for (const r of roots) {
            if (fs.statSync(r).isFile()) {
                const head = fs.readFileSync(r, 'utf8').slice(0, 80);
                if (head.includes('@ts-nocheck')) offenders.push(r);
            } else {
                offenders.push(
                    ...listProductionFiles(r).filter((file) => {
                        const head = fs.readFileSync(file, 'utf8').slice(0, 80);
                        return head.includes('@ts-nocheck');
                    }),
                );
            }
        }
        expect(offenders).toEqual([]);
    });
});
