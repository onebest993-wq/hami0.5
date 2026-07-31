import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('lawsuit archive trash dialog identity', () => {
    it('حوارات دعاوى تستخدم testids خاصة وليست execution-*', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/ArchivePortalTrashDialogs.tsx'),
            'utf8',
        );
        expect(src).toContain('CIVIL_LAWSUIT_TEST_IDS.trashConfirmDialog');
        expect(src).toContain('CIVIL_LAWSUIT_TEST_IDS.trashConfirmSubmit');
        expect(src).toContain('CIVIL_LAWSUIT_TEST_IDS.permanentDeleteDialog');
        expect(src).toContain('CIVIL_LAWSUIT_TEST_IDS.permanentDeleteConfirm');
        expect(src).toContain('titleId="lawsuit-trash-confirm-title"');
        // مسار التنفيذ يبقى بـ execution-* عند type=executions
        expect(src).toContain('execution-trash-confirm-dialog');
        expect(src).toContain('execution-permanent-delete-dialog');
    });
});
