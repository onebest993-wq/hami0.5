/**
 * أسنان حارس قواعد الالتزام — وبالأخصّ حدُّ `docs(` المضاف حديثاً (§٢·١).
 *
 * القاعدة تُقاس على التاريخ، والتاريخُ لا يُفتعل فيه عطلٌ لاختبارها: فلو انتُظر التزامٌ
 * مخالف لِيُعرف أنّها تعمل، لكانت الحراسةُ مرهونةً بوقوع ما وُضعت لمنعه. فيُبنى هنا
 * **مستودعٌ مؤقّت** بالتزاماتٍ مفصّلة على كلّ حالة، ويُشغَّل عليه **السكربت المشحون نفسه**
 * صندوقاً أسود — فلا ينحرف المُختبَر عن المُشغَّل.
 *
 * وما تُثبته الحالات، وكلٌّ منها عطلٌ محتمل لا زينة:
 *
 *   • `docs(` يلمس `.ts`            → يسقط. وهي المخالفة الوحيدة في ٥٣ التزاماً مقيسة.
 *   • `docs(` يلمس `.audit/*.json`  → يمرّ. بيانُ قياسٍ شرعيّ، وحرفيّةُ «`.md` وحدها» كانت ستُجرّمه.
 *   • `docs(` يلمس `.audit/*.mjs`   → يسقط. الثغرة التي يفتحها إذنٌ بالمجلَّد: ١٠٧ سكربتات هناك.
 *   • `docs(` ينقل ملفّاً (`R100`)   → يسقط بالوجهة لا بالمصدر. وقراءةُ الحقل الثاني من
 *                                     `--name-status` تُسمّي المسار القديم في النقل، فيُحاكَم
 *                                     ما لم يَعُد موجوداً — وهذه الحالة تُثبّت الحقل الأخير.
 *   • `fix(` يلمس `.ts`             → يمرّ. الضابطة: الحدّ على اللافتة لا على الشفرة.
 *   • `fix(` يُعدّل خطّ أساسٍ قائماً   → يسقط (§٢·٥). تُعاد هنا لأنّ تحليل الحقول تغيّر معها.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const GUARD = resolve(process.cwd(), 'scripts/guard-commit-conventions.mjs');

const ZVE = 'Zero Visual Edits = confirmed';

/**
 * جذرُ الشفرة في المستودع المؤقّت — **ولا يُسمّى `src/`**، وذلك مقصود.
 *
 * `guard:source-path-references` يقرأ كلّ سلسلةٍ تبدأ بإحدى ثلاث بادئاتٍ — شجرةُ
 * المصدر أو api أو e2e — وتنتهي بلاحقة شفرة، ويتحقّق أنّها تُحلّ إلى ملفٍّ **في هذا
 * المستودع**. وقد سقط فعلاً على النسخة الأولى من هذا الملفّ، في مسارَي تجهيزٍ اثنين،
 * وكان مُحقّاً: تلك سلاسلُ بناءٍ لشجرةٍ مؤقّتة لا إشاراتٌ إلى شفرةٍ هنا، وتمييزُهما ليس
 * في وسع الحارس.
 *
 * **ثمّ سقط ثانيةً على هذا الشرح نفسه** حين ذُكر المساران بين علامتين — فصيغتُه تقرأ
 * السلاسل المائلة كما تقرأ الحرفية، ولا تعرف تعليقاً من شفرة. فيُوصف الموضع هنا
 * بالكلام لا بالاقتباس.
 *
 * فالحلّ نقلُ التجهيز خارج البادئات الثلاث، **لا توسيعُ استثناءٍ في حارسٍ عامل**.
 * والقاعدةُ المُختبَرة لا تذكر `src/` أصلاً: ما ليس `.md` وليس بياناً تحت `.audit/`
 * أو `perf-reports/` فهو خارج حدّ `docs(` أينما وقع — فالمعنى محفوظ كما هو.
 */
const CODE_DIR = 'lib';

let root = '';
/** الالتزام الأوّل: حقبةُ الفرض، فما بعده وحده يُحاكَم. */
let epoch = '';

function git(args: string[]): string {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function write(rel: string, body: string): void {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body, 'utf8');
}

/**
 * `--no-gpg-sign` هنا خاصٌّ بمستودع الاختبار المؤقّت لا بسياسة المستودع: توقيعٌ
 * ينتظر عبارة مرورٍ يُعلّق العدّاء بلا مخرج.
 */
function commit(subject: string, body = ZVE): string {
    git(['add', '-A']);
    git(['commit', '--no-gpg-sign', '-m', subject, '-m', body]);
    return git(['rev-parse', 'HEAD']).trim();
}

/** يُشغّل الحارس المشحون على المستودع المؤقّت بحقبةٍ معلومة. */
function runGuard(): { code: number; out: string } {
    try {
        const out = execFileSync(process.execPath, [GUARD], {
            cwd: root,
            encoding: 'utf8',
            env: { ...process.env, HAMI_COMMIT_EPOCH: epoch },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { code: 0, out };
    } catch (error) {
        const e = error as { status?: number; stdout?: string; stderr?: string };
        return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
}

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'commit-conv-teeth-'));
    git(['init', '-q']);
    git(['config', 'user.email', 'teeth@example.test']);
    git(['config', 'user.name', 'Teeth Fixture']);
    write('README.md', '# fixture\n');
    epoch = commit('chore(fixture): epoch');
});

afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
});

