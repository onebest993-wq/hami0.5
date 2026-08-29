import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const CREATION_UI = path.resolve(
    __dirname,
    '../../../ExecutionCreationView/components/executionCreationGlassUi.ts',
);
const DASHBOARD_ROOT = path.resolve(__dirname, '../..');

function read(rel: string): string {
    return fs.readFileSync(path.join(DASHBOARD_ROOT, rel), 'utf8');
}

describe('Execution touch-target floors (O7)', () => {
    it('creation glass interactive tokens include min-h-[44px]', () => {
        const src = fs.readFileSync(CREATION_UI, 'utf8');
        for (const token of [
            'sheetClose',
            'choiceBtn',
            'saveBtn',
            'pickerBtn',
            'field:',
            'modalClose',
            'addBtn',
            'modalBtnPrimary',
        ]) {
            expect(src).toContain(token);
        }
        expect(src).toMatch(/sheetClose:[\s\S]*?min-h-\[44px\]/);
        expect(src).toMatch(/choiceBtn:[\s\S]*?min-h-\[44px\]/);
        expect(src).toMatch(/saveBtn:[\s\S]*?min-h-\[44px\]/);
        expect(src).toMatch(/modalClose:[\s\S]*?min-h-\[44px\]/);
        expect(src).toMatch(/addBtn:[\s\S]*?min-h-\[44px\]/);
    });

    it('dashboard header and switcher keep a 44px floor', () => {
        expect(read('components/ExecutionDashboardPhoneBodyHeader.tsx')).toContain('min-h-[44px]');
        expect(read('components/DossierSwitcher.tsx')).toContain('min-h-[44px]');
        expect(read('components/OtherPartyManualRequestBlock.tsx')).toContain('min-h-[44px]');
        expect(read('components/notesTasksModalUi.ts')).toContain('min-h-[44px]');
        expect(read('components/maritalFurniture/maritalFurnitureModuleConstants.ts')).toContain(
            'min-h-[44px]',
        );
    });

    it('does not leave the previous 40px floor on followup controls', () => {
        const files = [
            'components/communicationsTab/CommunicationAwaitingResultCard.tsx',
            'components/CoerciveTabLeadBanners.tsx',
            'components/ExecutionNotesModalHeader.tsx',
            'components/maritalFurniture/buildMaritalFurnitureHeaderActions.ts',
            'components/ExecutionTimelineFilterBar.tsx',
            'components/custodyRemoval/WardDeliveryRow.tsx',
        ];
        for (const file of files) {
            expect(read(file), file).not.toContain('min-h-[40px]');
            expect(read(file), file).toContain('min-h-[44px]');
        }
    });
});
