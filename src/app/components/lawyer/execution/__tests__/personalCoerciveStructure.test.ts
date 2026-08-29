import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHELL_FILE = path.resolve(__dirname, '../PersonalCoerciveFollowupPanel.tsx');
const PACKAGE_DIR = path.resolve(__dirname, '../personalCoercive');
const MAIN_PANEL = path.join(PACKAGE_DIR, 'PersonalCoerciveFollowupPanel.tsx');
const SECTIONS_DIR = path.join(PACKAGE_DIR, 'sections');
const HOOKS_DIR = path.join(PACKAGE_DIR, 'hooks');
const ABANDONED_DIR = path.resolve(__dirname, '../PersonalCoerciveFollowup');

const shellSource = fs.readFileSync(SHELL_FILE, 'utf8');
const SHELL_LINE_COUNT = shellSource.split('\n').length;
const MAIN_LINE_COUNT = fs.existsSync(MAIN_PANEL)
    ? fs.readFileSync(MAIN_PANEL, 'utf8').split('\n').length
    : 0;

const SECTION_FILES = [
    'ForcedBringSection.tsx',
    'InvestigationCourtSection.tsx',
    'TravelBanSection.tsx',
    'DossierPresentationSection.tsx',
    'ExecutiveDetentionJudgeSection.tsx',
    'GuarantorFollowupStrip.tsx',
];

const PRIORITY_HOOKS = [
    'usePersonalCoercivePanelState.ts',
    'usePersonalCoerciveDecisions.ts',
    'usePersonalCoerciveDerived.ts',
    'usePersonalCoerciveActions.ts',
];

const ACTIONS_DIR = path.join(HOOKS_DIR, 'actions');
const DERIVED_DIR = path.join(HOOKS_DIR, 'derived');
const DECISIONS_DIR = path.join(HOOKS_DIR, 'decisions');

const ACTION_MODULES = [
    'usePersonalCoerciveSubmitCore.tsx',
    'usePersonalCoerciveForcedBringActions.ts',
    'usePersonalCoerciveInvestigationActions.ts',
    'usePersonalCoerciveDetentionJudgeActions.tsx',
    'usePersonalCoerciveTravelBanActions.ts',
    'usePersonalCoerciveDossierPresentationActions.ts',
    'applyPersonalCoerciveInlineResolvedResult.ts',
];

const DERIVED_MODULES = [
    'usePersonalCoerciveDerivedLaneCore.ts',
    'usePersonalCoerciveDerivedFlowTravel.ts',
    'usePersonalCoerciveDossierJudgeDerived.ts',
];

const DECISION_MODULES = [
    'usePersonalCoerciveDecisionRowsStates.ts',
    'usePersonalCoerciveDecisionFinders.ts',
    'usePersonalCoerciveAppealRenderers.tsx',
];

function lineCount(filePath: string): number {
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
}

function packageContains(needle: string): boolean {
    const walk = (dir: string): boolean => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                if (walk(p)) return true;
            } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
                if (fs.readFileSync(p, 'utf8').includes(needle)) return true;
            }
        }
        return false;
    };
    return walk(PACKAGE_DIR);
}

