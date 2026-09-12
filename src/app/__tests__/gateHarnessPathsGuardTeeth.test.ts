/**
 * أسنان حارس عُدّة البوّابات.
 *
 * شُحن هذا الحارس موصوفاً بأنّه «مُختبَرٌ سلباً»، وكان ذلك صحيحاً في حالتين فقط —
 * الحالتين اللتين وُضع لهما. ومراجعةٌ مستقلّة (F3) وجدته **يمرّ كاذباً في أربع صيغٍ
 * صالحة في YAML تفهمها Actions**: الاقتباس المزدوج · بلا اقتباس · `run: |` · وغيابُ
 * خطوة `playwright install`. وجذرُها واحد: محلّلٌ سطريّ يُنتج قائمةً فارغة حين لا يفهم،
 * ومنطقٌ يُخطّي الفارغة — **فيتحوّل كلّ فشلِ تحليلٍ إلى أخضر**.
 *
 * الاختبار صندوقٌ أسود عمداً: يُشغّل السكربت المشحون نفسه على شجرةٍ مؤقّتة، فلا ينحرف
 * المُختبَر عن المُشغَّل ولا يُثبت خاصّيةً غير التي تُشحن.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const GUARD = resolve(process.cwd(), 'scripts/guard-gate-harness-paths.mjs');

let root = '';

function write(rel: string, body: string): void {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body, 'utf8');
}

/** يُشغّل الحارس على الشجرة المؤقّتة ويعيد رمز الخروج ونصّ الشكوى. */
function runGuard(): { code: number; out: string } {
    try {
        const out = execFileSync(process.execPath, [GUARD], {
            cwd: root,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { code: 0, out };
    } catch (error) {
        const e = error as { status?: number; stdout?: string; stderr?: string };
        return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
}

/** سير عملٍ بمرشّحٍ يُكتب بصيغة الاقتباس المطلوبة — ويُغفل `scripts/dep.mjs` عمداً. */
function workflowWithPaths(render: (item: string) => string): string {
    const items = ['.github/workflows/**', 'scripts/entry.mjs'];
    const block = items.map((i) => `      - ${render(i)}`).join('\n');
    return [
        'name: Sample Gate',
        'on:',
        '  push:',
        '    paths:',
        block,
        '  pull_request:',
        '    paths:',
        block,
        'jobs:',
        '  gate:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - run: node scripts/entry.mjs',
        '',
    ].join('\n');
}

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'harness-teeth-'));
    write('package.json', JSON.stringify({ name: 'fixture', scripts: {} }));
    // مُدخلٌ حقيقيّ يعتمد على ملفٍّ لا يذكره أيّ مرشّح — فالحارس يجب أن يراه.
    write('scripts/entry.mjs', `import './dep.mjs';\n`);
    write('scripts/dep.mjs', `export const x = 1;\n`);
});

afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = '';
});

