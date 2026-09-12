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

const build = isWindows
    ? run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run build'])
    : run('npm', ['run', 'build']);
const buildOutput = `${build.stdout ?? ''}${build.stderr ?? ''}`;
process.stdout.write(build.stdout ?? '');
process.stderr.write(build.stderr ?? '');

if (build.status !== 0) {
    process.exit(build.status || 1);
}

if (/Circular chunk:/i.test(buildOutput)) {
    console.error('[verify-production-build] BLOCKED: circular manual chunks detected in vite build');
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

const failed = [];
for (const check of CONSUMERS) {
    console.log(`\n─── ${check.name} ───`);
    const result = run(process.execPath, check.argv, { stdio: 'inherit' });
    if (result.status !== 0) failed.push({ name: check.name, status: result.status ?? 1 });
}

if (failed.length) {
    console.error(
        `\n[verify-production-build] FAIL — ${failed.length} من ${CONSUMERS.length} فحصاً سقط:`,
    );
    for (const f of failed) console.error(`  - ${f.name} (exit=${f.status})`);
    console.error('\nكلُّها شُغِّلت رغم سقوط بعضها — فلا فحصَ يحجب أخاه، والقائمة أعلاه كاملة.');
    process.exit(1);
}

console.log(
    `\n[verify-production-build] OK — ${CONSUMERS.length}/${CONSUMERS.length} فحوصٍ اجتازت (لا حزم دائرية، والأحجام والإغلاق ضمن خطوط الأساس)`,
);