describe('PersonalCoerciveFollowupPanel Phase 1a structure', () => {
    it('keeps public shell path as thin re-export (lazy registry stable)', () => {
        expect(fs.existsSync(SHELL_FILE)).toBe(true);
        expect(SHELL_LINE_COUNT).toBeLessThan(20);
        expect(shellSource).toContain("from './personalCoercive'");
        expect(shellSource).toContain('PersonalCoerciveFollowupPanel');
        expect(shellSource).toContain('PersonalCoerciveFollowupPanelProps');
        expect(shellSource).not.toContain('export const PersonalCoerciveFollowupPanel');
        expect(shellSource).not.toContain('export interface PersonalCoerciveFollowupPanelProps');
    });

    it('wires split under personalCoercive/ (not abandoned PersonalCoerciveFollowup/)', () => {
        expect(fs.existsSync(ABANDONED_DIR)).toBe(false);
        expect(fs.existsSync(PACKAGE_DIR)).toBe(true);
        expect(fs.existsSync(MAIN_PANEL)).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'index.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'types.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'personalCoerciveStyles.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'utils/appealSyncMap.ts'))).toBe(true);
        expect(
            fs.existsSync(path.join(PACKAGE_DIR, 'utils/coerciveOutcomeFromDecisionRow.ts')),
        ).toBe(true);
        expect(
            fs.existsSync(path.join(PACKAGE_DIR, 'chrome/PersonalCoerciveFollowUpPortal.tsx')),
        ).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'chrome/CoerciveSubsectionFold.tsx'))).toBe(
            true,
        );
    });

    it('extracts lane JSX into sections/ and priority hooks under hooks/', () => {
        expect(fs.existsSync(SECTIONS_DIR)).toBe(true);
        for (const name of SECTION_FILES) {
            expect(fs.existsSync(path.join(SECTIONS_DIR, name))).toBe(true);
        }
        expect(fs.existsSync(HOOKS_DIR)).toBe(true);
        for (const name of PRIORITY_HOOKS) {
            expect(fs.existsSync(path.join(HOOKS_DIR, name))).toBe(true);
        }
        expect(fs.existsSync(path.join(HOOKS_DIR, 'usePersonalCoercivePanelModel.ts'))).toBe(true);

        const main = fs.readFileSync(MAIN_PANEL, 'utf8');
        expect(main).toContain("from './sections/ForcedBringSection'");
        expect(main).toContain("from './hooks/usePersonalCoercivePanelModel'");
        expect(main).toContain('usePersonalCoercivePanelModel');
    });

    it('keeps orchestrator under honest post-hooks budget', () => {
        // Hooks hold the former ~2.6k-line body; orchestrator is model + JSX wiring.
        expect(MAIN_LINE_COUNT).toBeGreaterThan(400);
        expect(MAIN_LINE_COUNT).toBeLessThan(2000);
    });

    it('splits usePersonalCoerciveActions into domain modules under hooks/actions/', () => {
        expect(fs.existsSync(ACTIONS_DIR)).toBe(true);
        expect(fs.existsSync(path.join(ACTIONS_DIR, 'types.ts'))).toBe(true);
        expect(fs.existsSync(path.join(ACTIONS_DIR, 'index.ts'))).toBe(true);
        for (const name of ACTION_MODULES) {
            expect(fs.existsSync(path.join(ACTIONS_DIR, name))).toBe(true);
        }

        const composerLines = lineCount(path.join(HOOKS_DIR, 'usePersonalCoerciveActions.ts'));
        // Composer only wires domain hooks — not the former ~1.8k-line monolith.
        expect(composerLines).toBeGreaterThan(20);
        expect(composerLines).toBeLessThan(120);

        const composerSrc = fs.readFileSync(
            path.join(HOOKS_DIR, 'usePersonalCoerciveActions.ts'),
            'utf8',
        );
        expect(composerSrc).toContain("from './actions'");
        expect(composerSrc).toContain('usePersonalCoerciveSubmitCore');
        expect(composerSrc).toContain('usePersonalCoerciveForcedBringActions');
        expect(composerSrc).toContain('usePersonalCoerciveInvestigationActions');
        expect(composerSrc).toContain('usePersonalCoerciveDetentionJudgeActions');
        expect(composerSrc).toContain('usePersonalCoerciveTravelBanActions');
        expect(composerSrc).toContain('usePersonalCoerciveDossierPresentationActions');

        const actionModuleLines = ACTION_MODULES.reduce(
            (n, name) => n + lineCount(path.join(ACTIONS_DIR, name)),
            0,
        );
        // Domain modules hold the former actions body (honest floor/ceiling).
        expect(actionModuleLines).toBeGreaterThan(1400);
        expect(actionModuleLines).toBeLessThan(2800);
        for (const name of ACTION_MODULES) {
            const n = lineCount(path.join(ACTIONS_DIR, name));
            expect(n).toBeGreaterThan(80);
            expect(n).toBeLessThan(700);
        }
    });

    it('splits usePersonalCoerciveDerived into modules under hooks/derived/', () => {
        expect(fs.existsSync(DERIVED_DIR)).toBe(true);
        expect(fs.existsSync(path.join(DERIVED_DIR, 'types.ts'))).toBe(true);
        expect(fs.existsSync(path.join(DERIVED_DIR, 'index.ts'))).toBe(true);
        for (const name of DERIVED_MODULES) {
            expect(fs.existsSync(path.join(DERIVED_DIR, name))).toBe(true);
        }

        const composerLines = lineCount(path.join(HOOKS_DIR, 'usePersonalCoerciveDerived.ts'));
        // Composer only wires derived bands — not the former ~900-line monolith.
        expect(composerLines).toBeGreaterThan(20);
        expect(composerLines).toBeLessThan(80);

        const composerSrc = fs.readFileSync(
            path.join(HOOKS_DIR, 'usePersonalCoerciveDerived.ts'),
            'utf8',
        );
        expect(composerSrc).toContain("from './derived'");
        expect(composerSrc).toContain('usePersonalCoerciveDerivedLaneCore');
        expect(composerSrc).toContain('usePersonalCoerciveDerivedFlowTravel');
        expect(composerSrc).toContain('usePersonalCoerciveDossierJudgeDerived');

        const derivedModuleLines = DERIVED_MODULES.reduce(
            (n, name) => n + lineCount(path.join(DERIVED_DIR, name)),
            0,
        );
        expect(derivedModuleLines).toBeGreaterThan(700);
        expect(derivedModuleLines).toBeLessThan(1400);
        for (const name of DERIVED_MODULES) {
            const n = lineCount(path.join(DERIVED_DIR, name));
            expect(n).toBeGreaterThan(150);
            expect(n).toBeLessThan(500);
        }
    });

    it('splits usePersonalCoerciveDecisions into modules under hooks/decisions/', () => {
        expect(fs.existsSync(DECISIONS_DIR)).toBe(true);
        expect(fs.existsSync(path.join(DECISIONS_DIR, 'types.ts'))).toBe(true);
        expect(fs.existsSync(path.join(DECISIONS_DIR, 'index.ts'))).toBe(true);
        for (const name of DECISION_MODULES) {
            expect(fs.existsSync(path.join(DECISIONS_DIR, name))).toBe(true);
        }

        const composerLines = lineCount(path.join(HOOKS_DIR, 'usePersonalCoerciveDecisions.ts'));
        // Composer only wires decision bands — not the former ~600-line monolith.
        expect(composerLines).toBeGreaterThan(15);
        expect(composerLines).toBeLessThan(60);

        const composerSrc = fs.readFileSync(
            path.join(HOOKS_DIR, 'usePersonalCoerciveDecisions.ts'),
            'utf8',
        );
        expect(composerSrc).toContain("from './decisions'");
        expect(composerSrc).toContain('usePersonalCoerciveDecisionRowsStates');
        expect(composerSrc).toContain('usePersonalCoerciveDecisionFinders');
        expect(composerSrc).toContain('usePersonalCoerciveAppealRenderers');

        const decisionModuleLines = DECISION_MODULES.reduce(
            (n, name) => n + lineCount(path.join(DECISIONS_DIR, name)),
            0,
        );
        expect(decisionModuleLines).toBeGreaterThan(400);
        expect(decisionModuleLines).toBeLessThan(900);
        for (const name of DECISION_MODULES) {
            const n = lineCount(path.join(DECISIONS_DIR, name));
            expect(n).toBeGreaterThan(50);
            expect(n).toBeLessThan(400);
        }
    });

    it('main panel implementation lives in package with chrome/utils imports', () => {
        const main = fs.readFileSync(MAIN_PANEL, 'utf8');
        expect(main).toContain('export const PersonalCoerciveFollowupPanel');
        expect(main).toContain("from './personalCoerciveStyles'");
        expect(packageContains("from './utils/appealSyncMap'") || packageContains("from '../utils/appealSyncMap'")).toBe(
            true,
        );
        expect(
            packageContains("from './utils/coerciveOutcomeFromDecisionRow'") ||
                packageContains("from '../utils/coerciveOutcomeFromDecisionRow'"),
        ).toBe(true);
        expect(main).toContain("from './chrome/PersonalCoerciveFollowUpPortal'");
        expect(packageContains('CoerciveSubsectionFold')).toBe(true);
    });

    it('exports panel props from types.ts via package barrel', () => {
        const typesSrc = fs.readFileSync(path.join(PACKAGE_DIR, 'types.ts'), 'utf8');
        const indexSrc = fs.readFileSync(path.join(PACKAGE_DIR, 'index.ts'), 'utf8');
        expect(typesSrc).toContain('export interface PersonalCoerciveFollowupPanelProps');
        expect(indexSrc).toContain("from './PersonalCoerciveFollowupPanel'");
        expect(indexSrc).toContain("from './types'");
    });

    it('keeps runtime imports on live execution utilities (no dead split hooks)', () => {
        expect(packageContains("from '@/app/utils/executorSeizureDecisionQueue'")).toBe(true);
        expect(packageContains('RejectedExecutorResubmitStrip')).toBe(true);
    });
});
