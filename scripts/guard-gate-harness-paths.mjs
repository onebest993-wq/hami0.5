#!/usr/bin/env node
/**
 * بوّابةٌ عمياء عن عُدّتها ليست بوّابة.
 *
 * هذا العطل وقع هنا فعلاً: `467d6ecc` غيّر `playwright.config.ts` — وهو الملفّ الذي
 * تمرّ به كلّ بوّابة E2E — فعملت `Boot E2E` وحدها لأنّها الوحيدة التي تذكره في مرشّح
 * مساراتها، وصمتت `Execution Gate` و`Lawsuits Gate` عن تغييرٍ يمسّهما مباشرةً.
 * وقبلها بيومٍ كُتب في `scripts/e2e-build-env.mjs` منطقُ رفضِ `dist` قديم — وهو
 * المنطق الذي يقرّر إن كان يُسمح للبوّابة أن تحكم أصلاً — ولا بوّابة تذكره.
 *
 * فالفحص هنا يقلب المعادلة: تُستخرَج مُدخلات كلّ بوّابة **من نفسها** — أوامرُ خطواتها،
 * ثمّ إغلاقُ استيراد تلك الأوامر — فإن بقي مُدخلٌ لا يطابقه أيّ نمطٍ في مرشّحها،
 * فالبوّابة تُشغَّل بشروطٍ لا تشمل ما تعتمد عليه.
 *
 * ويفحص ثانياً تطابق كتلتَي `push` و`pull_request`: الملفّات نفسها تقول إنّ تكرارهما
 * حرفيٌّ عمداً (Actions لا يدعم مراسي YAML)، وقد اختلفتا مرّةً فاختلف سلوك البوّابة
 * بين الدفع وطلب الدمج بلا سببٍ معلَن.
 *
 * ── ما يُغطّيه فعلاً، بعد أن شُحن بوصفٍ أوسع منه ───────────────────────────────
 * شُحن هذا الملفّ موصوفاً بأنّه «مُختبَرٌ سلباً»، وكان ذلك صحيحاً في حالتين فقط —
 * الحالتين اللتين وُضع لهما. ووجدته مراجعةٌ مستقلّة (F3) يمرّ كاذباً في صيغٍ صالحة،
 * وجذرُها واحد: **محلّلٌ يُنتج فراغاً حين لا يفهم، ومنطقٌ يُخطّي الفراغ**.
 * أُغلقت خمسٌ، ولكلٍّ اختبارٌ سلبيّ في
 * `src/app/__tests__/gateHarnessPathsGuardTeeth.test.ts` يسقط إن عاد العطل:
 *   ١ · `- "x"` بالاقتباس المزدوج      ٢ · `- x` بلا اقتباس
 *   ٣ · `run: |` متعدّد الأسطر          ٤ · Playwright بلا خطوة `playwright install`
 *   ٥ · `- run: …` خطوةٌ بلا اسم (انكشفت أثناء كتابة الاختبار، ولم تكن في القائمة)
 * **والقاعدة التي تحكمها جميعاً:** `paths:` مُعلَنةٌ ولم يُقرأ منها مُدخل = تحليلٌ
 * تعذّر ⇒ **FAIL**، لا تخطٍّ. فالتعذُّر ليس نجاحاً (CLAUDE.md §٣).
 *
 * ── وما لا يُغطّيه، ليُقال قبل أن يُكتشف ────────────────────────────────────────
 * `paths-ignore:` لا يُفحص البتّة — سير عملٍ يستثني عُدّته بهذا الطريق يمرّ.
 * ومراسي YAML، والوثائق المتعدّدة، و`on:` بالصيغة الانسيابية — لا يفهمها المحلّل؛
 * لكنّها تسقط الآن بقاعدة «المُعلَن غير المقروء يُفشل» بدل أن تُخطّى.
 *
 *   node scripts/guard-gate-harness-paths.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, normalize, sep } from 'node:path';

const ROOT = process.cwd();
const WORKFLOWS = join(ROOT, '.github/workflows');

/** كلّ سير عملٍ يشغّل Playwright يمرّ بهذين، ذكرهما أو لم يذكرهما. */
const PLAYWRIGHT_HARNESS = ['playwright.config.ts', 'e2e/globalSetup.ts'];

const toPosix = (p) => p.split(sep).join('/');

/** أوامر `node scripts/x.mjs` داخل جسم أمرِ npm. */
const scriptFilesOf = (body) =>
    [...String(body ?? '').matchAll(/node\s+(scripts\/[\w.-]+\.mjs)/g)].map((m) => m[1]);

/**
 * أدخل سكربتاً، اخرج بإغلاق ما يقرؤه فعلاً: استيراداته النسبيّة **وما يستدعيه من
 * أوامر npm**. والثاني ليس ترفاً — كلّ مشغّلات البوّابات تبني عبر
 * `spawnSync('npm', ['run', 'build:e2e'])`، وهو استدعاءٌ لا يراه تتبّعُ الاستيراد،
 * فبقي `scripts/run-e2e-build.mjs` خارج كلّ حساب.
 */
