import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const COMPONENTS = path.resolve(__dirname, '..');
const SHELL = path.join(COMPONENTS, 'UnifiedSeizureLogEntryFooter.tsx');
const PACKAGE_DIR = path.join(COMPONENTS, 'unifiedSeizureLogEntryFooter');

function lineCount(file: string): number {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

const EXTRACTED = [
    'UnifiedSeizureLogEntryFooterProps.ts',
    'unifiedSeizureLogEntryFooterHelpers.tsx',
    'UnifiedSeizureLogFooterBranchCtx.ts',
    'renderPropertySeizureLogFooterBranches.tsx',
    'renderMovableSeizureLogFooterBranches.tsx',
    'renderSalaryThirdPartySeizureLogFooterBranches.tsx',
];

describe('UnifiedSeizureLogEntryFooter structure honesty', () => {
    it('keeps public shell as thin composer with stable export', () => {
        expect(fs.existsSync(SHELL)).toBe(true);
        const src = fs.readFileSync(SHELL, 'utf8');
        expect(src).toContain('export function UnifiedSeizureLogEntryFooter');
        expect(src).toContain('renderPropertySeizureLogFooterBranches');
        expect(src).toContain('renderMovableSeizureLogFooterBranches');
        expect(src).toContain('renderSalaryThirdPartySeizureLogFooterBranches');
        expect(lineCount(SHELL)).toBeLessThan(100);
    });

    it('wires split under unifiedSeizureLogEntryFooter/', () => {
        expect(fs.existsSync(PACKAGE_DIR)).toBe(true);
        for (const name of EXTRACTED) {
            expect(fs.existsSync(path.join(PACKAGE_DIR, name)), name).toBe(true);
            expect(lineCount(path.join(PACKAGE_DIR, name)), name).toBeLessThan(700);
        }
    });

    it('re-exports footer props from shell path', () => {
        const shellSrc = fs.readFileSync(SHELL, 'utf8');
        const propsSrc = fs.readFileSync(
            path.join(PACKAGE_DIR, 'UnifiedSeizureLogEntryFooterProps.ts'),
            'utf8',
        );
        expect(propsSrc).toContain('export type UnifiedSeizureLogEntryFooterProps');
        expect(shellSrc).toContain('UnifiedSeizureLogEntryFooterProps');
    });
});