describe('guard-gate-harness-paths — الأسنان في الصيغ التي كان يُخدع بها', () => {
    /*
     * صيغةٌ خامسة انكشفت أثناء بناء هذا الاختبار ولم تكن في قائمة المراجعة: خطوةٌ
     * بلا اسم `- run: …`. كان المحلّل يشترط `^\s*run:` فلا يرى الأمر أصلاً، فيصير
     * سير العمل بلا مُدخلاتٍ البتّة — وهو أوسع الثقوب لا أضيقها.
     */
    it('خطوة `- run:` بلا اسم (اقتباسٌ مفرد) ومُدخلٌ غير مغطّى ⇒ يسقط باسم الملفّ', () => {
        write('.github/workflows/sample.yml', workflowWithPaths((i) => `'${i}'`));
        const { code, out } = runGuard();
        expect(code).toBe(1);
        expect(out).toContain('scripts/dep.mjs');
    });

    it('اقتباسٌ مزدوج — كان يُقرأ صفراً فتُخطّى البوّابة كلّها', () => {
        write('.github/workflows/sample.yml', workflowWithPaths((i) => `"${i}"`));
        const { code, out } = runGuard();
        expect(code).toBe(1);
        expect(out).toContain('scripts/dep.mjs');
    });

    it('بلا اقتباس — كذلك', () => {
        write('.github/workflows/sample.yml', workflowWithPaths((i) => i));
        const { code, out } = runGuard();
        expect(code).toBe(1);
        expect(out).toContain('scripts/dep.mjs');
    });

    it('`run: |` متعدّد الأسطر — كانت أوامره تختفي فيصير سير العمل بلا مُدخلات', () => {
        write(
            '.github/workflows/sample.yml',
            [
                'name: Block Scalar Gate',
                'on:',
                '  push:',
                '    paths:',
                "      - '.github/workflows/**'",
                '  pull_request:',
                '    paths:',
                "      - '.github/workflows/**'",
                'jobs:',
                '  gate:',
                '    runs-on: ubuntu-latest',
                '    steps:',
                '      - run: |',
                '          echo warming up',
                '          node scripts/entry.mjs',
                '',
            ].join('\n'),
        );
        const { code, out } = runGuard();
        expect(code).toBe(1);
        expect(out).toContain('scripts/entry.mjs');
    });

    it('بلا خطوة playwright install — العُدّة تُكتشف من إغلاق السكربتات لا من نصّ الخطوة', () => {
        write('playwright.config.ts', 'export default {};\n');
        write('e2e/globalSetup.ts', 'export default async () => {};\n');
        write('scripts/entry.mjs', `import { spawnSync } from 'node:child_process';\nspawnSync('npx', ['playwright', 'test']);\n`);
        write(
            '.github/workflows/sample.yml',
            [
                'name: Silent Playwright Gate',
                'on:',
                '  push:',
                '    paths:',
                "      - '.github/workflows/**'",
                "      - 'scripts/entry.mjs'",
                '  pull_request:',
                '    paths:',
                "      - '.github/workflows/**'",
                "      - 'scripts/entry.mjs'",
                'jobs:',
                '  gate:',
                '    runs-on: ubuntu-latest',
                '    steps:',
                '      - run: node scripts/entry.mjs',
                '',
            ].join('\n'),
        );
        const { code, out } = runGuard();
        expect(code).toBe(1);
        expect(out).toContain('playwright.config.ts');
    });

    it('تسلسلٌ انسيابيّ لا يفهمه المحلّل ⇒ يسقط، ولا يُخطّى بصمت', () => {
        write(
            '.github/workflows/sample.yml',
            [
                'name: Flow Seq Gate',
                'on:',
                '  push:',
                "    paths: ['.github/workflows/**', 'scripts/entry.mjs']",
                '  pull_request:',
                "    paths: ['.github/workflows/**', 'scripts/entry.mjs']",
                'jobs:',
                '  gate:',
                '    runs-on: ubuntu-latest',
                '    steps:',
                '      - run: node scripts/entry.mjs',
                '',
            ].join('\n'),
        );
        const { code, out } = runGuard();
        expect(code).toBe(1);
        expect(out).toContain('لم يُقرأ منها مُدخلٌ واحد');
    });

    it('مرشّحٌ يغطّي كلّ المُدخلات ⇒ يمرّ — فالسقوط ليس عادته', () => {
        write(
            '.github/workflows/sample.yml',
            [
                'name: Covered Gate',
                'on:',
                '  push:',
                '    paths:',
                "      - '.github/workflows/**'",
                "      - 'scripts/**'",
                '  pull_request:',
                '    paths:',
                "      - '.github/workflows/**'",
                "      - 'scripts/**'",
                'jobs:',
                '  gate:',
                '    runs-on: ubuntu-latest',
                '    steps:',
                '      - run: node scripts/entry.mjs',
                '',
            ].join('\n'),
        );
        const { code } = runGuard();
        expect(code).toBe(0);
    });
});
