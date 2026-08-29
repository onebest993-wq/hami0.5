import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHELL_FILE = path.resolve(__dirname, '../EvictionFieldProceduresPanel.tsx');
const PACKAGE_DIR = path.resolve(__dirname, '../evictionField');
const MAIN_PANEL = path.join(PACKAGE_DIR, 'EvictionFieldProceduresPanel.tsx');
const SECTIONS_DIR = path.join(PACKAGE_DIR, 'sections');
const HOOKS_DIR = path.join(PACKAGE_DIR, 'hooks');
const ABANDONED_DIR = path.resolve(__dirname, '../EvictionFieldProcedures');

const shellSource = fs.readFileSync(SHELL_FILE, 'utf8');
const SHELL_LINE_COUNT = shellSource.split('\n').length;
const MAIN_LINE_COUNT = fs.existsSync(MAIN_PANEL)
    ? fs.readFileSync(MAIN_PANEL, 'utf8').split('\n').length
    : 0;

const SECTION_FILES = [
    'HeirsNotificationSection.tsx',
    'ResidentialGraceSection.tsx',
    'FieldVisitBranchSection.tsx',
    'PoliceAssistanceBranchSection.tsx',
    'ResidentialGraceEarlyEndSection.tsx',
    'BreakInventoryBranchSection.tsx',
    'JudicialCustodianBranchSection.tsx',
];

const PRIORITY_HOOKS = [
    'useEvictionFieldPanelState.ts',
    'useEvictionFieldDecisions.ts',
    'useEvictionFieldActions.tsx',
    'useEvictionFieldActionRenderers.tsx',
    'useEvictionFieldBranchRenderers.tsx',
    'useEvictionFieldPanelModel.tsx',
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

describe('EvictionFieldProceduresPanel Phase 1b structure', () => {
    it('keeps public shell path as thin re-export (lazy registry stable)', () => {
        expect(fs.existsSync(SHELL_FILE)).toBe(true);
        expect(SHELL_LINE_COUNT).toBeLessThan(20);
        expect(shellSource).toContain("from './evictionField'");
        expect(shellSource).toContain('EvictionFieldProceduresPanel');
        expect(shellSource).toContain('EvictionFieldProceduresPanelProps');
        expect(shellSource).not.toContain('export const EvictionFieldProceduresPanel');
        expect(shellSource).not.toContain('export interface EvictionFieldProceduresPanelProps');
    });

    it('wires split under evictionField/ (not abandoned EvictionFieldProcedures/)', () => {
        expect(fs.existsSync(ABANDONED_DIR)).toBe(false);
        expect(fs.existsSync(PACKAGE_DIR)).toBe(true);
        expect(fs.existsSync(MAIN_PANEL)).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'index.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'types.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'evictionFieldStyles.ts'))).toBe(true);
        expect(
            fs.existsSync(path.join(PACKAGE_DIR, 'utils/branchRowNeedsPostApprovalInlineWork.ts')),
        ).toBe(true);
        expect(
            fs.existsSync(path.join(PACKAGE_DIR, 'utils/isJudicialCustodianRowDetailsComplete.ts')),
        ).toBe(true);
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

        const main = fs.readFileSync(MAIN_PANEL, 'utf8');
        expect(main).toContain("from './sections'");
        expect(main).toContain("from './hooks/useEvictionFieldPanelModel'");
        expect(main).toContain('useEvictionFieldPanelModel');
        expect(main).toContain('FieldVisitBranchSection');
        expect(main).toContain('PoliceAssistanceBranchSection');
    });

    it('keeps orchestrator under honest post-split budget', () => {
        // Former ~1763-line monolith; orchestrator is model + section wiring.
        expect(MAIN_LINE_COUNT).toBeGreaterThan(80);
        expect(MAIN_LINE_COUNT).toBeLessThan(800);
    });

    it('exports panel props from types.ts via package barrel', () => {
        const typesSrc = fs.readFileSync(path.join(PACKAGE_DIR, 'types.ts'), 'utf8');
        const indexSrc = fs.readFileSync(path.join(PACKAGE_DIR, 'index.ts'), 'utf8');
        expect(typesSrc).toContain('export interface EvictionFieldProceduresPanelProps');
        expect(indexSrc).toContain("from './EvictionFieldProceduresPanel'");
        expect(indexSrc).toContain("from './types'");
    });

    it('keeps runtime imports on live execution utilities (no dead split hooks)', () => {
        expect(packageContains("from '@/app/utils/executorSeizureDecisionQueue'")).toBe(true);
        expect(packageContains('PoliceAssistanceInlineForm')).toBe(true);
        expect(packageContains('JudicialCustodianInlineForm')).toBe(true);
        expect(packageContains('BreakInventoryFurnitureInlineForm')).toBe(true);
    });

    it('splits model into priority hooks with substantial domain bodies', () => {
        const composerLines = lineCount(path.join(HOOKS_DIR, 'useEvictionFieldPanelModel.tsx'));
        expect(composerLines).toBeGreaterThan(15);
        expect(composerLines).toBeLessThan(80);

        const actionsLines = lineCount(path.join(HOOKS_DIR, 'useEvictionFieldActions.tsx'));
        const renderersLines = lineCount(path.join(HOOKS_DIR, 'useEvictionFieldBranchRenderers.tsx'));
        const actionRenderersLines = lineCount(path.join(HOOKS_DIR, 'useEvictionFieldActionRenderers.tsx'));
        expect(actionsLines).toBeGreaterThan(200);
        expect(actionsLines).toBeLessThan(500);
        expect(renderersLines).toBeGreaterThan(80);
        expect(renderersLines).toBeLessThan(700);
        expect(actionRenderersLines).toBeGreaterThan(80);
        expect(actionRenderersLines).toBeLessThan(400);

        const branchRenderersDir = path.join(HOOKS_DIR, 'branchRenderers');
        expect(fs.existsSync(branchRenderersDir)).toBe(true);
        const branchModules = [
            'evictionDecisionRowTypes.ts',
            'arabicDateLabels.ts',
            'evictionBranchRenderersCtx.ts',
            'createRenderFieldVisitInline.tsx',
            'createRenderInlineDecision.tsx',
            'createRenderEvictionBranchPanelBody.tsx',
        ];
        for (const name of branchModules) {
            const n = lineCount(path.join(branchRenderersDir, name));
            expect(fs.existsSync(path.join(branchRenderersDir, name)), name).toBe(true);
            expect(n, name).toBeLessThan(700);
        }
        const branchDomainLines = branchModules.reduce(
            (n, name) => n + lineCount(path.join(branchRenderersDir, name)),
            0,
        );
        expect(branchDomainLines).toBeGreaterThan(400);

        const sectionLines = SECTION_FILES.reduce(
            (n, name) => n + lineCount(path.join(SECTIONS_DIR, name)),
            0,
        );
        expect(sectionLines).toBeGreaterThan(400);
        expect(sectionLines).toBeLessThan(1200);
    });
});
