/**
 * لا يُقرَّر غلافُ `Suspense` بـ`isPreloaded()` في الرسم — في أيّ ملفٍّ تحت `src`.
 *
 * العطل: مكوّنٌ رُكّب بارداً يعرض المحتوى داخل `Suspense`، ثمّ يكتمل التحميل، **فأوّلُ إعادة رسمٍ**
 * تُرجعه بلا غلاف — نوعُ عنصرٍ آخر في الموضع نفسه، فيُهدم كلُّ ما تحته بلا أيّ setter. قِيس في E2E
 * على ستّة مواضع (مركزُ القرارات يُضيع الضغطة، والإضبارةُ كلُّها تُهدم)، **والعلاجُ `Suspense` دائماً** — والمحمَّلُ
 * لا يعلّق داخله. *(وثبّت الحلُّ الأوّل القرارَ بخطّافٍ عند التركيب، فكبّر مدخلَين مراقَبين فوق `chunk-baseline` على
 * CI؛ فالغلافُ الدائم أصغرُ منه وأبسط.)*
 *
 * **وهذا الحارس يُسقط الأشكالَ الثلاثة التي وقع بها العطلُ فعلاً:**
 *   ١. تفرّعٌ مباشر:            `X.isPreloaded() ? <A/> : <B/>`
 *   ٢. رجوعٌ مبكّر:              `if (X.isPreloaded()) { return live; }`
 *   ٣. متغيّرٌ يُحسب في الرسم:   `const ready = … X.isPreloaded() …` ثمّ يُتفرَّع عليه
 * **ويُجيز** ما يُحسب مرّةً عند التركيب (`useState(() => …)` وكلَّ خطّافٍ يبدأ بـ`use`) وما في المؤثّرات.
 *
 * **وحدُّه المعلَن:** مطابقةُ نصّ لا تحليلُ شجرة — يفوته تفرّعٌ يُبنى بطريقٍ رابع. والمُستثنى
 * أدناه يبدّل **غطاءً بغطاء**، فلا محتوى معروضاً يُهدم.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();

const COVER_SWAPS = new Set<string>([
    // بديلُ Suspense للبحث: غطاءُ طلاءِ DOM ← غطاءٌ جاهز. لا يحمل حالةَ مستخدم.
    'src/app/components/lawyer/dashboard/GlobalSearchOverlaySuspenseCover.tsx',
]);

const SHAPES: Array<{ name: string; re: RegExp }> = [
    { name: 'ternary', re: /\.isPreloaded\(\)\s*\?/g },
    { name: 'early-return', re: /if\s*\([^)]*\.isPreloaded\(\)\s*\)\s*\{\s*return\s+(?:<|[A-Za-z_$][\w$]*\s*;)/g },
    // `(?!\s|use[A-Z])` لا `(?!use[A-Z])` وحده: بدونها يتراجع `\s*` إلى الفراغ فيُجاز الاستثناء كذباً
    { name: 'render-variable', re: /const\s+[A-Za-z_$][\w$]*\s*=\s*(?!\s|use[A-Z])[^;{]*\.isPreloaded\(\)/g },
];

function tsxFiles(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === '__tests__' || name === '__mocks__') continue;
        const abs = join(dir, name);
        if (statSync(abs).isDirectory()) tsxFiles(abs, out);
        else if (name.endsWith('.tsx')) out.push(abs);
    }
    return out;
}

export function findRenderTimePreloadToggles(root: string): string[] {
    const hits: string[] = [];
    for (const abs of tsxFiles(join(root, 'src'))) {
        const rel = relative(root, abs).split(sep).join('/');
        if (COVER_SWAPS.has(rel)) continue;
        const text = readFileSync(abs, 'utf8');
        for (const { name, re } of SHAPES) {
            re.lastIndex = 0;
            for (const m of text.matchAll(re)) {
                const line = text.slice(0, m.index).split('\n').length;
                hits.push(`${rel}:${line} (${name})`);
            }
        }
    }
    return hits.sort();
}

describe('لا تفرّعَ على isPreloaded() في الرسم', () => {
    it('صفرُ مواضع في src', () => {
        expect(findRenderTimePreloadToggles(ROOT)).toEqual([]);
    });

    it('ضابطة: الأشكالُ الثلاثة تُمسَك، والمثبَّتُ عند التركيب يُجاز', () => {
        const caught = (src: string) => SHAPES.some(({ re }) => ((re.lastIndex = 0), re.test(src)));
        expect(caught('return X.isPreloaded() ? <A /> : <B />;')).toBe(true);
        expect(caught('if (LazyX.isPreloaded()) {\n        return live;\n    }')).toBe(true);
        expect(caught("const preloaded = typeof L.isPreloaded === 'function' ? L.isPreloaded() : false;")).toBe(true);
        expect(caught('const cold = usePinnedFlag(() => LazyX.isPreloaded());')).toBe(false);
        expect(caught('const [ready, setReady] = useState(() => LazyX.isPreloaded());')).toBe(false);
        expect(caught('if (LazyX.isPreloaded()) {\n            setReady(true);\n            return;')).toBe(false);
        expect(caught("if (typeof L.isPreloaded === 'function' && L.isPreloaded()) return;")).toBe(false);
    });
});
