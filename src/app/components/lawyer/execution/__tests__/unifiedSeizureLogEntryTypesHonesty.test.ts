import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EXECUTION = path.resolve(__dirname, '..');
const DASH_UTILS = path.resolve(__dirname, '../../ExecutionDashboard/utils');
const FOOTER = path.resolve(
    __dirname,
    '../../ExecutionDashboard/components/unifiedSeizureLogEntryFooter',
);

const TYPES_FILE = path.join(EXECUTION, 'unifiedSeizureLogEntryTypes.ts');
const MODAL_FILE = path.join(EXECUTION, 'UnifiedSeizureLogModal.tsx');

const BUILDER_FILES = [
    'unifiedSeizureLogEntries.ts',
    'unifiedSeizureLogEntryInternalHelpers.ts',
    'buildUnifiedSeizureLogPropertyEntries.ts',
    'buildUnifiedSeizureLogSalaryEntries.ts',
    'buildUnifiedSeizureLogMovableEntries.ts',
    'buildUnifiedSeizureLogThirdPartyEntries.ts',
    'buildUnifiedSeizureLogGuarantorEntries.ts',
];

const FOOTER_TYPE_FILES = [
    'UnifiedSeizureLogEntryFooterProps.ts',
    'unifiedSeizureLogEntryFooterHelpers.tsx',
    'UnifiedSeizureLogFooterBranchCtx.ts',
];

function countSubstring(src: string, needle: string): number {
    return src.split(needle).length - 1;
}

describe('unifiedSeizureLogEntryTypes cycle honesty', () => {
    it('defines UnifiedSeizureLogEntry in a types-only module', () => {
        expect(fs.existsSync(TYPES_FILE)).toBe(true);
        const src = fs.readFileSync(TYPES_FILE, 'utf8');
        expect(src).toContain('export type UnifiedSeizureLogEntry');
        expect(src).not.toMatch(/from\s+['"].*UnifiedSeizureLogModal/);
        expect(src).not.toMatch(/\b(jsx|tsx)\b/i);
    });

    it('modal re-exports entry types and does not own the canonical definition body', () => {
        const modal = fs.readFileSync(MODAL_FILE, 'utf8');
        expect(modal).toContain('unifiedSeizureLogEntryTypes');
        expect(modal).toMatch(/export type \{\s*UnifiedSeizureLogEntry/);
        expect(modal).not.toMatch(/export type UnifiedSeizureLogEntry\s*=\s*\{/);
    });

    it('builders/utils import entry types from types module, not the modal', () => {
        for (const name of BUILDER_FILES) {
            const src = fs.readFileSync(path.join(DASH_UTILS, name), 'utf8');
            expect(src, name).toContain('unifiedSeizureLogEntryTypes');
            expect(src, name).not.toMatch(
                /import\s+type\s+\{[^}]*UnifiedSeizureLogEntry[^}]*\}\s+from\s+['"][^'"]*UnifiedSeizureLogModal/,
            );
            expect(countSubstring(src, 'UnifiedSeizureLogModal'), name).toBe(0);
        }
    });

    it('footer package imports entry types from types module, not the modal', () => {
        for (const name of FOOTER_TYPE_FILES) {
            const src = fs.readFileSync(path.join(FOOTER, name), 'utf8');
            expect(src, name).toContain('unifiedSeizureLogEntryTypes');
            expect(countSubstring(src, 'UnifiedSeizureLogModal'), name).toBe(0);
        }
    });
});
