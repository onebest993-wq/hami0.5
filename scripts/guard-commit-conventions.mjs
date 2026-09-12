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
 *   ٤. §٢·١ في شقّه الثاني: التزامُ `docs(` **لا يُحرّك شفرة**. انظر أدناه — فحدُّه
 *      قِيس على التاريخ ولم يُنقل عن توصية.
 *
 * ### القاعدة الرابعة: لماذا «لا شفرة» لا «`.md` وحدها»
 *
 * §٢·١ يقول: «`docs(scope):` — `.md` only, no TSX/TS/CSS». وشقّاه غير متطابقين،
 * فالأوّل أوسع من الثاني. **فقِيس أيّهما يصف الواقع** — ١٨ التزام `docs(` منذ الحقبة،
 * **اثنان** يلمسان غير `.md`:
 *
 *   `dcedd788` → `.audit/E2E_FULL_RUN_2026-09-12.json`  — **بيانُ قياسٍ لا شفرة، وهو شرعيّ**
 *   `79315b66` → أربعة `.ts` تحت `src/app/domain/lawsuit/`  — **مخالفة حقيقية**
 *
 * فحرفيّةُ «`.md` وحدها» كانت ستُجرّم بياناً بريئاً، وحرفيّةُ «no TSX/TS/CSS» وحدها
 * تترك `.mjs` طليقاً — **و`.audit/` وحدها فيها ١٠٧ سكربتات `.mjs` عاملة**، فإذنٌ
 * بالمجلَّد يفتح باب شحن أداةٍ تحت لافتة «توثيق». فالحدّ المشحون:
 *
 *   يُسمح: أيّ `*.md` · وما تحت `.audit/` أو `perf-reports/` **ما لم يكن قابلاً للتنفيذ**
 *   يُمنع: كلّ `.ts .tsx .js .jsx .mjs .cjs` أينما كان، وكلّ ما سوى ذلك خارج المجلَّدين
 *
 * وطُبّقت القواعد الأربع على **٥٣ التزاماً منذ الحقبة بلا أيّ إعفاء**، فسقط واحد:
 * `79315b66`. فالحدّ مقيسٌ لا مُقدَّر، ونطاقُ أثره معلومٌ قبل شحنه.
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

/** §٢·١ شقّاً ثانياً: ما يُعدّ شفرةً فلا يمسّه `docs(` أينما كان. */
const EXECUTABLE_EXT = /\.(?:m|c)?[jt]sx?$/;

/** مجلَّدا القياس والتقارير: بياناتُهما ليست شفرة، فتُسمح لـ`docs(` — والقابل للتنفيذ مُستثنى أعلاه. */
const DATA_DIRS = ['.audit/', 'perf-reports/'];

/**
 * مخالفاتٌ وقعت وتُسجَّل ولا تُعاد كتابة التاريخ لأجلها (§٢·٦ روحاً: لا يُعاد
 * كتابة تاريخٍ منشور، وهذا فرعٌ يعمل عليه أكثر من طرف). كلٌّ بسببه.
 *
 * **والإعفاء مقيَّدٌ بقاعدته** — لا إعفاءَ شاملاً. وكان الشكل السابق يُخطّي الالتزام
 * كلّه (`continue`)، فيُسقط عنه قواعد يجتازها أصلاً؛ وهذا يُوسّع الثغرة بلا سبب.
 * فصار لكلّ مُسجَّلٍ قائمةُ القواعد التي أُعفي منها، وما عداها يُفحص كأيّ التزام.
 *
 * و`preEpoch` تعني أنّ الالتزام **قبل حقبة الفرض**، فهو خارج المدى أصلاً ولا يُستشار:
 * يبقى هنا سجلّاً لِما رُصد ولِمَ لم يُعَد كتابة التاريخ، لا آلةً عاملة.
 */
const GRANDFATHERED = new Map([
    [
        'b798b803',
        {
            rules: ['PREFIX'],
            preEpoch: true,
            reason:
                'بادئة perf( خارج الستّ. المحتوى سليم (vite.config.mts وحده، بلا شفرة منتج) ' +
                'وفوقه ٣٣ التزاماً. رُصد في مراجعة ٢٠٢٦-٠٩-١١ (F2)، وضمُّ perf إلى §٢·١ قرارُ مالك.',
        },
    ],
    [
        'a18a1e22',
        {
            rules: ['PREFIX', 'ZVE'],
            preEpoch: true,
            reason:
                'Revert آليّ من git: لا بادئة ولا عبارة ZVE. سببه موثّق في ' +
                '.audit/STATE_2026-09-11_FOUNDATION_NIGHT.md §٢. رُصد في مراجعة ٢٠٢٦-٠٩-١١ (F3).',
        },
    ],
    [
        '79315b66',
        {
            rules: ['DOCS_SCOPE'],
            reason:
                'بادئة docs(audit) على التزامٍ يحمل معها **نقلَ طابقٍ** (T21): أربعة ملفّات من ' +
                '`components/lawyer/lawyerShared/` إلى `domain/lawsuit/`. وقِيس محتواها: ' +
                '`R100` في الأربعة — إعادةُ تسميةٍ خالصة بلا حرفٍ متغيّر، أي `refactor(` بتعريف §٢·١ ' +
                'نفسه، ومهمّتان في التزامٍ واحد (§٢·٢). فالعطل في اللافتة والذرّية لا في الشفرة. ' +
                'ومنشورٌ وفوقه أكثر من ثلاثين التزاماً، و§٢·٦ يمنع إعادة كتابة تاريخٍ منشور — فيُسجَّل. ' +
                'والإعفاء من DOCS_SCOPE وحدها: بادئته وعبارةُ التجميد وخطوطُ الأساس تُفحص كما تُفحص لغيره.',
        },
    ],
]);

