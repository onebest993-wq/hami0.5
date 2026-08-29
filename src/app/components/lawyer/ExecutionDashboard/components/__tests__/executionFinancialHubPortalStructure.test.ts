import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const COMPONENTS = path.resolve(__dirname, '..');
const SHELL = path.join(COMPONENTS, 'ExecutionFinancialHubPortal.tsx');
const PACKAGE_DIR = path.join(COMPONENTS, 'executionFinancialHub');

function lineCount(file: string): number {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

const EXTRACTED = [
    'ExecutionFinancialHubPortalProps.ts',
    'useExecutionFinancialHubModel.ts',
    'ExecutionFinancialHubPortalDialog.tsx',
    'ExecutionFinancialHubFocBody.tsx',
    'financialHubMonthlySettlementHandlers.ts',
];

describe('ExecutionFinancialHubPortal structure honesty', () => {
    it('keeps public shell as thin composer', () => {
        expect(fs.existsSync(SHELL)).toBe(true);
        const src = fs.readFileSync(SHELL, 'utf8');
        expect(src).toContain('export const ExecutionFinancialHubPortal');
        expect(src).toContain("from './executionFinancialHub/useExecutionFinancialHubModel'");
        expect(src).toContain("from './executionFinancialHub/ExecutionFinancialHubPortalDialog'");
        expect(lineCount(SHELL)).toBeLessThan(40);
    });

    it('wires split under executionFinancialHub/', () => {
        expect(fs.existsSync(PACKAGE_DIR)).toBe(true);
        for (const name of EXTRACTED) {
            expect(fs.existsSync(path.join(PACKAGE_DIR, name)), name).toBe(true);
            expect(lineCount(path.join(PACKAGE_DIR, name)), name).toBeLessThan(700);
        }
    });

    it('exports props type from package and re-exports from shell', () => {
        const propsSrc = fs.readFileSync(
            path.join(PACKAGE_DIR, 'ExecutionFinancialHubPortalProps.ts'),
            'utf8',
        );
        const shellSrc = fs.readFileSync(SHELL, 'utf8');
        expect(propsSrc).toContain('export interface ExecutionFinancialHubPortalProps');
        expect(shellSrc).toContain('ExecutionFinancialHubPortalProps');
    });
});
