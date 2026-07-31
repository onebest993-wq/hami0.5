import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAIN_FILE = path.resolve(__dirname, '../CriminalPartiesGrid.tsx');
const SPLIT_DIR = path.resolve(__dirname, '../CriminalPartiesGrid');

const mainFileSource = fs.readFileSync(MAIN_FILE, 'utf8');
const MAIN_FILE_LINE_COUNT = mainFileSource.split('\n').length;

const EXTRACTED_MODULES: Array<{ file: string; marker: string }> = [
    { file: 'shared.ts', marker: "export const DEFENDANT_STATUS_MENU_TITLE = 'تغيير حالة المتهم القانونية';" },
    { file: 'PartyBadges.tsx', marker: 'export function OfficeClientBadge' },
    { file: 'PartySeizedAssetsDisclosure.tsx', marker: 'export function PartySeizedAssetsDisclosure' },
    { file: 'UnknownDefendantRevealCard.tsx', marker: 'export function UnknownDefendantRevealCard' },
    { file: 'ComplainantColumn.tsx', marker: 'export function ComplainantColumn' },
    { file: 'DefendantColumn.tsx', marker: 'export function DefendantColumn' },
    { file: 'PartyProfileModal.tsx', marker: 'export function PartyProfileModal' },
];

describe('CriminalPartiesGrid split — module extraction', () => {
    it.each(EXTRACTED_MODULES)('$file exists and owns its distinctive marker', ({ file, marker }) => {
        const filePath = path.join(SPLIT_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
        const source = fs.readFileSync(filePath, 'utf8');
        expect(source).toContain(marker);
    });

    it('main CriminalPartiesGrid.tsx imports the extracted column/modal components', () => {
        expect(mainFileSource).toContain(
            "import { ComplainantColumn } from './CriminalPartiesGrid/ComplainantColumn';",
        );
        expect(mainFileSource).toContain(
            "import { DefendantColumn } from './CriminalPartiesGrid/DefendantColumn';",
        );
        expect(mainFileSource).toContain(
            "import { PartyProfileModal } from './CriminalPartiesGrid/PartyProfileModal';",
        );
    });

    it('main CriminalPartiesGrid.tsx renders the extracted column/modal components', () => {
        expect(mainFileSource).toContain('<ComplainantColumn');
        expect(mainFileSource).toContain('<DefendantColumn');
        expect(mainFileSource).toContain('<PartyProfileModal');
    });

    it('main CriminalPartiesGrid.tsx no longer contains the extracted JSX/markers', () => {
        expect(mainFileSource).not.toContain('OfficeClientBadge');
        expect(mainFileSource).not.toContain('SeizedAssetsInlineMark');
        expect(mainFileSource).not.toContain('DropdownMenu');
        expect(mainFileSource).not.toMatch(/function UnknownDefendantRevealCard/);
        expect(mainFileSource).not.toMatch(/function PartySeizedAssetsDisclosure/);
    });

    it('still exports a stable CriminalPartiesGrid component', () => {
        expect(mainFileSource).toContain('export const CriminalPartiesGrid = (');
        expect(mainFileSource).toContain('export type CriminalPartiesGridProps');
    });
});

describe('CriminalPartiesGrid split — size budget', () => {
    it('main CriminalPartiesGrid.tsx stays at or under the 1000-line budget after extraction', () => {
        expect(MAIN_FILE_LINE_COUNT).toBeLessThanOrEqual(1000);
    });
});
