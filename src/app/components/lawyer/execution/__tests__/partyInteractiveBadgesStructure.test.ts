import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHELL_FILE = path.resolve(__dirname, '../ExecutionPartyInteractiveBadges.tsx');
const PACKAGE_DIR = path.resolve(__dirname, '../partyInteractiveBadges');
const MAIN = path.join(PACKAGE_DIR, 'ExecutionPartyInteractiveBadges.tsx');

const shellSource = fs.readFileSync(SHELL_FILE, 'utf8');
const SHELL_LINE_COUNT = shellSource.split(/\r?\n/).length;

function lineCount(file: string): number {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

describe('ExecutionPartyInteractiveBadges Phase 1c structure', () => {
    it('keeps public shell path as thin re-export (import sites stable)', () => {
        expect(fs.existsSync(SHELL_FILE)).toBe(true);
        expect(SHELL_LINE_COUNT).toBeLessThan(25);
        expect(shellSource).toContain("from './partyInteractiveBadges'");
        expect(shellSource).toContain('ExecutionPartyInteractiveBadges');
        expect(shellSource).toContain('buildPartyBadgeDefinitions');
        expect(shellSource).toContain('ExecutionPartyInteractiveBadgesProps');
        expect(shellSource).toContain('TaklifAssignmentBadgeInfo');
        expect(shellSource).not.toContain('export const ExecutionPartyInteractiveBadges');
        expect(shellSource).not.toContain('export function buildPartyBadgeDefinitions');
    });

    it('wires split under partyInteractiveBadges/', () => {
        expect(fs.existsSync(PACKAGE_DIR)).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'index.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'types.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'toneRing.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'badgeSort.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'hiddenBadgeStorage.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'badgeSignalKeys.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'badgeDisplayHelpers.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'buildPartyBadgeDefinitions.ts'))).toBe(true);
        expect(fs.existsSync(path.join(PACKAGE_DIR, 'PartyBadgePopover.tsx'))).toBe(true);
        expect(fs.existsSync(MAIN)).toBe(true);
    });

    it('main implementation lives in package and imports extracted modules', () => {
        const main = fs.readFileSync(MAIN, 'utf8');
        expect(main).toContain('export const ExecutionPartyInteractiveBadges');
        expect(main).toContain("from './buildPartyBadgeDefinitions'");
        expect(main).toContain("from './buildExtraPartyBadgeDefinitions'");
        expect(main).toContain("from './PartyBadgePopover'");
        expect(main).toContain("from './badgeSignalKeys'");
        expect(main).toContain("from './hiddenBadgeStorage'");
        expect(main).toContain("from './toneRing'");
        expect(main).toContain("from './badgeSort'");
        expect(lineCount(MAIN)).toBeGreaterThan(200);
        expect(lineCount(MAIN)).toBeLessThan(700);
        expect(
            lineCount(path.join(PACKAGE_DIR, 'buildExtraPartyBadgeDefinitions.ts')),
        ).toBeLessThan(700);
    });

    it('exports panel props and badge infos from types.ts via package barrel', () => {
        const typesSrc = fs.readFileSync(path.join(PACKAGE_DIR, 'types.ts'), 'utf8');
        const indexSrc = fs.readFileSync(path.join(PACKAGE_DIR, 'index.ts'), 'utf8');
        expect(typesSrc).toContain('export type ExecutionPartyInteractiveBadgesProps');
        expect(typesSrc).toContain('export type TaklifAssignmentBadgeInfo');
        expect(typesSrc).toContain('export type EvictionGraceBadgeInfo');
        expect(indexSrc).toContain("from './ExecutionPartyInteractiveBadges'");
        expect(indexSrc).toContain("from './types'");
        expect(indexSrc).toContain('buildPartyBadgeDefinitions');
    });

    it('keeps each extracted module under the phase-6 line budget', () => {
        const files = fs.readdirSync(PACKAGE_DIR).filter((f) => /\.(ts|tsx)$/.test(f));
        for (const f of files) {
            expect(lineCount(path.join(PACKAGE_DIR, f)), f).toBeLessThanOrEqual(1000);
        }
    });

    it('extraDefs لا يمرّر معرّفات مقشورة غير موجودة في المكوّن', () => {
        const main = fs.readFileSync(MAIN, 'utf8');
        const extra = fs.readFileSync(
            path.join(PACKAGE_DIR, 'buildExtraPartyBadgeDefinitions.ts'),
            'utf8',
        );
        expect(main).not.toContain('onRegularTablighActivate');
        expect(main).not.toContain('onAbsenceActivate');
        expect(main).not.toContain('onGuarantorFollowupActivate');
        expect(main).not.toContain('onOpenGuarantorDetails');
        expect(main).not.toContain('guarantorFollowupAwaitingDetails');
        expect(extra).not.toContain("Props['onRegularTablighActivate']");
        expect(extra).not.toContain("Props['onAbsenceActivate']");
        expect(extra).not.toContain("Props['onGuarantorFollowupActivate']");
        expect(extra).toContain('onDismissPublicationNoticeBadge');
        expect(extra).toContain('onDismissRegularTablighBadge');
        expect(extra).toContain('onCompleteEvictionGrace');
        expect(extra).toContain('onCompletePoliceAssistance');
    });
});
