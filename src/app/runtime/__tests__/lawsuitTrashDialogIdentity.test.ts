import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('lawsuit archive trash dialog identity', () => {
    it('حوارات دعاوى تستخدم testids خاصة وليست execution-*', () => {
        const lawsuit = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveTrashDialogs.tsx'),
            'utf8',
        );
        expect(lawsuit).toContain('LAWSUIT_VAULT_TEST_IDS.trashConfirmDialog');
        expect(lawsuit).toContain('LAWSUIT_VAULT_TEST_IDS.trashConfirmSubmit');
        expect(lawsuit).toContain('LAWSUIT_VAULT_TEST_IDS.permanentDeleteDialog');
        expect(lawsuit).toContain('LAWSUIT_VAULT_TEST_IDS.permanentDeleteConfirm');
        expect(lawsuit).toContain('titleId="lawsuit-trash-confirm-title"');
        expect(lawsuit).not.toContain('execution-trash-confirm-dialog');
        expect(lawsuit).not.toContain('execution-permanent-delete-dialog');
    });

    it('حوارات التنفيذ تستخدم execution-* testids', () => {
        const execution = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveTrashDialogs.tsx'),
            'utf8',
        );
        expect(execution).toContain('execution-trash-confirm-dialog');
        expect(execution).toContain('execution-trash-confirm-cancel');
        expect(execution).toContain('execution-archive-confirm-cancel');
        expect(execution).toContain('execution-permanent-delete-dialog');
        expect(execution).not.toContain('CIVIL_LAWSUIT_TEST_IDS.trashConfirmDialog');
        expect(execution).toContain('createPortal(');
        expect(execution).toContain('document.body');
        expect(execution).not.toMatch(/if \(embedded\)/);
        expect(execution).toContain('ExecutionArchiveHostOpenContext');
    });
});
