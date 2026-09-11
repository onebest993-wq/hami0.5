#!/usr/bin/env node
/**
 * قواعد الالتزام (CLAUDE.md §٢) تُفحص آلياً بدل أن تُرجى.
 *
 *   node scripts/guard-commit-conventions.mjs
 *
 * السبب — قيس لا فُرض: مراجعةٌ مستقلّة في ٢٠٢٦-٠٩-١١ فحصت ٣٦ التزاماً بالعين
 * فوجدت مخالفتين مرّتا شهوراً بلا أن يلاحظهما أحد: بادئة `perf(` وهي خارج الستّ
 * المسموحة، والتزام `Revert` بلا سبب في جسده وبلا عبارة التجميد البصري. ومراجعةُ
 * عينٍ لا تتكرّر مع كل التزام؛ هذا يتكرّر.
 *
 * ### النطاق: من اليوم، ولا يُحاكَم الماضي
 *
 * جُرِّب أوّلاً من مولد الميثاق نفسه (`7db130b8`) فسقط على **٣٨ مخالفة** — وقراءتها
 * غيّرت التصميم، فتُسجَّل هنا لأنّها قياسٌ لا رأي:
 *
 *   ١١ × `test(نطاق):`   — أسلوب العمل الحالي، مستعمَل عمداً وبانتظام
 *    ٢ × `ci:`           — و§٢·١ يقول إنّ تعديلات CI تدخل تحت `chore(`
 *   ~١٠ من سلسلة `T`/`RATCHET`/`HARDEN`/`consolidate` المحيطة بإدخال الميثاق نفسه
 *    ٢ يُعدّلان خطوط أساس بلا بادئة `baseline(` (`440385aa` · `b00867b8`)
 *
 * فـ`test` و`ci` ليسا في الستّ، وهما من Conventional Commits القياسية ومن أسلوب
 * هذا الفرع الفعليّ. **وتوسيعُ §٢·١ ليس لي** — الميثاق للمالك. فالحارس يفرض الستّ
 * كما كُتبت، **ويبدأ من الالتزام الذي هبط فيه**: ما قبله تاريخٌ لا يُحاكَم ولا
 * يُعاد كتابته (المسح أعلاه هو سجلّه)، وما بعده يلتزم أو يسقط.
 *
 * وإن أراد المالك `test(` و`ci`، فسطرٌ في §٢·١ وسطرٌ في `ALLOWED_PREFIXES` أدناه.
 *
 * ### ما يُفحص
 *
 *   ١. البادئة من الستّ في §٢·١ مع نطاقٍ بين قوسين.
 *   ٢. عبارة `Zero Visual Edits = confirmed` في الجسد (§٢·٤)، ومخرجها الوحيد
 *      `Visual Edits = approved` لتعديلٍ واجهيّ بموافقة المالك.
 *   ٣. §٢·٥: التزامٌ يُعدّل ملفّ خطّ أساسٍ **قائماً** يجب أن تكون بادئته
 *      `baseline(`. وإنشاءُ خطٍّ جديد لمِسنَنةٍ جديدة حالةٌ لا يذكرها الميثاق —
 *      تُطبع كملاحظة ولا تُسقط الحارس (قرار المالك معلّق، انظر REVIEW_REPORT F4).
 *
 * ولا يتخطّى هذا الحارس نفسه صامتاً: إن كان التاريخ ضحلاً (CI بـfetch-depth
 * الافتراضي) فهو يسقط ويقول ما يُصلحه، لأن حارساً يصمت عند العجز ليس حارساً.
 */

import { execFileSync } from 'node:child_process';

/**
 * آخر التزامٍ قبل هبوط هذا الحارس. الفحص يبدأ بعده حصراً.
 *
 * لا يُحرَّك هذا الثابت إلى الأمام لتجاوز مخالفةٍ — ذلك يُفرغ الحارس من معناه.
 * المخالفة تُصلَح بـ`git commit --amend` إن كانت الأخيرة، أو تُسجَّل في
 * `GRANDFATHERED` بسببٍ مكتوب إن كانت منشورة.
 */
const ENFORCEMENT_EPOCH = process.env.HAMI_COMMIT_EPOCH ?? 'd70eacaa';

const ALLOWED_PREFIXES = ['fix', 'feat', 'docs', 'refactor', 'chore', 'baseline'];

const SUBJECT_RE = new RegExp(`^(${ALLOWED_PREFIXES.join('|')})\\(([^)]+)\\): \\S`);

const ZVE_PHRASE = 'Zero Visual Edits = confirmed';
const ZVE_APPROVED = 'Visual Edits = approved';

/**
 * مخالفاتٌ وقعت وتُسجَّل ولا تُعاد كتابة التاريخ لأجلها (§٢·٦ روحاً: لا يُعاد
 * كتابة تاريخٍ منشور، وهذا فرعٌ يعمل عليه أكثر من طرف). كلٌّ بسببه.
 */
