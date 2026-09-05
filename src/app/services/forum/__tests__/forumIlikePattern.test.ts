import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    forumIlikeContainsPattern,
    forumIlikeRawContainsPattern,
    isMissingSearchTextColumn,
} from '@/app/services/forum/forumIlikePattern';

const MIGRATION = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260830120000_forum_search_text.sql'),
    'utf8',
);

/** يستخرج خريطة translate من الهجرة نفسها حتى ينكسر الاختبار عند انحراف SQL. */
function readTranslateMapFromMigration(): { from: string; to: string } {
    const match = MIGRATION.match(/coalesce\(input, ''\),\s*'([^']+)',\s*'([^']+)'/);
    if (!match) throw new Error('تعذّر قراءة خريطة translate من الهجرة');
    return { from: match[1]!, to: match[2]! };
}

function readDiacriticClassFromMigration(): string {
    const match = MIGRATION.match(/'\[([^\]]+)\]',\s*'',\s*'g'/);
    if (!match) throw new Error('تعذّر قراءة صنف التشكيل من الهجرة');
    return match[1]!;
}

const TRANSLATE_MAP = readTranslateMapFromMigration();
const DIACRITICS = new RegExp(`[${readDiacriticClassFromMigration()}]`, 'g');

/** محاكاة public.forum_search_fold — العمود المولَّد الذي يُطابقه ILIKE. */
function sqlFold(input: string): string {
    const translated = [...input]
        .map((ch) => {
            const idx = TRANSLATE_MAP.from.indexOf(ch);
            return idx >= 0 ? TRANSLATE_MAP.to[idx]! : ch;
        })
        .join('');
    return translated
        .toLowerCase()
        .replace(DIACRITICS, '')
        .replace(/\s*\/\s*/g, '/')
        .replace(/\s+/g, ' ')
        .trim();
}

function patternBody(pattern: string | null): string {
    if (!pattern) throw new Error('نمط فارغ');
    return pattern.slice(1, -1);
}

describe('forumIlikeContainsPattern ضد العمود المطبّع', () => {
    // هذه الكلمات كانت تفشل حين كان الاستعلام يُطبَّع والعمود خام.
    const cases: Array<{ stored: string; query: string }> = [
        { stored: 'دعوى قضية مدنية أمام المحكمة', query: 'قضية' },
        { stored: 'قرار المحكمة الاتحادية', query: 'محكمة' },
        { stored: 'إجراءات التنفيذ الجبري', query: 'إجراءات' },
        { stored: 'دعوى تمييزية', query: 'دعوى' },
        { stored: 'عريضة إيجار', query: 'إيجار' },
        { stored: 'مُحَكَّمة بالتشكيل', query: 'محكمة' },
        { stored: 'الدعوى رقم ٤٥ / ٢٠٢٦', query: '45/2026' },
    ];

    for (const { stored, query } of cases) {
        it(`«${query}» يجد «${stored}»`, () => {
            expect(sqlFold(stored)).toContain(patternBody(forumIlikeContainsPattern(query)));
        });
    }

    it('النمط الخام بلا طيّ يفشل مع التاء المربوطة — سبب وجود العمود المطبّع', () => {
        const raw = patternBody(forumIlikeRawContainsPattern('قضية'));
        expect('دعوى قضية مدنية').toContain(raw);
        expect(sqlFold('دعوى قضية مدنية')).not.toContain(raw);
    });

    it('يحيّد محارف ILIKE الخاصة', () => {
        expect(forumIlikeContainsPattern('عقد%_')).toBe('%عقد%');
        expect(forumIlikeContainsPattern('   ')).toBeNull();
        expect(forumIlikeContainsPattern('')).toBeNull();
    });

    it('يميّز خطأ العمود المفقود عن غيره', () => {
        expect(isMissingSearchTextColumn('column forum_posts.search_text does not exist')).toBe(true);
        expect(isMissingSearchTextColumn("Could not find the 'search_text' column in the schema cache")).toBe(
            true,
        );
        expect(isMissingSearchTextColumn('permission denied for table forum_posts')).toBe(false);
        expect(isMissingSearchTextColumn(null)).toBe(false);
    });
});