/** §٢·١: هل يُخالف هذا الملفّ حدَّ `docs(`؟ */
function violatesDocsScope(file) {
    if (file.endsWith('.md')) return false;
    if (DATA_DIRS.some((dir) => file.startsWith(dir)) && !EXECUTABLE_EXT.test(file)) return false;
    return true;
}

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
/** كلّ إعفاءٍ استُهلك فعلاً — ليُقال في النهاية أيُّها لم يَعُد له داعٍ. */
const exemptionsUsed = new Set();

for (const hash of hashes) {
    const short = hash.slice(0, 8);
    /* %B هو الرسالة كاملةً: أوّل سطرٍ هو الموضوع وما بعده الجسد — نداءٌ واحد بلا فاصل */
    const raw = git(['show', '-s', '--format=%B', hash]);
    const newline = raw.indexOf('\n');
    const subject = (newline === -1 ? raw : raw.slice(0, newline)).trim();
    const body = newline === -1 ? '' : raw.slice(newline + 1);

    const excuseKey = [...GRANDFATHERED.keys()].find((k) => hash.startsWith(k));
    const excused = (rule) => {
        if (!excuseKey || !GRANDFATHERED.get(excuseKey).rules.includes(rule)) return false;
        exemptionsUsed.add(`${excuseKey}:${rule}`);
        return true;
    };

    if (!SUBJECT_RE.test(subject) && !excused('PREFIX')) {
        failures.push(
            `${short}  بادئة غير مسموحة أو بلا نطاق — المسموح: ${ALLOWED_PREFIXES.join(' · ')}\n` +
                `          ${subject.slice(0, 100)}`,
        );
    }

    if (!body.includes(ZVE_PHRASE) && !body.includes(ZVE_APPROVED) && !excused('ZVE')) {
        failures.push(
            `${short}  بلا «${ZVE_PHRASE}» في الجسد (§٢·٤)\n          ${subject.slice(0, 100)}`,
        );
    }

    /*
     * الحقولُ ثلاثةٌ في إعادة التسمية (`R100\told\tnew`) واثنان فيما عداها، **والوجهة
     * هي الأخيرة دائماً**. وقراءةُ الحقل الثاني وحده تُسمّي المصدرَ القديم في النقل،
     * فيُحاكَم مسارٌ لم يَعُد موجوداً — وهو ما يُسقط قاعدةَ `docs(` على الوجه الخطأ.
     */
    const entries = git(['show', '--name-status', '--format=', hash])
        .split('\n')
        .filter(Boolean)
        .map((line) => line.split('\t'))
        .filter((parts) => parts.length >= 2 && parts[parts.length - 1]);

    const touched = entries.map((parts) => parts[parts.length - 1]);

    /* §٢·٥ — تعديلُ خطّ أساسٍ قائم يستلزم بادئة baseline( */
    const changed = entries.filter((parts) => /baseline.*\.json$/.test(parts[parts.length - 1]));

    const modifiedBaselines = changed
        .filter((parts) => parts[0].startsWith('M'))
        .map((parts) => parts[parts.length - 1]);
    const addedBaselines = changed
        .filter((parts) => parts[0].startsWith('A'))
        .map((parts) => parts[parts.length - 1]);

    if (modifiedBaselines.length > 0 && !subject.startsWith('baseline(') && !excused('BASELINE')) {
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

    /* §٢·١ — التزامُ توثيقٍ لا يُحرّك شفرة */
    if (subject.startsWith('docs(')) {
        const offending = touched.filter(violatesDocsScope);
        if (offending.length > 0 && !excused('DOCS_SCOPE')) {
            failures.push(
                `${short}  بادئة docs( على ملفّاتٍ خارج حدّها (§٢·١) — ${offending.length} ملفّاً\n` +
                    `          ${offending.slice(0, 6).join(', ')}${offending.length > 6 ? ' …' : ''}\n` +
                    '          المسموح: *.md أينما كان · وغيرُ القابل للتنفيذ تحت .audit/ أو perf-reports/',
            );
        }
    }
}

/*
 * إعفاءٌ لا يُستهلَك يُوهم بحراسةٍ أضيق ممّا هي، فيُعلَن بدل أن يُنسى. والمُسجَّل
 * قبل الحقبة خارج المدى بحكم التعريف، فلا يُعدّ نسياناً — ويُقال ذلك صراحةً.
 */
for (const [key, entry] of GRANDFATHERED) {
    if (entry.preEpoch) continue;
    const unused = entry.rules.filter((rule) => !exemptionsUsed.has(`${key}:${rule}`));
    if (unused.length > 0) {
        notes.push(
            `${key}  إعفاءٌ لم يُستهلَك (${unused.join(' · ')}) — المخالفة زالت أو خرج من المدى، ` +
                'فيُحذف من GRANDFATHERED',
        );
    }
}

const activeExemptions = [...GRANDFATHERED.values()].filter((e) => !e.preEpoch).length;

console.log(
    `[commit-conventions] فُحص ${hashes.length} التزاماً منذ ${epoch.slice(0, 8)}، ` +
        `و${activeExemptions} إعفاءً مقيَّداً بقاعدته داخل المدى ` +
        `(و${GRANDFATHERED.size - activeExemptions} سجلّاً لِما قبل الحقبة، لا يُستشار)`,
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