function importClosure(entries, pkgScripts) {
    const seen = new Set();
    const queue = [...entries];
    while (queue.length) {
        const file = toPosix(queue.shift());
        if (seen.has(file) || !existsSync(join(ROOT, file))) continue;
        seen.add(file);
        const text = readFileSync(join(ROOT, file), 'utf8');
        const dir = dirname(file);
        //  import … from './x'   ·   await import('./x')   ·   import './x'
        for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
            queue.push(toPosix(normalize(join(dir, m[1]))));
        }
        //  spawnSync('npm', ['run', 'build:e2e'])  ·  run('x', 'npm', ['run', 'x'])
        for (const m of text.matchAll(/['"]run['"]\s*,\s*['"]([\w:.-]+)['"]/g)) {
            queue.push(...scriptFilesOf(pkgScripts[m[1]]));
        }
        //  spawnSync(execPath, [resolve(ROOT, 'scripts', 'run-execution-e2e.mjs')])
        for (const m of text.matchAll(/['"]scripts['"]\s*,\s*['"]([\w.-]+\.mjs)['"]/g)) {
            queue.push(`scripts/${m[1]}`);
        }
    }
    return [...seen];
}

/** قائمة paths تحت مُشغِّلٍ بعينه — بمحلّل أسطرٍ لأنّ لا مُحلّل YAML في التبعيات. */
function triggerPaths(text, trigger) {
    const lines = text.split(/\r?\n/);
    const out = [];
    let declared = false;
    let inTrigger = false;
    let inPaths = false;
    for (const line of lines) {
        if (new RegExp(`^\\s{2}${trigger}:\\s*$`).test(line)) {
            inTrigger = true;
            continue;
        }
        if (inTrigger && /^\s{2}\S/.test(line)) {
            inTrigger = false;
            inPaths = false;
        }
        if (!inTrigger) continue;
        /* `paths:` وحدها أو ومعها محتوىً على السطر (تسلسلٌ انسيابيّ) — كلتاهما إعلان. */
        if (/^\s{4}paths:/.test(line)) {
            declared = true;
            inPaths = /^\s{4}paths:\s*$/.test(line);
            continue;
        }
        if (!inPaths) continue;
        if (/^\s{6}#/.test(line)) continue;
        /*
         * ثلاث صيغٍ صالحة في YAML:  - 'x'  ·  - "x"  ·  - x
         * وكان يُقرأ الأوّل وحده، فقائمةٌ بالاقتباس المزدوج تُقرأ **صفراً** فتُخطّى
         * البوّابة كلّها بلا أن يقول أحدٌ شيئاً.
         */
        const item = line.match(/^\s{6}-\s+(?:'([^']*)'|"([^"]*)"|([^#\s][^#]*?))\s*(?:#.*)?$/);
        if (item) out.push((item[1] ?? item[2] ?? item[3]).trim());
        else if (/^\s{4}\S/.test(line)) inPaths = false;
    }
    return { declared, paths: out };
}

/**
 * أوامر خطوات سير العمل وحدها — لا نصّه كلّه. فالتعليق الذي يذكر `playwright.config.ts`
 * ليس استعمالاً لـPlaywright، وتمييزُ الأمر من الكلام يمنع مطالبةً بلا سبب.
 */
function runCommands(text) {
    const lines = text.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i += 1) {
        /* تعليقٌ يذكر `run:` ليس أمراً — والتمييز مقصودٌ منذ النسخة الأولى. */
        if (/^\s*#/.test(lines[i])) continue;
        /*
         * `run:` أينما وقع في السطر — فصيغة `- run: …` (خطوةٌ بلا اسم) كانت تُفلت
         * من `^\s*run:` كلّها، وهي صيغةٌ شائعة وصالحة.
         */
        const keyCol = lines[i].search(/(?<![\w-])run:/);
        if (keyCol < 0) continue;
        const rest = lines[i].slice(keyCol + 4).trim();
        /* أمرٌ أحاديّ السطر. */
        if (rest && !/^[|>][-+]?\d*$/.test(rest)) {
            out.push(rest);
            continue;
        }
        /*
         * كتلة `run: |` — وكانت تُقرأ «|» وحدها فتضيع كلّ أوامرها. وهذا يكفي وحده
         * لإخفاء سكربتٍ كاملٍ عن الفحص: خطوةٌ متعدّدة الأسطر = خطوةٌ بلا مُدخلات.
         */
        for (let j = i + 1; j < lines.length; j += 1) {
            if (!lines[j].trim()) continue;
            if (lines[j].search(/\S/) <= keyCol) break;
            out.push(lines[j].trim());
        }
    }
    return out;
}

/** أوامر الخطوات → ملفّات سكربت حقيقية على القرص. */
function entryScripts(commands, pkgScripts) {
    const entries = new Set();
    for (const cmd of commands) {
        for (const s of scriptFilesOf(cmd)) entries.add(s);
        const viaNpm = cmd.match(/npm run ([\w:-]+)/);
        if (viaNpm) for (const s of scriptFilesOf(pkgScripts[viaNpm[1]])) entries.add(s);
    }
    return [...entries];
}

/** مطابقة نمط مسارات GitHub (`**` و`*`) على ملفٍّ واحد. */
function matchesPattern(pattern, file) {
    const rx = new RegExp(
        `^${pattern.replace(/\*\*\/?|\*|[.+^${}()|[\]\\]/g, (token) =>
            token.startsWith('**') ? '.*' : token === '*' ? '[^/]*' : `\\${token}`,
        )}$`,
    );
    return rx.test(file);
}

const pkgScripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts ?? {};
const problems = [];
let audited = 0;

for (const name of readdirSync(WORKFLOWS)) {
    if (!/\.ya?ml$/.test(name)) continue;
    const text = readFileSync(join(WORKFLOWS, name), 'utf8');

    const push = triggerPaths(text, 'push');
    const pull = triggerPaths(text, 'pull_request');

    // كتلتان موجودتان ولكلٍّ قائمة → يجب أن تتطابقا حرفياً.
    if (push.paths.length && pull.paths.length) {
        const identical =
            push.paths.length === pull.paths.length &&
            push.paths.every((p, i) => p === pull.paths[i]);
        if (!identical) {
            problems.push(
                `${name}: كتلتا push وpull_request مختلفتان (${push.paths.length} مقابل ${pull.paths.length}) — ` +
                    `فسلوك البوّابة يختلف بين الدفع وطلب الدمج بلا سببٍ معلَن`,
            );
        }
    }

    // بلا إعلان `paths:` أصلاً → تعمل على كلّ دفعة، فلا عمى ممكن.
    if (!push.declared && !pull.declared) continue;

    /*
     * أُعلنت `paths:` ولم يُقرأ منها مُدخلٌ واحد ⇒ **تحليلٌ تعذّر، لا مرشّحٌ فارغ**.
     * وكان هذا مخرجَ الحارس الأوسع: أيّ صيغةٍ لا يفهمها المحلّل تُنتج قائمةً فارغة،
     * والفارغةُ كانت تُخطَّى فتمرّ البوّابة خضراء. **والتعذُّر ليس نجاحاً** (CLAUDE.md §٣).
     */
    let parseFailed = false;
    for (const [trigger, block] of [
        ['push', push],
        ['pull_request', pull],
    ]) {
        if (block.declared && !block.paths.length) {
            problems.push(
                `${name}: أُعلنت \`paths:\` تحت \`${trigger}\` ولم يُقرأ منها مُدخلٌ واحد — ` +
                    `صيغةٌ لا يفهمها هذا المحلّل (تسلسلٌ انسيابيّ؟ مرساة؟). ` +
                    `لا تُخطّى: التحليلُ المتعذّر ليس نجاحاً`,
            );
            parseFailed = true;
        }
    }
    if (parseFailed) continue;
    audited += 1;

    const commands = runCommands(text);
    const entries = entryScripts(commands, pkgScripts);
    /*
     * كان يُقرأ من نصّ الخطوات وحده، فحذفُ خطوة `playwright install` يُسقط الفحص كلّه
     * عن عُدّة Playwright. يُقرأ الآن من **إغلاق السكربتات** أيضاً: مَن يشغّل Playwright
     * برمجياً يمرّ بعُدّته وإن لم تُذكر في أيّ خطوة.
     */
    const baseClosure = importClosure(entries, pkgScripts);
    const usesPlaywright =
        commands.some((cmd) => /\bplaywright\b/i.test(cmd)) ||
        baseClosure.some((f) => /\bplaywright\b/i.test(readFileSync(join(ROOT, f), 'utf8')));
    const inputs = importClosure(
        [...entries, ...(usesPlaywright ? PLAYWRIGHT_HARNESS : [])],
        pkgScripts,
    );

    const patterns = push.paths.length ? push.paths : pull.paths;
    for (const file of inputs.sort()) {
        if (!patterns.some((p) => matchesPattern(p, file))) {
            problems.push(`${name}: عمياء عن مُدخلٍ تعتمد عليه → ${file}`);
        }
    }
}

if (problems.length) {
    console.error('GUARD gate-harness-paths: FAIL');
    for (const p of problems) console.error(`  ${p}`);
    console.error(
        '\nأضف المسار إلى مرشّحَي push وpull_request معاً (التكرار حرفيٌّ عمداً — Actions لا يدعم المراسي).',
    );
    process.exit(1);
}

console.log(`GUARD gate-harness-paths: PASS — ${audited} بوّابةً مُرشَّحة، كلّ مُدخلاتها مغطّاة`);
