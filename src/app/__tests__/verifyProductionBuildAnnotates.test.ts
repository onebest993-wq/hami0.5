/**
 * أسنانُ التعليق في `verify-production-build.mjs`.
 *
 * **العطل الذي وُضعت له، مقيساً:** تشغيلة `#46` (`4d1bcbc3`) سقطت في الخطوة ٣٩ بعد
 * **٢٨ ثانية** — زمنِ البناء وحده — **وبلا تعليقةٍ واحدة تقول لماذا**. وسجلّات Actions
 * تحتاج اعتماداً، فبقي السببُ مجهولاً.
 *
 * والعلّة أنّ `annotate()` كانت موصولةً بالمستهلكين الستّة فحسب، **ومسارا الفشل
 * قبلهم** — سقوطُ البناء ودورانُ الحزم — يخرجان صامتَين. أي أنّ الادّعاء «سقوطُ هذه
 * الخطوة مقروءٌ بلا اعتماد» كان صحيحاً في ستّة مسارات من ثمانية، **والفجوة في المسار
 * الذي وقع فعلاً**.
 *
 * والاختبار صندوقٌ أسود: يُشغّل السكربت المشحون نفسه ويُبدّل **أمر البناء وحده** عبر
 * `HAMI_VERIFY_BUILD_CMD`، فلا يُعطَب بناءٌ حقيقيّ ولا يُنتظر. ولكلّ مسارٍ ضابطةٌ
 * تشترط أن **تُطلق تعليقتُه هو لا تعليقةُ أخيه** — وإلّا لكفى أن يُعلّق السكربت أيّ
 * شيءٍ ليمرّ الاختبار.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/verify-production-build.mjs');

const BUILD_TITLE = '::error title=verify-production-build: build';
const CIRCULAR_TITLE = '::error title=verify-production-build: circular-chunks';

let dir = '';

/**
 * يُكتب بديلُ البناء ملفّاً ويُمرَّر **مصفوفةَ argv** — لا سلسلةَ غلاف. قِيس: تمريرُ
 * `node "<مسار فيه فراغ>"` عبر `cmd /d /s /c` يصل مقطوعاً عند أوّل فراغ، ومسارُ هذا
 * الجهاز فيه فراغ. **فالمصفوفة تتجاوز الاقتباس كلَّه.**
 */
function overrideWith(body: string): string {
    const file = join(dir, 'fake-build.mjs');
    writeFileSync(file, body, 'utf8');
    return JSON.stringify([process.execPath, file]);
}

function runScript(buildArgv: string): { code: number; out: string } {
    try {
        const out = execFileSync(process.execPath, [SCRIPT], {
            encoding: 'utf8',
            env: { ...process.env, HAMI_VERIFY_BUILD_ARGV: buildArgv },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { code: 0, out };
    } catch (error) {
        const e = error as { status?: number; stdout?: string; stderr?: string };
        return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
}

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'verify-build-teeth-'));
});

afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('verify-production-build: كلُّ مسارِ سقوطٍ يُعلِّق سببه', () => {
    it('يُعلِّق حين يسقط البناء نفسه — وهو مسارُ تشغيلة #46', () => {
        const { code, out } = runScript(
            overrideWith("console.error('ERROR: synthetic build failure');\nprocess.exit(3);\n"),
        );

        expect(code).not.toBe(0);
        expect(out).toContain(BUILD_TITLE);
        expect(out).toContain('synthetic build failure');
        /* الضابطة: تعليقتُه هو لا تعليقةُ الدوران */
        expect(out).not.toContain(CIRCULAR_TITLE);
    });

    it('يُعلِّق حين يكتشف حزماً دائرية — وبناؤه ناجح', () => {
        const { code, out } = runScript(
            overrideWith("console.log('Circular chunk: alpha -> beta -> alpha');\n"),
        );

        expect(code).toBe(1);
        expect(out).toContain(CIRCULAR_TITLE);
        expect(out).toContain('Circular chunk');
        /* الضابطة: البناء نجح، فلا تُطلق تعليقةُ البناء */
        expect(out).not.toContain(BUILD_TITLE);
    });
});