describe('حدّ docs( — §٢·١', () => {
    it('يسقط حين يلمس docs( ملفّ .ts، ويُسمّي الملفّ', () => {
        write(`${CODE_DIR}/thing.ts`, 'export const x = 1;\n');
        commit('docs(audit): note that also moves code');

        const { code, out } = runGuard();

        expect(code).toBe(1);
        expect(out).toContain(`${CODE_DIR}/thing.ts`);
        expect(out).toContain('§٢·١');
    });

    it('يمرّ حين يلمس docs( بيانَ قياسٍ تحت .audit/ — وهي الحالة الشرعية المقيسة', () => {
        write('.audit/E2E_FULL_RUN.json', '{"passed":12}\n');
        write('.audit/NOTE.md', 'measured\n');
        commit('docs(audit): record the measured run');

        const { code, out } = runGuard();

        expect(out).not.toContain('E2E_FULL_RUN.json');
        expect(code).toBe(0);
    });

    it('يسقط حين يلمس docs( سكربتاً قابلاً للتنفيذ تحت .audit/ — لا إذنَ بالمجلَّد', () => {
        write('.audit/_probe_something.mjs', 'console.log(1);\n');
        commit('docs(audit): ship a tool under a documentation label');

        const { code, out } = runGuard();

        expect(code).toBe(1);
        expect(out).toContain('.audit/_probe_something.mjs');
    });

    it('يمرّ حين يقتصر docs( على ملفّات .md', () => {
        write('docs/one.md', 'a\n');
        write('.audit/two.md', 'b\n');
        commit('docs(audit): documentation only');

        expect(runGuard().code).toBe(0);
    });

    it('يحاكم وجهةَ النقل لا مصدرَه — ملفّ يُنقل من .audit/ إلى شجرة الشفرة يسقط', () => {
        write('.audit/movable.ts', 'export const y = 2;\n');
        commit('chore(fixture): seed a file to move');

        mkdirSync(join(root, CODE_DIR), { recursive: true });
        git(['mv', '.audit/movable.ts', `${CODE_DIR}/movable.ts`]);
        commit('docs(audit): a layer move wearing a docs label');

        const { code, out } = runGuard();

        expect(code).toBe(1);
        /* الوجهة تُسمّى، لا المصدر — وهو الفرق الذي يُسقطه تحليلُ الحقل الثاني */
        expect(out).toContain(`${CODE_DIR}/movable.ts`);
        expect(out).not.toContain('.audit/movable.ts');
    });

    it('لا يمسّ الحدُّ بادئةً أخرى — fix( على .ts يمرّ', () => {
        write(`${CODE_DIR}/thing.ts`, 'export const x = 1;\n');
        commit('fix(app): a real code change');

        expect(runGuard().code).toBe(0);
    });
});

describe('ترميزُ الرسالة — §٢ وحادثتان وقعتا', () => {
    /**
     * يُعيد إنتاج الفساد بالآلية نفسها التي أنتجته: بايتات UTF-8 تُقرأ أحاديّةَ
     * البايت (كما يفعل `Get-Content -Raw` في PowerShell 5.1) ثمّ تُرمَّز UTF-8 ثانيةً.
     */
    const doubleEncode = (text: string): string => Buffer.from(text, 'utf8').toString('latin1');

    it('يسقط على ترميزٍ مزدوج في الجسد حتى والبادئةُ سليمة — فالقاعدة تعمل وحدها', () => {
        write('a.md', 'a\n');
        commit('fix(app): a perfectly valid subject', `${ZVE}\n\n${doubleEncode('نصٌّ عربيّ فاسد')}`);

        const { code, out } = runGuard();

        expect(code).toBe(1);
        expect(out).toContain('U+00');
        /* ولا يُتّهم البريء: البادئة وعبارة التجميد سليمتان فلا تُذكران */
        expect(out).not.toContain('بادئة غير مسموحة');
    });

    it('يسقط على علامة الترتيب U+FEFF ويُسمّيها — وهي التي كسرت بادئةً من قبل', () => {
        write('b.md', 'b\n');
        commit('﻿docs(audit): a subject preceded by a byte-order mark');

        const { code, out } = runGuard();

        expect(code).toBe(1);
        expect(out).toContain('U+FEFF');
    });

    it('يمرّ على رسالةٍ عربيةٍ سليمة — الضابطة التي تمنع القاعدة من تجريم العربية', () => {
        write('c.md', 'c\n');
        commit('fix(app): إصلاحٌ عربيٌّ سليمُ الترميز', `${ZVE}\n\nجسدٌ عربيٌّ فيه تشكيلٌ وعلاماتُ ترقيم — «مثلاً».`);

        expect(runGuard().code).toBe(0);
    });
});

describe('قواعد لم تتغيّر — تُعاد لأنّ تحليل الحقول تغيّر تحتها', () => {
    it('يسقط تعديلُ خطّ أساسٍ قائم بلا بادئة baseline( — §٢·٥', () => {
        write('.audit/tsc-ratchet-baseline.json', '{"max":10}\n');
        commit('chore(fixture): seed a baseline');

        write('.audit/tsc-ratchet-baseline.json', '{"max":11}\n');
        commit('fix(app): quietly raise the baseline');

        const { code, out } = runGuard();

        expect(code).toBe(1);
        expect(out).toContain('.audit/tsc-ratchet-baseline.json');
    });

    it('تسقط بادئةٌ خارج الستّ، وتسقط رسالةٌ بلا عبارة التجميد البصري', () => {
        write('a.md', 'a\n');
        commit('perf(app): outside the six', 'no freeze phrase here');

        const { code, out } = runGuard();

        expect(code).toBe(1);
        expect(out).toContain('بادئة غير مسموحة');
        expect(out).toContain(ZVE);
    });
});
