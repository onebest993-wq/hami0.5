import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHELL_FILE = path.resolve(__dirname, '../VisitationScheduleModule.tsx');
const PACKAGE_DIR = path.resolve(__dirname, '../visitationSchedule');
const MAIN = path.join(PACKAGE_DIR, 'VisitationScheduleModule.tsx');

const shellSource = fs.readFileSync(SHELL_FILE, 'utf8');
const SHELL_LINE_COUNT = shellSource.split(/\r?\n/).length;

function lineCount(file: string): number {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

const EXTRACTED_FILES = [
    'index.ts',
    'visitationScheduleModuleTypes.ts',
    'visitationScheduleModuleConstants.ts',
    'visitationScheduleModuleUtils.ts',
    'VisitationLauncherCard.tsx',
    'VisitationWorkspaceSheet.tsx',
    'AppointmentBlock.tsx',
    'VisitationWorkspaceBody.tsx',
    'useVisitationScheduleModuleState.ts',
    'VisitationScheduleModule.tsx',
];

describe('VisitationScheduleModule structure honesty', () => {
    it('keeps public shell path as thin re-export (lazy registry stable)', () => {
        expect(fs.existsSync(SHELL_FILE)).toBe(true);
        expect(SHELL_LINE_COUNT).toBeLessThan(20);
        expect(shellSource).toContain("from './visitationSchedule'");
        expect(shellSource).toContain('VisitationScheduleModule');
        expect(shellSource).toContain('VisitationScheduleModuleProps');
        expect(shellSource).not.toContain('export const VisitationScheduleModule');
        expect(shellSource).not.toContain('export interface VisitationScheduleModuleProps');
    });

    it('wires split under visitationSchedule/', () => {
        expect(fs.existsSync(PACKAGE_DIR)).toBe(true);
        expect(fs.existsSync(MAIN)).toBe(true);
        for (const name of EXTRACTED_FILES) {
            expect(fs.existsSync(path.join(PACKAGE_DIR, name)), name).toBe(true);
        }
    });

    it('main orchestrator imports extracted modules and stays under post-split budget', () => {
        const main = fs.readFileSync(MAIN, 'utf8');
        expect(main).toContain('export const VisitationScheduleModule');
        expect(main).toContain("from './VisitationLauncherCard'");
        expect(main).toContain("from './VisitationWorkspaceSheet'");
        expect(main).toContain("from './VisitationWorkspaceBody'");
        expect(main).toContain("from './useVisitationScheduleModuleState'");
        expect(lineCount(MAIN)).toBeGreaterThan(20);
        expect(lineCount(MAIN)).toBeLessThan(80);
    });

    it('exports module props from types via package barrel', () => {
        const typesSrc = fs.readFileSync(
            path.join(PACKAGE_DIR, 'visitationScheduleModuleTypes.ts'),
            'utf8',
        );
        const indexSrc = fs.readFileSync(path.join(PACKAGE_DIR, 'index.ts'), 'utf8');
        expect(typesSrc).toContain('export interface VisitationScheduleModuleProps');
        expect(indexSrc).toContain("from './VisitationScheduleModule'");
        expect(indexSrc).toContain("from './visitationScheduleModuleTypes'");
    });

    it('keeps each extracted module under an honest line budget', () => {
        for (const name of EXTRACTED_FILES) {
            const n = lineCount(path.join(PACKAGE_DIR, name));
            expect(n, name).toBeLessThanOrEqual(400);
        }
        expect(lineCount(path.join(PACKAGE_DIR, 'useVisitationScheduleModuleState.ts'))).toBeGreaterThan(
            200,
        );
        expect(lineCount(path.join(PACKAGE_DIR, 'AppointmentBlock.tsx'))).toBeGreaterThan(80);
        expect(lineCount(path.join(PACKAGE_DIR, 'VisitationLauncherCard.tsx'))).toBeGreaterThan(50);
        expect(lineCount(path.join(PACKAGE_DIR, 'VisitationWorkspaceSheet.tsx'))).toBeGreaterThan(70);
    });
});
