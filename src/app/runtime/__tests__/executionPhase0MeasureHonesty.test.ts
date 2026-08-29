import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const helpersIndex = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/helpers/index.ts',
);
const lazyShell = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell.tsx',
);

describe('execution Phase 0 measure honesty', () => {
    it('helpers barrel يصدّر رموزاً مستخدمة — بلا حشو زخرفي في الرأس', () => {
        const src = fs.readFileSync(helpersIndex, 'utf8');
        expect(src).toContain('executionDebtorRowCleared');
        expect(src).toContain('evictionLocalYmdToday');
        expect(src).toContain('bindHorizontalWheelToScroll');
        expect(src).toContain('upsertSeizedPropertyFromDetails');
        expect(src).toContain('makeHeirRowId');
        expect(src).toContain('dossierLifecycleLabelAr');
        expect(src).not.toMatch(/\bisSalarySeizureAsset\b/);
        expect(src).not.toMatch(/\bisMovablePropertySeizureRow\b/);
        expect(src).not.toMatch(/\bbuildSeizureRegistryDraftPatch\b/);
        expect(src).not.toMatch(/\bdedupeHeirDetailRowsByName\b/);
        expect(src).not.toMatch(/\bcollectPartyHeirDetailRows\b/);
        expect(src).not.toMatch(/Modular Architecture[\s\S]*@author/);
    });

    it('lazy shell barrel رفيع ومحدود بمسارات lazy معروفة', () => {
        const src = fs.readFileSync(lazyShell, 'utf8');
        expect(src).toContain("export * from './executionDashboardLazyRegistry'");
        expect(src).toContain("export * from './executionFollowupTabPrefetch'");
        expect(src).toContain("export * from './executionDashboardPhoneBodyLazy'");
        expect(src.split('\n').filter((l) => l.trim().startsWith('export')).length).toBeLessThanOrEqual(8);
        // Star re-exports kept on purpose (dynamic warm import + Lazy* churn risk).
        expect(src).toMatch(/Prefer deep imports|export \*/);
    });

    it('top single-symbol lazyShell callers use deep imports (not the barrel)', () => {
        const rootExec = path.join(root, 'src/app/components/lawyer/ExecutionDashboard/components');
        const barrelFrom = /from\s+['"][^'"]*executionDashboardLazyShell['"]/;
        const deepSites: Array<{ file: string; needle: string }> = [
            {
                file: 'ActionGridSection.tsx',
                needle: "from '@/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch'",
            },
            {
                file: 'PartiesSection.tsx',
                needle: "from '../executionDashboardLazyShellUi'",
            },
            {
                file: 'ExecutionDashboardNotesOverlays.tsx',
                needle: 'executionDashboardLazyRegistry',
            },
            {
                file: 'ExecutionDashboardSolidaryEvictionOverlays.tsx',
                needle: 'executionDashboardLazyRegistry',
            },
            {
                file: 'ExecutionDashboardExecutorWorkflowOverlays.tsx',
                needle: 'executionDashboardLazyRegistry',
            },
            {
                file: 'ExecutionDashboardHeavyModals.tsx',
                needle: 'ExecutionDashboardHeavyModalsEarlyCluster',
            },
            {
                file: 'ExecutionDashboardHeavyModalsLateCluster.tsx',
                needle: "from '../executionDashboardLazyRegistryOverlays'",
            },
            {
                file: 'ExecutionDashboardEditOverlays.tsx',
                needle: 'executionDashboardLazyRegistry',
            },
        ];
        for (const site of deepSites) {
            const src = fs.readFileSync(path.join(rootExec, site.file), 'utf8');
            expect(src, site.file).toContain(site.needle);
            expect(src, `${site.file} no barrel`).not.toMatch(barrelFrom);
        }

        const overlayPrefetch = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch.ts',
            ),
            'utf8',
        );
        expect(overlayPrefetch).toContain("from './executionDashboardLazyRegistryShell'");
        expect(overlayPrefetch).not.toMatch(
            /from\s+['"]\.\/executionDashboardLazyRegistryOverlays['"]/,
        );
        expect(overlayPrefetch).toContain("import('./executionDashboardLazyRegistryOverlays')");
        expect(overlayPrefetch).not.toMatch(/from\s+['"]\.\/executionFollowupTabPrefetch['"]/);
        expect(overlayPrefetch).toContain("import('./executionFollowupTabPrefetch')");
        expect(overlayPrefetch).not.toMatch(/from\s+['"]\.\/executionDashboardLazyRegistry['"]/);
        expect(overlayPrefetch).not.toMatch(barrelFrom);
    });

    it('PersonalCoercive Phase 1a + EvictionField Phase 1b: قشور رفيعة؛ التنفيذ في الحزم', () => {
        const coerciveShell = path.join(
            root,
            'src/app/components/lawyer/execution/PersonalCoerciveFollowupPanel.tsx',
        );
        expect(fs.existsSync(coerciveShell)).toBe(true);
        expect(fs.readFileSync(coerciveShell, 'utf8').split('\n').length).toBeLessThan(20);

        const personalMain = path.join(
            root,
            'src/app/components/lawyer/execution/personalCoercive/PersonalCoerciveFollowupPanel.tsx',
        );
        expect(fs.existsSync(personalMain)).toBe(true);
        expect(fs.readFileSync(personalMain, 'utf8').split('\n').length).toBeLessThan(2000);

        const personalHooks = path.join(
            root,
            'src/app/components/lawyer/execution/personalCoercive/hooks',
        );
        expect(fs.existsSync(path.join(personalHooks, 'usePersonalCoercivePanelState.ts'))).toBe(true);
        expect(fs.existsSync(path.join(personalHooks, 'usePersonalCoerciveDecisions.ts'))).toBe(true);
        expect(fs.existsSync(path.join(personalHooks, 'usePersonalCoerciveDerived.ts'))).toBe(true);
        expect(fs.existsSync(path.join(personalHooks, 'usePersonalCoerciveActions.ts'))).toBe(true);
        const personalActionsDir = path.join(personalHooks, 'actions');
        expect(fs.existsSync(personalActionsDir)).toBe(true);
        expect(
            fs.existsSync(path.join(personalActionsDir, 'usePersonalCoerciveSubmitCore.tsx')) ||
                fs.existsSync(path.join(personalActionsDir, 'usePersonalCoerciveSubmitCore.ts')),
        ).toBe(true);
        const personalDerivedDir = path.join(personalHooks, 'derived');
        expect(fs.existsSync(personalDerivedDir)).toBe(true);
        expect(
            fs.existsSync(path.join(personalDerivedDir, 'usePersonalCoerciveDerivedLaneCore.ts')),
        ).toBe(true);
        const personalDecisionsDir = path.join(personalHooks, 'decisions');
        expect(fs.existsSync(personalDecisionsDir)).toBe(true);
        expect(
            fs.existsSync(path.join(personalDecisionsDir, 'usePersonalCoerciveDecisionRowsStates.ts')),
        ).toBe(true);
        expect(
            fs.readFileSync(path.join(personalHooks, 'usePersonalCoerciveDerived.ts'), 'utf8').split(/\r?\n/)
                .length,
        ).toBeLessThan(80);
        expect(
            fs.readFileSync(path.join(personalHooks, 'usePersonalCoerciveDecisions.ts'), 'utf8').split(/\r?\n/)
                .length,
        ).toBeLessThan(60);
        const countTsLinesUnder = (dir: string): number => {
            let total = 0;
            for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, ent.name);
                if (ent.isDirectory()) total += countTsLinesUnder(p);
                else if (/\.tsx?$/.test(ent.name)) {
                    total += fs.readFileSync(p, 'utf8').split(/\r?\n/).length;
                }
            }
            return total;
        };
        // Priority hooks + actions/* domain modules (composer alone is thin after split).
        const hooksLines = countTsLinesUnder(personalHooks);
        expect(hooksLines).toBeGreaterThan(2000);

        const evictionShell = path.join(
            root,
            'src/app/components/lawyer/execution/EvictionFieldProceduresPanel.tsx',
        );
        expect(fs.existsSync(evictionShell)).toBe(true);
        expect(fs.readFileSync(evictionShell, 'utf8').split('\n').length).toBeLessThan(20);

        const evictionMain = path.join(
            root,
            'src/app/components/lawyer/execution/evictionField/EvictionFieldProceduresPanel.tsx',
        );
        expect(fs.existsSync(evictionMain)).toBe(true);
        // Orchestrator after hooks/sections split — former ~1763-line monolith.
        expect(fs.readFileSync(evictionMain, 'utf8').split('\n').length).toBeLessThan(800);
        const evictionHooks = path.join(
            root,
            'src/app/components/lawyer/execution/evictionField/hooks',
        );
        expect(fs.existsSync(path.join(evictionHooks, 'useEvictionFieldPanelModel.tsx'))).toBe(true);
        expect(fs.existsSync(path.join(evictionHooks, 'useEvictionFieldActions.tsx'))).toBe(true);
        expect(fs.existsSync(path.join(evictionHooks, 'useEvictionFieldBranchRenderers.tsx'))).toBe(
            true,
        );
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/execution/evictionField/sections/FieldVisitBranchSection.tsx',
                ),
            ),
        ).toBe(true);
        const evictionHooksLines = countTsLinesUnder(evictionHooks);
        expect(evictionHooksLines).toBeGreaterThan(1000);

        const badgesShell = path.join(
            root,
            'src/app/components/lawyer/execution/ExecutionPartyInteractiveBadges.tsx',
        );
        const badgesShellSrc = fs.readFileSync(badgesShell, 'utf8');
        expect(fs.existsSync(badgesShell)).toBe(true);
        expect(badgesShellSrc.split(/\r?\n/).length).toBeLessThan(25);
        expect(badgesShellSrc).toContain("from './partyInteractiveBadges'");

        const badgesMain = path.join(
            root,
            'src/app/components/lawyer/execution/partyInteractiveBadges/ExecutionPartyInteractiveBadges.tsx',
        );
        expect(fs.existsSync(badgesMain)).toBe(true);
        expect(fs.readFileSync(badgesMain, 'utf8').split(/\r?\n/).length).toBeGreaterThan(400);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/execution/partyInteractiveBadges/index.ts'),
            ),
        ).toBe(true);
    });
});