const GRANDFATHERED = new Map([
    [
        'b798b803',
        'بادئة perf( خارج الستّ. المحتوى سليم (vite.config.mts وحده، بلا شفرة منتج) ' +
            'وفوقه ٣٣ التزاماً. رُصد في مراجعة ٢٠٢٦-٠٩-١١ (F2)، وضمُّ perf إلى §٢·١ قرارُ مالك.',
    ],
    [
        'a18a1e22',
        'Revert آليّ من git: لا بادئة ولا عبارة ZVE. سببه موثّق في ' +
            '.audit/STATE_2026-09-11_FOUNDATION_NIGHT.md §٢. رُصد في مراجعة ٢٠٢٦-٠٩-١١ (F3).',
    ],
]);

function git(args) {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function resolveEpoch() {
    try {
        return git(['rev-parse', '--verify', `${ENFORCEMENT_EPOCH}^{commit}`]).trim();
    } catch {
        console.error(
            `[commit-conventions] FAIL — لا يمكن قراءة ${ENFORCEMENT_EPOCH} (تاريخ ضحل؟).\n` +
                '  في CI: actions/checkout مع fetch-depth: 0.\n' +
                '  محلياً: git fetch --unshallow',
        );
        process.exit(1);
    }
}

const epoch = resolveEpoch();
const hashes = git(['rev-list', '--no-merges', `${epoch}..HEAD`]).split('\n').filter(Boolean);

const failures = [];
const notes = [];

for (const hash of hashes) {
    const short = hash.slice(0, 8);
    /* %B هو الرسالة كاملةً: أوّل سطرٍ هو الموضوع وما بعده الجسد — نداءٌ واحد بلا فاصل */
    const raw = git(['show', '-s', '--format=%B', hash]);
    const newline = raw.indexOf('\n');
    const subject = (newline === -1 ? raw : raw.slice(0, newline)).trim();
    const body = newline === -1 ? '' : raw.slice(newline + 1);

    const excuse = [...GRANDFATHERED.keys()].find((k) => hash.startsWith(k));
    if (excuse) continue;

    if (!SUBJECT_RE.test(subject)) {
        failures.push(
            `${short}  بادئة غير مسموحة أو بلا نطاق — المسموح: ${ALLOWED_PREFIXES.join(' · ')}\n` +
                `          ${subject.slice(0, 100)}`,
        );
    }

    if (!body.includes(ZVE_PHRASE) && !body.includes(ZVE_APPROVED)) {
        failures.push(
            `${short}  بلا «${ZVE_PHRASE}» في الجسد (§٢·٤)\n          ${subject.slice(0, 100)}`,
        );
    }

    /* §٢·٥ — تعديلُ خطّ أساسٍ قائم يستلزم بادئة baseline( */
    const changed = git(['show', '--name-status', '--format=', hash])
        .split('\n')
        .filter(Boolean)
        .map((line) => line.split('\t'))
        .filter(([, file]) => file && /baseline.*\.json$/.test(file));

    const modifiedBaselines = changed.filter(([status]) => status.startsWith('M')).map(([, f]) => f);
    const addedBaselines = changed.filter(([status]) => status.startsWith('A')).map(([, f]) => f);

    if (modifiedBaselines.length > 0 && !subject.startsWith('baseline(')) {
        failures.push(
            `${short}  يُعدّل خطّ أساسٍ قائماً بلا بادئة baseline( — §٢·٥\n` +
                `          ${modifiedBaselines.join(', ')}`,
        );
    }

    if (addedBaselines.length > 0 && !subject.startsWith('baseline(')) {
        notes.push(
            `${short}  ينشئ خطّ أساسٍ جديداً (${addedBaselines.join(', ')}) بلا بادئة baseline( — ` +
                'حالةٌ لا يذكرها §٤ صراحةً؛ قرار المالك معلّق (REVIEW_REPORT F4)',
        );
    }
}

console.log(
    `[commit-conventions] فُحص ${hashes.length} التزاماً منذ ${epoch.slice(0, 8)} ` +
        `، و${GRANDFATHERED.size} مسجَّلان بسببٍ مكتوب`,
);

for (const note of notes) console.log(`[commit-conventions] ملاحظة — ${note}`);

if (failures.length > 0) {
    console.error(`\n[commit-conventions] FAIL — ${failures.length} مخالفة:`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
        '\n  الالتزام الأخير يُعدَّل بـ`git commit --amend`. وما نُشر لا يُعاد كتابته —\n' +
            '  يُسجَّل في GRANDFATHERED بسببٍ مكتوب في scripts/guard-commit-conventions.mjs.',
    );
    process.exit(1);
}

console.log('[commit-conventions] OK');
