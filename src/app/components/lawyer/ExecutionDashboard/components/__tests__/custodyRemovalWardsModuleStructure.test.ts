import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SHELL_FILE = path.resolve(
    __dirname,
    '../CustodyRemovalWardsModule.tsx',
);
const PACKAGE_DIR = path.resolve(__dirname, '../custodyRemoval');
const MAIN = path.join(PACKAGE_DIR, 'CustodyRemovalWardsModule.tsx');
const HOOK = path.join(PACKAGE_DIR, 'useCustodyRemovalWardsModule.ts');

const shellSource = fs.readFileSync(SHELL_FILE, 'utf8');

function lineCount(file: string): number {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

describe('CustodyRemovalWardsModule structure honesty', () => {
    it('keeps public shell path as thin re-export (import sites stable)', () => {
        expect(fs.existsSync(SHELL_FILE)).toBe(true);
        expect(lineCount(SHELL_FILE)).toBeLessThan(25);
        expect(shellSource).toContain("from './custodyRemoval'");
        expect(shellSource).toContain('CustodyRemovalWardsModule');
        expect(shellSource).toContain('CustodyRemovalWardsModuleProps');
        expect(shellSource).not.toContain('export const CustodyRemovalWardsModule');
        expect(shellSource).not.toContain('useState');
        expect(shellSource).not.toContain('WardDeliveryRow');
    });

    it('wires split under custodyRemoval/', () => {
        expect(fs.existsSync(PACKAGE_DIR)).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'index.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'custodyRemovalWardsModuleTypes.ts'))).toBe(
            true,
        );
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'WardDot.tsx'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'WardDeliveryRow.tsx'))).toBe(true);
        expect(fs.existsSync(HOOK)).toBe(true);
        expect(fs.existsSync(MAIN)).toBe(true);
    });

    it('orchestrator stays lean and imports extracted modules', () => {
        const main = fs.readFileSync(MAIN, 'utf8');
        expect(main).toContain('export const CustodyRemovalWardsModule');
        expect(main).toContain("from './useCustodyRemovalWardsModule'");
        expect(main).toContain("from './WardDeliveryRow'");
        expect(main).toContain('useCustodyRemovalWardsModule');
        expect(lineCount(MAIN)).toBeLessThan(400);
        expect(lineCount(HOOK)).toBeLessThan(400);
        expect(lineCount(path.join(PACKAGE_DIR, 'WardDeliveryRow.tsx'))).toBeLessThan(400);
    });

    it('exports props type from package barrel', () => {
        const typesSrc = fs.readFileSync(
            path.join(PACKAGE_DIR, 'custodyRemovalWardsModuleTypes.ts'),
            'utf8',
        );
        const indexSrc = fs.readFileSync(path.join(PACKAGE_DIR, 'index.ts'), 'utf8');
        expect(typesSrc).toContain('export interface CustodyRemovalWardsModuleProps');
        expect(indexSrc).toContain("from './CustodyRemovalWardsModule'");
        expect(indexSrc).toContain("from './custodyRemovalWardsModuleTypes'");
    });

    it('keeps each extracted module under the line budget', () => {
        const files = fs.readdirSync(PACKAGE_DIR).filter((f) => /\.(ts|tsx)$/.test(f));
        for (const f of files) {
            expect(lineCount(path.join(PACKAGE_DIR, f)), f).toBeLessThanOrEqual(450);
        }
    });
});
