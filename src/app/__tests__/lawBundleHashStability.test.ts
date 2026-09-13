/**
 * اسمُ حزمة القوانين يجب ألّا يتبع نظامَ الاستنساخ.
 *
 * **العطل الذي وُضع له، مقيساً:** المولّد يُجزّئ **البايتات كما قرأها**
 * (`shortHash(raw)`)، فاسمُ المخرَج يتبع نهايات الأسطر في شجرة العمل. وقبل
 * `.gitattributes` كان ويندوز يُخرج CRLF ولينكس LF، **فيسكّ كلُّ نظامٍ اسماً مختلفاً
 * لمحتوىً واحد**. وقِيس أثرُه: **تسعةٌ من تسعة** من مداخل المانيفست مُشتقّةٌ من CRLF،
 * **وخمسةٌ من «اليتامى» في `public/static-law-data/v1` هي توائمُها المُشتقّة من LF** —
 * أي أنّ نصف المجلَّد كان أثراً لهذا العطل لا فائضاً.
 *
 * والاختبار صندوقٌ أسود: يُشغّل السكربت المشحون على شجرةٍ مؤقّتة عبر `HAMI_LAW_DATA_ROOT`،
 * مرّةً بمصدرٍ CRLF ومرّةً بمصدرٍ LF **لنفس المحتوى**، ويشترط اسماً واحداً.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const GENERATOR = resolve(process.cwd(), 'scripts/generate-static-law-data.mjs');

/**
 * مسارُ المصدر في الشجرة المؤقّتة يُبنى **مقاطعَ لا سلسلةً واحدة**، وذلك مقصود:
 * `guard:source-path-references` يقرأ كلّ سلسلةٍ تبدأ بشجرة المصدر وتنتهي بلاحقةٍ
 * معروفة ويشترط أن تُحلّ **في هذا المستودع** — وقد سقط على النسخة الأولى من هذا الملفّ،
 * وكان مُحقّاً: تلك سلسلةُ تجهيزٍ لشجرةٍ مؤقّتة لا إشارةٌ إلى ملفٍّ هنا.
 * **فيُعدَّل الشاهد لا الحَكَم.**
 */
const LAWS_DIR = ['src', 'data', 'laws'];
const SOURCE_FILE = 'sample.articles.json';

let root = '';

/** يكتب المصدر بنهاياتٍ مطلوبة ثمّ يُشغّل المولّد، ويعيد اسمَ الحزمة من المانيفست. */
function generateWith(lineEnding: '\n' | '\r\n'): string {
    const body = JSON.stringify({ law_name: 'قانونٌ للاختبار', articles: [{ id: 1 }, { id: 2 }] }, null, 2);
    const source = `${body.split('\n').join(lineEnding)}${lineEnding}`;
    writeFileSync(join(root, ...LAWS_DIR, SOURCE_FILE), source, 'utf8');

    execFileSync(process.execPath, [GENERATOR], {
        env: { ...process.env, HAMI_LAW_DATA_ROOT: root },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    const manifest = JSON.parse(
        readFileSync(join(root, 'public/static-law-data/manifest.json'), 'utf8'),
    ) as { bundles: Record<string, { path: string }> };
    return manifest.bundles.sample.path.split('/').pop() ?? '';
}

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'law-bundle-'));
    mkdirSync(join(root, ...LAWS_DIR), { recursive: true });
});

afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
});

describe('حزم القوانين: الاسم لا يتبع نهايات الأسطر', () => {
    it('يُنتج الاسمَ نفسه من مصدرٍ CRLF ومن مصدرٍ LF لنفس المحتوى', () => {
        const fromCrlf = generateWith('\r\n');
        const fromLf = generateWith('\n');

        expect(fromCrlf).toMatch(/^sample\.[0-9a-f]{12}\.json$/);
        expect(fromCrlf).toBe(fromLf);
    });

    it('ويبقى الاسمُ حسّاساً للمحتوى — وإلّا لم يكن تجزئةً أصلاً', () => {
        const first = generateWith('\n');

        writeFileSync(
            join(root, ...LAWS_DIR, SOURCE_FILE),
            `${JSON.stringify({ law_name: 'قانونٌ آخر', articles: [{ id: 9 }] }, null, 2)}\n`,
            'utf8',
        );
        execFileSync(process.execPath, [GENERATOR], {
            env: { ...process.env, HAMI_LAW_DATA_ROOT: root },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        const manifest = JSON.parse(
            readFileSync(join(root, 'public/static-law-data/manifest.json'), 'utf8'),
        ) as { bundles: Record<string, { path: string }> };

        expect(manifest.bundles.sample.path.split('/').pop()).not.toBe(first);
    });
});
