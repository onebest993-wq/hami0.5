import { describe, expect, it } from 'vitest';
import { CIVIL_LAWSUIT_TEST_IDS } from '../civilLawsuitTestIds';

describe('civilLawsuitTestIds', () => {
    it('exposes stable selectors for E2E', () => {
        expect(CIVIL_LAWSUIT_TEST_IDS.hubLawsuits).toBe('hub-archive-lawsuit');
        expect(CIVIL_LAWSUIT_TEST_IDS.workspace).toBe('lawsuits-workspace');
        expect(CIVIL_LAWSUIT_TEST_IDS.dossier).toBe('smart-file-dossier');
        expect(CIVIL_LAWSUIT_TEST_IDS.lawsuitFile('abc')).toBe('lawsuit-file-abc');
        expect(CIVIL_LAWSUIT_TEST_IDS.lawsuitFilePrefix).toBe('lawsuit-file');
        expect(CIVIL_LAWSUIT_TEST_IDS.lawsuitFileTrash(990001)).toBe('lawsuit-file-990001-trash');
        expect(CIVIL_LAWSUIT_TEST_IDS.lawsuitFileRestore(1)).toBe('lawsuit-file-1-restore');
        expect(CIVIL_LAWSUIT_TEST_IDS.lawsuitFileSelect(2)).toBe('lawsuit-file-2-select');
        expect(CIVIL_LAWSUIT_TEST_IDS.trashSelectAll).toBe('lawsuits-trash-select-all');
        expect(CIVIL_LAWSUIT_TEST_IDS.trashPermanentDelete).toBe('lawsuits-trash-permanent-delete');
        expect(CIVIL_LAWSUIT_TEST_IDS.trashConfirmDialog).toBe('lawsuit-trash-confirm-dialog');
        expect(CIVIL_LAWSUIT_TEST_IDS.permanentDeleteConfirm).toBe(
            'lawsuit-permanent-delete-confirm',
        );
        expect(CIVIL_LAWSUIT_TEST_IDS.taskAdd).toBe('smart-file-task-add');
        expect(CIVIL_LAWSUIT_TEST_IDS.taskModal).toBe('smart-file-task-modal');
        expect(CIVIL_LAWSUIT_TEST_IDS.taskRow('t1')).toBe('smart-file-task-row-t1');
    });
});
