/**
 * `guard-test-ratchet.mjs --save` لا يحفظ الفَلَتاتِ الموسومة في خطّ الأساس — قرارُ المالك ٢٠٢٦-٠٩-١٤.
 *
 * **العطلُ الذي يمنعه:** خطُّ الأساس للإرث الحتميّ، والفَلَتةُ محكومةٌ بـ`KNOWN_TIMING_FLAKES` وسقفِها
 * في كلّ تشغيلة. وكان `--save` يكتب **كلَّ** ما سقط، فلو وقعت فَلَتةٌ أثناء الحفظ **لنالت سماحاً ثانياً
 * صامتاً بلا سقف**، وبقيت مسموحةً ولو أُزيلت من القائمة — ولأبلغ الحارسُ «now pass» في أغلب التشغيلات.
 *
 * صندوقٌ أسود على السكربت المشحون: `HAMI_TEST_RATCHET_REPORT` و`HAMI_TEST_RATCHET_BASELINE` يُبدّلان
 * المصدرين وحدهما، **ولا يُمسّ خطُّ الأساس الحقيقيّ ولا تُشغَّل المجموعة**.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/guard-test-ratchet.mjs');

/** مفتاحُ فَلَتةٍ موسومة يُقرأ من السكربت نفسه — فلا ينفصل الاختبارُ عن القائمة إن تغيّرت */
const FLAKE_KEY = (() => {
    const source = readFileSync(SCRIPT, 'utf8');
    const block = source.slice(source.indexOf('const KNOWN_TIMING_FLAKES'));
    const match = block.match(/key:\s*'([^']+)'/);
    if (!match) throw new Error('no KNOWN_TIMING_FLAKES key found in guard-test-ratchet.mjs');
    return match[1];
})();
const [FLAKE_FILE, FLAKE_TITLE] = FLAKE_KEY.split(' :: ');

/* مسارُ الساقط الحقيقيّ يُبنى من مقاطع — `guard:source-paths` يُسقط كلَّ مسارٍ مكتوبٍ حرفاً لا وجود له */
const REAL_FILE = ['src', 'fake', 'deterministic.test.ts'].join('/');
const REAL_TITLE = 'suite deterministic legacy failure';
const REAL_KEY = `${REAL_FILE} :: ${REAL_TITLE}`;

let dir = '';

function writeReport(entries: readonly { file: string; name: string }[]): string {
    const path = join(dir, 'report.json');
    writeFileSync(
        path,
        JSON.stringify({
            numTotalTests: 100,
            numFailedTests: entries.length,
            testResults: entries.map((entry) => ({
                name: join(process.cwd(), entry.file),
                assertionResults: [{ status: 'failed', fullName: entry.name, title: entry.name }],
            })),
        }),
        'utf8',
    );
    return path;
}

function runGuard(args: string[], reportPath: string, baselinePath: string): { code: number; out: string } {
    try {
        const out = execFileSync(process.execPath, [SCRIPT, ...args], {
            cwd: process.cwd(),
            encoding: 'utf8',
            env: {
                ...process.env,
                GITHUB_ACTIONS: '',
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

describe('guard-test-ratchet --save — الفَلَتاتُ الموسومة لا تدخل خطَّ الأساس', () => {
    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'hami-ratchet-save-'));
    });

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
        dir = '';
    });

    it('فَلَتةٌ وقعت أثناء الحفظ لا تُحفظ، والساقطُ الحتميّ يُحفظ', () => {
        const baseline = join(dir, 'baseline.json');
        const result = runGuard(
            ['--save'],
            writeReport([
                { file: FLAKE_FILE, name: FLAKE_TITLE },
                { file: REAL_FILE, name: REAL_TITLE },
            ]),
            baseline,
        );

        expect(result.code).toBe(0);
        const saved = JSON.parse(readFileSync(baseline, 'utf8')) as { failures: string[] };
        expect(saved.failures).toEqual([REAL_KEY]);
        expect(saved.failures).not.toContain(FLAKE_KEY);
        expect(result.out).toContain('NOT saved');
    });

    it('وخطُّ الأساس بلا الفَلَتة لا يُسقط البوّابةَ حين تتذبذب — تبقى محكومةً بقائمتها', () => {
        const baseline = join(dir, 'baseline.json');
        runGuard(['--save'], writeReport([{ file: REAL_FILE, name: REAL_TITLE }]), baseline);

        const result = runGuard(
            [],
            writeReport([
                { file: REAL_FILE, name: REAL_TITLE },
                { file: FLAKE_FILE, name: FLAKE_TITLE },
            ]),
            baseline,
        );

        expect(result.code).toBe(0);
        expect(result.out).toContain('known timing-flake');
    });

    it('ضابطة: بلا فَلَتاتٍ لا يُستثنى شيء ولا يُطبع استثناء', () => {
        const baseline = join(dir, 'baseline.json');
        const result = runGuard(['--save'], writeReport([{ file: REAL_FILE, name: REAL_TITLE }]), baseline);

        expect(result.code).toBe(0);
        const saved = JSON.parse(readFileSync(baseline, 'utf8')) as { failures: string[] };
        expect(saved.failures).toEqual([REAL_KEY]);
        expect(result.out).not.toContain('NOT saved');
    });
});
