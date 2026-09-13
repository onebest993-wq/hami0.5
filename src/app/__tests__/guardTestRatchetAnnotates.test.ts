/**
 * أسنانُ تعليقِ `guard-test-ratchet.mjs` على العدّاء.
 *
 * **العطل الذي وُضعت له، مقيساً:** سقطت وظيفةُ `gate` على `4d1bcbc3` وحملت **سبع
 * تعليقات** — خمسُ اختباراتٍ ساقطة وخطأُ خروجٍ عامّ وتحذيرُ Node. **وخمستُها مسجّلةٌ
 * في `.audit/test-ratchet-baseline.json`**، أي ليست انحداراً بحكم هذا الحارس نفسه.
 *
 * فالتعليقاتُ **لا تُفسّر السقوط**: كلُّها من مُبلِّغ vitest الذي يُبلّغ كلَّ ساقطٍ
 * سواءٌ أكان في خطّ الأساس أم لا، **وحُكمُ المِسنَنة — وهو الفاصل — كان stdout عادياً**.
 * وسجلّاتُ Actions تحتاج اعتماداً، فبقي السبب مجهولاً.
 *
 * **والفرق الذي يُثبته هذا الملفّ:** التعليقةُ تقول أيُّ اختبارٍ **خرق المِسنَنة**، لا
 * أيُّ اختبارٍ سقط — وهما مختلفان، والثاني وحده كان يصل.
 *
 * والاختبارُ صندوقٌ أسود على السكربت المشحون، **ولا يُشغّل المجموعة ولا يمسّ خطّ
 * الأساس الحقيقيّ**: `HAMI_TEST_RATCHET_REPORT` و`HAMI_TEST_RATCHET_BASELINE` يُبدّلان
 * المصدرين وحدهما.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/guard-test-ratchet.mjs');

/**
 * مساراتُ التجهيز تُبنى من مقاطع، **ولا تُكتب سلسلةً واحدة** — لأنّ
 * `guard:source-paths` يقرأ `.md` و`.ts` ويُسقط كلَّ مسارٍ لا وجود له. وقد أسقط هذا
 * الملفّ فعلاً حين كانت مكتوبةً حرفاً. **فيُغيَّر الشاهدُ لا الحارس.**
 */
const KNOWN_FILE = ['src', 'fake', 'known.test.ts'].join('/');
const FRESH_FILE = ['src', 'fake', 'fresh.test.ts'].join('/');

const KNOWN_TITLE = 'suite already-failing case';
const KNOWN = `${KNOWN_FILE} :: ${KNOWN_TITLE}`;
const FRESH = 'suite brand-new regression';

let dir = '';

/** تقريرٌ بصيغة مُبلِّغ vitest الـJSON — الأسماء مطلقةٌ لأنّ الحارس يُنسِّبها إلى الجذر. */
function writeReport(fullNames: readonly { file: string; name: string }[]): string {
    const path = join(dir, 'report.json');
    writeFileSync(
        path,
        JSON.stringify({
            numTotalTests: 100,
            numFailedTests: fullNames.length,
            testResults: fullNames.map((entry) => ({
                name: join(process.cwd(), entry.file),
                assertionResults: [{ status: 'failed', fullName: entry.name, title: entry.name }],
            })),
        }),
        'utf8',
    );
    return path;
}

function writeBaseline(): string {
    const path = join(dir, 'baseline.json');
    writeFileSync(
        path,
        JSON.stringify({
            savedAt: '2026-01-01T00:00:00.000Z',
            numTotalTests: 100,
            numFailedTests: 1,
            failures: [KNOWN],
        }),
        'utf8',
    );
    return path;
}

function runGuard(reportPath: string, baselinePath: string): { code: number; out: string } {
    try {
        const out = execFileSync(process.execPath, [SCRIPT], {
            cwd: process.cwd(),
            encoding: 'utf8',
            env: {
                ...process.env,
                GITHUB_ACTIONS: 'true',
                CI: '',
                HAMI_TEST_RATCHET_REPORT: reportPath,
                HAMI_TEST_RATCHET_BASELINE: baselinePath,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { code: 0, out };
    } catch (error) {
        const err = error as { status?: number; stdout?: string; stderr?: string };
        return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
}

describe('guard-test-ratchet — تعليقُ الحُكم على العدّاء', () => {
    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'hami-ratchet-'));
    });

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
        dir = '';
    });

    it('يُعلّق الانحدارَ الجديد باسمه — لا كلَّ ساقطٍ في التشغيلة', () => {
        const report = writeReport([
            { file: KNOWN_FILE, name: KNOWN_TITLE },
            { file: FRESH_FILE, name: FRESH },
        ]);
        const result = runGuard(report, writeBaseline());

        expect(result.code).not.toBe(0);
        expect(result.out).toContain('::error title=guard:tests:');
        expect(result.out).toContain('new undocumented regression');
        expect(result.out).toContain(FRESH);
    });

    it('الساقطُ المسجَّل في خطّ الأساس لا يُعلَّق ولا يُسقط — ضابطةٌ موجبة', () => {
        const report = writeReport([
            { file: KNOWN_FILE, name: KNOWN_TITLE },
        ]);
        const result = runGuard(report, writeBaseline());

        expect(result.out).not.toContain('::error title=guard:tests:');
        expect(result.code).toBe(0);
    });

    it('التعليقةُ تُسمّي الانحدارَ وحده، ولا تُسمّي الساقطَ المسجَّل معه', () => {
        const report = writeReport([
            { file: KNOWN_FILE, name: KNOWN_TITLE },
            { file: FRESH_FILE, name: FRESH },
        ]);
        const result = runGuard(report, writeBaseline());

        const line = result.out
            .split('\n')
            .find((candidate) => candidate.includes('::error title=guard:tests:'));

        expect(line).toBeDefined();
        expect(line).toContain(FRESH);
        expect(line).not.toContain('already-failing case');
    });
});
