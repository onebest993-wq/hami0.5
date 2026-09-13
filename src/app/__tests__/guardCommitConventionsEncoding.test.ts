/**
 * أسنانُ فحص الترميز في `guard-commit-conventions.mjs` — **وفحصُ الحارس لنفسه**.
 *
 * **العطل الذي وُضعت له، مقيساً:** كان صنفُ المحارف الممنوعة مكتوباً بمحارفِ تحكّمٍ
 * **حقيقيّة** في المصدر — سبعةُ بايتات عند الإزاحات 7921 و8229-8236. فصار ملفُّ الحارس
 * **ثنائياً عند git** (`Bin … bytes`، لا فرقَ يُقرأ في مراجعة)، وأيُّ أداةٍ تُنظّف النصّ
 * تُفرغ الصنفَ **بلا أن يحمرّ شيء**.
 *
 * **أي أنّ الحارس الذي يمنع بايتات التحكّم كان يحملها في مصدره، ولم يكن يفحص نفسه.**
 * وأمسكه `rg` عَرَضاً («binary file matches»)، لا اختبارٌ ولا بوّابة.
 *
 * والاختبارات الثلاثة صندوقٌ أسود: يُشغَّل السكربتُ المشحون نفسه على **مستودعٍ مؤقّت**
 * (يرث `cwd`، و`HAMI_COMMIT_EPOCH` يحدّ المدى)، ومعه **ضابطةٌ موجبة** تشترط ألّا يُمسك
 * النصَّ العاديّ — وإلّا لكفى أن يسقط الحارسُ دائماً ليمرّ الاختبار.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/guard-commit-conventions.mjs');

/** BEL — يُبنى بنقطته لا يُكتب محرفاً، وهو الدرسُ نفسه الذي أنتج هذا الاختبار. */
const BEL = String.fromCharCode(7);

const VALID_BODY = 'Zero Visual Edits = confirmed';

let dir = '';

function run(args: string[], cwd: string): string {
    return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function makeRepo(): string {
    const repo = mkdtempSync(join(tmpdir(), 'hami-commit-guard-'));
    run(['init', '--quiet'], repo);
    run(['config', 'user.email', 'test@example.invalid'], repo);
    run(['config', 'user.name', 'gate test'], repo);
    run(['config', 'commit.gpgsign', 'false'], repo);
    writeFileSync(join(repo, 'seed.md'), 'seed\n', 'utf8');
    run(['add', 'seed.md'], repo);
    run(['commit', '--quiet', '-m', `docs(seed): base\n\n${VALID_BODY}`], repo);
    return repo;
}

/** يُنشئ التزاماً برسالةٍ معطاة ويُعيد تجزئةَ ما قبله ليكون حقبةَ الفحص. */
function commitWithMessage(repo: string, message: string): string {
    const epoch = run(['rev-parse', 'HEAD'], repo).trim();
    writeFileSync(join(repo, 'note.md'), `${Math.random()}\n`, 'utf8');
    run(['add', 'note.md'], repo);
    const file = join(repo, 'msg.txt');
    writeFileSync(file, message, 'utf8');
    run(['commit', '--quiet', '-F', file], repo);
    return epoch;
}

function runGuard(repo: string, epoch: string): { code: number; out: string } {
    try {
        const out = execFileSync(process.execPath, [SCRIPT], {
            cwd: repo,
            encoding: 'utf8',
            env: { ...process.env, HAMI_COMMIT_EPOCH: epoch },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { code: 0, out };
    } catch (error) {
        const err = error as { status?: number; stdout?: string; stderr?: string };
        return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
}

describe('guard-commit-conventions — أسنانُ الترميز', () => {
    beforeEach(() => {
        dir = makeRepo();
    });

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
        dir = '';
    });

    it('يسقط على محرف تحكّم في الرسالة ويُسمّي نقطته', () => {
        const epoch = commitWithMessage(
            dir,
            `docs(scope): موضوعٌ سليم${BEL} في ظاهره\n\n${VALID_BODY}\n`,
        );
        const result = runGuard(dir, epoch);

        expect(result.code).not.toBe(0);
        expect(result.out).toContain('U+0007');
    });

    it('لا يمسّ رسالةً نظيفة فيها شَرطاتٌ وتواريخ — ضابطةٌ تمنع حارساً يسقط دائماً', () => {
        const epoch = commitWithMessage(
            dir,
            `docs(scope): تصحيحٌ مؤرَّخ ٢٠٢٦-٠٩-١٣ — بشَرطةٍ وفاصلة\n\n${VALID_BODY}\n`,
        );
        const result = runGuard(dir, epoch);

        expect(result.out).not.toContain('U+');
        expect(result.code).toBe(0);
    });

    it('مصدرُ الحارس نفسه خالٍ من محارف التحكّم وعلامة الترتيب', () => {
        const source = readFileSync(SCRIPT, 'utf8');
        const offenders = [...source]
            .map((char) => char.codePointAt(0) ?? 0)
            .filter(
                (cp) =>
                    (cp <= 0x08 && cp >= 0x00) ||
                    cp === 0x0b ||
                    cp === 0x0c ||
                    (cp >= 0x0e && cp <= 0x1f) ||
                    (cp >= 0x7f && cp <= 0x9f) ||
                    cp === 0xfeff,
            );

        expect(offenders).toEqual([]);
    });
});
