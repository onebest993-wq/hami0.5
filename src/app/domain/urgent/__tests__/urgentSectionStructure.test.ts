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

    it('workspace host lazy-loads urgent dashboard with prefetch', () => {
        const host = read('dashboard/LawsuitsWorkspaceHost.tsx');
        expect(host).toContain('UrgentWorkspaceTab');
        expect(host).toContain('prefetchUrgentOrdersViewModule');
        expect(host).toContain('preloadActiveOrderFilePanel');
        expect(host).toContain('Form_Urgent_Actions');
    });

    it('urgent dashboard uses lifecycle and quick-log hooks', () => {
        const dash = read('View_Urgent_And_Orders_Dashboard.tsx');
        expect(dash).toContain('useUrgentLifecycleModals');
        expect(dash).toContain('useUrgentQuickLog');
        expect(dash).toContain('UrgentDashboardSections');
        expect(dash).not.toContain('@ts-nocheck');
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
        expect(lines).toBeLessThan(560);
    });

    it('active order file uses assembleActiveOrderFileViewProps', () => {
        const orchestration = fs.readFileSync(
            path.join(lawyerRoot, 'Dashboard_Active_Order_File/hooks/useActiveOrderFileOrchestration.tsx'),
            'utf8',
        );
        expect(orchestration).toContain('assembleActiveOrderFileViewProps');
        expect(fs.existsSync(path.join(lawyerRoot, 'Dashboard_Active_Order_File/hooks/assembleActiveOrderFileViewProps.ts'))).toBe(true);
    });

    it('urgent domain package has no @ts-nocheck in production files', () => {
        const offenders = listProductionFiles(domainRoot).filter((file) => {
            const head = fs.readFileSync(file, 'utf8').slice(0, 80);
            return head.includes('@ts-nocheck');
        });
        expect(offenders).toEqual([]);
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
