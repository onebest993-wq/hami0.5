/**
 * تحقق بناء الإنتاج: لا circular chunks + لا تراجع أحجام الـ chunks المراقَبة.
 * الاستخدام: node scripts/verify-production-build.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';

function run(cmd, args, opts = {}) {
    const result = spawnSync(cmd, args, {
        cwd: root,
        encoding: 'utf8',
        ...opts,
    });
    return result;
}

/**
 * **أوامرُ سير العمل تُقرأ بلا اعتماد — لكنّها لم تكن تُكتب في كلّ مسارٍ يسقط.**
 *
 * قِيس ٢٠٢٦-٠٩-١٣ على تشغيلة `#46` (`4d1bcbc3`): الخطوة ٣٩ سقطت في **٢٨ ثانية** —
 * وهو زمنُ البناء وحده — **وبلا تعليقةٍ واحدة تقول لماذا**. والسبب أنّ التعليق كان
 * موصولاً بالمستهلكين الستّة أدناه فحسب، **ومسارا الفشل قبلهم** (سقوطُ البناء ودورانُ
 * الحزم) يخرجان بـ`process.exit` صامتَين.
 *
 * فالمستودع كان يدّعي أنّ سقوط هذه الخطوة «مقروءٌ بلا اعتماد» — **وهو صحيحٌ في ستّة
 * مسارات من ثمانية، والفجوة في المسار الذي وقع فعلاً.** ووصفٌ أوسعُ من الآلة هو ما
 * يمنعه §٣ من الميثاق.
 */
function annotate(title, message) {
    const escaped = String(message)
        .replace(/%/g, '%25')
        .replace(/\r/g, '')
        .replace(/\n/g, '%0A');
    console.log(`::error title=${title}::${escaped}`);
}

/** أنفعُ الأسطر وحدها — التعليقة محدودة الطول، والضجيج يُغرق الإشارة. */
function usefulLines(text, limit = 12) {
    return text
        .split(/\r?\n/)
        .filter((l) => /FAIL|BLOCKED|error|Error|✗|exceed|regression|missing|Circular/i.test(l))
        .slice(-limit)
        .join('\n');
}

/**
 * أمرُ البناء. و`HAMI_VERIFY_BUILD_ARGV` **للاختبار وحده** — به يُثبَت أنّ مسارَي
 * الفشل أدناه يُعلّقان فعلاً، بلا إعطاب بناءٍ حقيقيّ. ومسارُ الإنتاج حين لا يُضبط
 * المتغيّر **هو نفسه حرفاً** كما كان.
 *
 * **ومصفوفةُ argv لا سلسلةُ غلاف** — قِيس: تمريرُ `node "<مسار فيه فراغ>"` عبر
 * `cmd /d /s /c` وصل إلى node مقطوعاً عند أوّل فراغ. فالمصفوفة تتجاوز الاقتباس كلَّه،
 * **ولا تفتح باب حقنٍ في سكربتِ تحقّقٍ يعمل على العدّاء**.
 */
const overrideArgv = process.env.HAMI_VERIFY_BUILD_ARGV
    ? JSON.parse(process.env.HAMI_VERIFY_BUILD_ARGV)
    : null;
const shell = process.env.ComSpec || 'cmd.exe';
const build = overrideArgv
    ? run(overrideArgv[0], overrideArgv.slice(1))
    : isWindows
      ? run(shell, ['/d', '/s', '/c', 'npm run build'])
      : run('npm', ['run', 'build']);
const buildOutput = `${build.stdout ?? ''}${build.stderr ?? ''}`;
process.stdout.write(build.stdout ?? '');
process.stderr.write(build.stderr ?? '');

if (build.status !== 0) {
    console.error(`[verify-production-build] BLOCKED: build failed (exit=${build.status ?? 1})`);
    annotate(
        'verify-production-build: build',
        usefulLines(buildOutput) || `npm run build exited with ${build.status ?? 1}`,
    );
    process.exit(build.status || 1);
}

if (/Circular chunk:/i.test(buildOutput)) {
    console.error('[verify-production-build] BLOCKED: circular manual chunks detected in vite build');
    annotate(
        'verify-production-build: circular-chunks',
        usefulLines(buildOutput) || 'Circular chunk detected in vite build',
    );
    process.exit(1);
}

