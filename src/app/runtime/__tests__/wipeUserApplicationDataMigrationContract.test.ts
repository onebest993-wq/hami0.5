/**
 * عقد الهجرة: CREATE OR REPLACE التاريخي مسموح، والمصدر الحي هو آخر ملف فقط.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const FN = 'CREATE OR REPLACE FUNCTION public.wipe_user_application_data';
const LATEST = '20260908000000_wipe_user_data_kv_coverage_gaps.sql';

/** كل جدول تحذف منه نسخةٌ ما من الدالة */
function deletedTables(sql: string): Set<string> {
    return new Set([...sql.matchAll(/DELETE FROM public\.([a-z0-9_]+)/g)].map((m) => m[1]));
}

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

        /*
         * الخطر الحقيقي أن تُكتب نسخة جديدة **جزئية** فتُسقط تغطية غطّتها نسخة
         * أقدم — والدالة `CREATE OR REPLACE` فتحلّ محلّها كاملةً، فيبقى ما
         * أسقطته على الجهاز والسحابة بلا حذف، صامتاً.
         *
         * الصيغة السابقة كانت تثبّت أن `lawyer_work_checkpoints` لا تظهر إلا في
         * الأحدث — لقطةٌ صحيحةٌ لحظةَ كتابتها، لكنها تنكسر حتماً مع أول هجرة
         * تالية (إذ تصير حاملتها «أقدم» وهي تحمل الاسم في عنوانها نفسه)،
         * ولا تفحص الخطر أعلاه أصلاً. هذا الشرط يفحصه مباشرةً: الأحدث يجب أن
         * يكون مجموعةً شاملة لكل جدول حذفت منه أيّ نسخة سابقة.
         */
        const latestTables = deletedTables(latest.sql);
        for (const older of holders.slice(0, -1)) {
            expect(older.f < latest.f).toBe(true);
            for (const table of deletedTables(older.sql)) {
                expect(
                    latestTables.has(table),
                    `العقد الحي ${latest.f} يُسقط تغطية public.${table} التي غطّتها ${older.f}`,
                ).toBe(true);
            }
        }
    });
});
