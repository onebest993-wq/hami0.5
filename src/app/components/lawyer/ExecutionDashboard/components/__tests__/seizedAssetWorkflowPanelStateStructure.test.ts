import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PACKAGE_DIR = path.resolve(
    __dirname,
    '../seizedAssetWorkflow',
);
const COMPOSER = path.join(PACKAGE_DIR, 'useSeizedAssetWorkflowPanelState.tsx');
const PANEL_STATE = path.join(PACKAGE_DIR, 'panelState');

function lineCount(file: string): number {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

const EXTRACTED = [
    'seizedAssetWorkflowPanelStateTypes.ts',
    'useSeizedAssetWorkflowFoundation.ts',
    'useSeizedAssetWorkflowHandlers.tsx',
    'useSeizedAssetWorkflowSteps.tsx',
];

describe('useSeizedAssetWorkflowPanelState structure honesty', () => {
    it('keeps public composer thin and stable', () => {
        expect(fs.existsSync(COMPOSER)).toBe(true);
        const src = fs.readFileSync(COMPOSER, 'utf8');
        expect(src).toContain('export function useSeizedAssetWorkflowPanelState');
        expect(src).toContain("from './panelState/useSeizedAssetWorkflowFoundation'");
        expect(src).toContain("from './panelState/useSeizedAssetWorkflowHandlers'");
        expect(src).toContain("from './panelState/useSeizedAssetWorkflowSteps'");
        expect(lineCount(COMPOSER)).toBeLessThan(80);
    });

    it('wires domain modules under panelState/', () => {
        expect(fs.existsSync(PANEL_STATE)).toBe(true);
        for (const name of EXTRACTED) {
            expect(fs.existsSync(path.join(PANEL_STATE, name)), name).toBe(true);
            expect(lineCount(path.join(PANEL_STATE, name)), name).toBeLessThan(700);
        }
    });

    it('keeps domain body substantial after split', () => {
        const domain = EXTRACTED.reduce(
            (n, name) => n + lineCount(path.join(PANEL_STATE, name)),
            0,
        );
        expect(domain).toBeGreaterThan(500);
    });
});
