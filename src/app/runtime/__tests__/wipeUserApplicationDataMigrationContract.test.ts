/**
 * عقد الهجرة: CREATE OR REPLACE التاريخي مسموح، والمصدر الحي هو آخر ملف فقط.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const FN = 'CREATE OR REPLACE FUNCTION public.wipe_user_application_data';
const LATEST =
    '20260829130636_wipe_user_application_data_work_checkpoints.sql';

describe('wipe_user_application_data migration contract', () => {
    it('آخر هجرة هي العقد الحي وتحذف نقاط العمل؛ النسخ الأقدم تاريخ فقط', () => {
        const dir = join(root, 'supabase/migrations');
        const holders = readdirSync(dir)
            .filter((f) => f.endsWith('.sql'))
            .map((f) => ({ f, sql: readFileSync(join(dir, f), 'utf8') }))
            .filter((row) => row.sql.includes(FN))
            .sort((a, b) => a.f.localeCompare(b.f));

        expect(holders.length).toBeGreaterThanOrEqual(2);
        const latest = holders[holders.length - 1];
        expect(latest.f).toBe(LATEST);
        expect(latest.sql).toContain("IF to_regclass('public.lawyer_work_checkpoints') IS NOT NULL");
        expect(latest.sql).toContain('DELETE FROM public.lawyer_work_checkpoints WHERE user_id = p_user_id');

        for (const older of holders.slice(0, -1)) {
            expect(older.f < latest.f).toBe(true);
            expect(older.sql).not.toContain('lawyer_work_checkpoints');
        }
    });
});
