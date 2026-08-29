/**
 * حارس المسارات المكتوبة نصّاً.
 *
 * اختبارات بنيوية كثيرة في هذا المستودع لا تستورد الملفّ بل تقرأه:
 * `readFileSync(join(root, 'src/app/…'))` ثم تتحقّق من محتواه. وهذا مسار حقيقي
 * لا يراه أي محلّل استيراد — فالملفّ يبدو غير مبلوغ فيُحذف، ويسقط الاختبار
 * بعد الحذف لا قبله.
 *
 * حدث ذلك فعلاً: موجة حذف الوحدات الميتة أسقطت ١١ اختباراً بنيوياً لأن حارس
 * الوحدات الميتة يقرأ `import` و`require` و`new URL` ولا يقرأ نصّاً في وسيط.
 *
 * هذا الحارس يقلب الترتيب: أي مسار مصدر مكتوب نصّاً ولا يوجد على القرص يُسقِط
 * البوّابة، فيُكتشف الانقطاع في الفحص لا في مجموعة الاختبارات.
 *
 * الانقطاعات القائمة محفوظة في خط الأساس — أغلبها أدوات إعادة هيكلة لمرّة واحدة
 * في `scripts/`، وبقيّتها اختبارات بنيوية ضمن الفواشل المعروفة. العدد ينزل ولا
 * يرتفع، والأسماء محفوظة فيُسمّى الانقطاع الجديد بدل «الرقم ارتفع».
 *
 * Usage:
 *   node scripts/guard-source-path-references.mjs          فحص
 *   node scripts/guard-source-path-references.mjs --save    تثبيت خط الأساس
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toPosix = (p) => p.split(path.sep).join('/');
const SCAN_DIRS = ['src', 'e2e', 'scripts', 'api'];

/**
 * مسار مصدر داخل سلسلة نصّية. الامتداد شرط: بلا شرطه تُلتقَط أسماء مجلّدات
 * وسلاسل عادية فيصير الحارس ضجيجاً.
 */
const SOURCE_PATH_RE = /['"`]((?:src|api|e2e)\/[A-Za-z0-9_\-./]+\.(?:ts|tsx|js|jsx|mjs|css|json))['"`]/g;

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules') continue;
            walk(p, out);
        } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)) {
            out.push(p);
        }
    }
    return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const broken = new Map();

/*
 * فحصٌ يتحقّق أن ملفّاً **غير** موجود يذكر مساره بالضرورة. هذه ليست إشارة مقطوعة
 * بل تأكيد على الحذف، فتُستثنى. الاستثناء على مستوى العبارة لا الملفّ حتى لا
 * يُخفي `existsSync` واحد انقطاعاً حقيقياً في السطر المجاور.
 */
const ASSERTS_ABSENCE = /existsSync|fileExists|\.toThrow\s*\(/;

for (const abs of files) {
    let text;
    try {
        text = fs.readFileSync(abs, 'utf8');
    } catch {
        continue;
    }
    for (const m of text.matchAll(SOURCE_PATH_RE)) {
        const rel = m[1];
        if (fs.existsSync(path.join(ROOT, rel))) continue;

        // نافذة حول الإشارة تكفي لالتقاط `existsSync(path.join(root, '…'))` بأسطره
        const window = text.slice(Math.max(0, m.index - 280), m.index + 500);
        if (ASSERTS_ABSENCE.test(window) || /\.toThrow\s*\(/.test(window)) continue;

        if (!broken.has(rel)) broken.set(rel, new Set());
        broken.get(rel).add(toPosix(path.relative(ROOT, abs)));
    }
}

console.log(`[source-path-refs] scanned ${files.length} files, ${broken.size} broken reference(s)`);

const BASELINE = path.join(ROOT, '.audit', 'source-path-refs-baseline.json');
const current = [...broken.keys()].sort();

fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
if (process.argv.includes('--save') || !fs.existsSync(BASELINE)) {
    const detail = Object.fromEntries([...broken].map(([k, v]) => [k, [...v].sort()]));
    fs.writeFileSync(
        BASELINE,
        `${JSON.stringify({ savedAt: new Date().toISOString(), count: current.length, broken: current, referrers: detail }, null, 2)}\n`,
    );
    console.log(`[source-path-refs] baseline saved: ${current.length}`);
    process.exit(0);
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const baseSet = new Set(base.broken ?? []);
const added = current.filter((f) => !baseSet.has(f));

console.log(`[source-path-refs] baseline ${base.count}  ->  current ${current.length}`);

if (added.length) {
    console.error('');
    console.error(`FAIL — ${added.length} newly broken source path reference(s):`);
    for (const rel of added) {
        console.error(`  ${rel}`);
        for (const r of [...(broken.get(rel) ?? [])].sort()) console.error(`      <- ${r}`);
    }
    console.error('');
    console.error('  إمّا أن الملفّ حُذف وعلى المرجع أن يُحدَّث، أو أن الحذف كان خطأً.');
    process.exit(1);
}

if (current.length < base.count) {
    console.log(`good: ${base.count - current.length} reference(s) repaired — run with --save to lock it in`);
}
console.log('[source-path-refs] OK — لا انقطاع جديد');