/**
 * ما فوق **مُنتِج** — البناء ودوائرُ الحزم — فسقوطُه يُنهي كلّ شيء لأنّ ما بعده يقرأ ما
 * ينتجه. وما دونه **مستهلكون مستقلّون**: كلٌّ يقرأ `dist` بنفسه ولا يحتاج جاره.
 *
 * **وكانوا مسلسلين بـ`process.exit` عند أوّل سقوط — وهذا ما آذانا فعلاً.**
 * قيس ٢٠٢٦-٠٩-١٢، أوّل يومٍ تعمل فيه هذه الخطوة على العدّاء أصلاً: سقط
 * `chunk-baseline` (قياسٌ كاذب من خطّ أساسٍ متقادم) **فحجب الخمسة بعده**؛ ولمّا صُحّح
 * ظهر `check-min-chunk-size` (رقمٌ متقادم) **فحجب ما بعده**؛ ولمّا صُحّح ظهر
 * `first-open-shared-tax` — **وهو وحده العطل الحقيقيّ**. ثلاثُ دوراتٍ وثلاثةُ أبنية
 * لرؤية ما كان يمكن أن يُقال في تشغيلةٍ واحدة.
 *
 * **فالتسلسل هنا ليس ترتيباً بل آلةُ إخفاء:** كلّ فحصٍ كاذبٍ يحجب صادقاً خلفه، وكلّما
 * زادت الحلقة زاد الاحتمال. والقاعدة: **اجمع الأحكام، ثمّ اسقط مرّةً واحدة.**
 */
const CONSUMERS = [
    { name: 'report-chunk-sizes', argv: ['scripts/report-chunk-sizes.mjs'] },
    { name: 'chunk-baseline', argv: ['scripts/chunk-baseline.mjs', 'diff', '--fail'] },
    { name: 'check-min-chunk-size', argv: ['scripts/check-min-chunk-size.mjs', '--fail'] },
    { name: 'check-named-chunk-budget', argv: ['scripts/check-named-chunk-budget.mjs'] },
    { name: 'first-open-shared-tax', argv: ['scripts/guard-first-open-shared-tax.mjs'] },
    { name: 'clean-mojibake', argv: ['scripts/clean-mojibake.mjs', '--check'] },
];

/**
 * **سقوطٌ لا يُقرأ كأنّه لم يقع.**
 *
 * سجلّات GitHub Actions تتطلّب اعتماداً حتى على مستودعٍ عموميّ، ولا `gh` على جهاز
 * التطوير. فخطوةٌ صَدَفيّة تسقط لا تُنتج إلا `Process completed with exit code 1` في
 * التعليقات — وهو ما وقع فعلاً في تشغيلة `b56ee60a`: سقطت الخطوة ٣٩ ولم يُعرف أيُّ
 * الستّة سقط.
 *
 * والعلاج هو عينه الذي أُصلح به المُبلِّغ في `1b368367`: أوامرُ سير العمل
 * (`::error::`) تُقرأ من **مخرَج الخطوة**، وتظهر في
 * `GET /check-runs/{job}/annotations` **بلا اعتماد**. فالمخرَج يُلتقط ليُحوَّل إلى
 * تعليقات، **ويُكتب كما هو أيضاً** لئلّا يخسر قارئ السجلّ شيئاً — وهذا هو الخطأ
 * المعاكس الذي وقع في `5d1d6260` (التقاطٌ بلا كتابة).
 *
 * *(و`annotate` مُعرَّفةٌ أعلاه، لأنّ مسارَي البناء والدوران يسبقان هذه الحلقة
 * ويحتاجانها — وكان غيابُها عنهما هو عطلُ `#46`.)*
 */

const failed = [];
for (const check of CONSUMERS) {
    console.log(`\n─── ${check.name} ───`);
    const result = run(process.execPath, check.argv);
    const out = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    process.stdout.write(out);
    if (result.status !== 0) {
        failed.push({ name: check.name, status: result.status ?? 1 });
        /* الأسطر المفيدة وحدها — التعليقة محدودة الطول، والضجيج يُغرق الإشارة. */
        const detail = out
            .split(/\r?\n/)
            .filter((l) => /FAIL|BLOCKED|نما|exceed|regression|missing|✗|Error/i.test(l))
            .slice(0, 12)
            .join('\n');
        annotate(
            `verify-production-build: ${check.name}`,
            detail || `${check.name} exited with ${result.status ?? 1} (no matching detail lines)`,
        );
    }
}

if (failed.length) {
    console.error(
        `\n[verify-production-build] FAIL — ${failed.length} من ${CONSUMERS.length} فحصاً سقط:`,
    );
    for (const f of failed) console.error(`  - ${f.name} (exit=${f.status})`);
    console.error('\nكلُّها شُغِّلت رغم سقوط بعضها — فلا فحصَ يحجب أخاه، والقائمة أعلاه كاملة.');
    annotate(
        'verify-production-build',
        `${failed.length}/${CONSUMERS.length} فحصاً سقط: ${failed.map((f) => f.name).join(' · ')}`,
    );
    process.exit(1);
}

console.log(
    `\n[verify-production-build] OK — ${CONSUMERS.length}/${CONSUMERS.length} فحوصٍ اجتازت (لا حزم دائرية، والأحجام والإغلاق ضمن خطوط الأساس)`,
);
