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
import { readFileSync } from 'node:fs';

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
 * محارفُ لا مكان لها في رسالةٍ — ووجودُها **علامةُ ترميزٍ فاسد** لا ذوقٍ سيّئ.
 *
 * تشمل: C0 عدا `\t` و`\n` و`\r` · DEL · **C1 كاملةً** · وعلامةَ الترتيب U+FEFF.
 *
 * ### الحادثتان اللتان كتبتا هذه القاعدة، وكلتاهما وقعت فعلاً
 *
 * **(أ) BOM قبل البادئة.** رسالةٌ كُتبت بـ`Out-File -Encoding utf8` في PowerShell 5.1
 * حملت U+FEFF قبل `docs(`، فكسرت البادئة — وكلّفت ساعات. وكان §٣ في الميثاق ينسب هذا
 * الفحص إلى `826cd335`، **ولم يكن موجوداً في الحارس**. فجُعل صادقاً بدل أن يُحذف.
 *
 * **(ب) ترميزٌ مزدوج، ٢٠٢٦-٠٩-١٣.** رسالةٌ مرّت بـ`(Get-Content -Raw)` — وهو **يفكّ
 * UTF-8 على أنّه ANSI** — ثمّ كُتبت UTF-8 ثانيةً، فصار موضوعُها ٣٧١ بايتاً من محارف
 * لا تُقرأ. أُمسكت قبل الدفع؛ **ولو دُفعت لبقيت أبداً**، لأنّ تاريخاً منشوراً لا يُعاد
 * كتابته (§٢·٦).
 *
 * ### ولماذا حروفُ التحكّم لا نسبةُ البايت إلى المحرف
 *
 * قِيست الاثنتان على الحادثة نفسها:
 *
 *     سليم            : ١٠٦ محرفاً · ١٨٥ بايتاً · **صفر** حرفِ تحكّم   (١٫٧٥ بايت/محرف)
 *     مزدوجُ الترميز  : ١٨٥ محرفاً · ٣٤٢ بايتاً · **٤٧** حرفَ تحكّم    (١٫٨٥ بايت/محرف)
 *
 * **فالنسبة لا تفصل، وحروفُ التحكّم تفصل قطعاً** — لأنّ بايتات الاستمرار في UTF-8
 * (0x80–0xBF) تُفكّ إلى C1 حين تُقرأ أحاديّةَ البايت. والقاعدة عامّةٌ لا مُفصَّلةً على
 * حادثة: أيّ فسادِ ترميزٍ من صفحةٍ أحاديّة البايت يُخلّف C1.
 *
 * وطُبّقت على ٥٥ التزاماً في المدى قبل شحنها: **صفر مخالف**، فلا إعفاء يلزم.
 *
 * > وملحوظةٌ تخصّ من يكتب رسالةً بأداةٍ تُفكّ JSON: هروبُ المحرف الصفريّ مكتوباً نصّاً
 * > في حمولةٍ JSON **يُنتج بايت NUL حقيقياً**، وgit يرفضه صراحةً (`a NUL byte in commit
 * > log message not allowed`) — وقد وقع ذلك هنا مرّتين: في رسالةٍ أوّلاً، **ثمّ في هذا
 * > الملفّ نفسه**. فلا يُكتب محرفُ تحكّمٍ ولا هروبُه في هذا المصدر — تُكتب نقطتُه رقماً.
 */

/**
 * النطاقاتُ الممنوعة **بنقاطٍ عدديّة، لا بمحارفَ ولا بهروب**.
 *
 * **وهذا تصحيحُ عطلٍ وقع في هذا الموضع بعينه:** كان الصنف مكتوباً بمحارفِ تحكّمٍ
 * **حقيقيّة** (سبعةُ بايتات)، فصار الملفّ **ثنائياً عند git** — لا فرقَ يُقرأ له في
 * مراجعة، وأيُّ أداةٍ تُنظّف النصّ تُفرغ الصنفَ **بلا أن يحمرّ شيء**. أي أنّ الحارس
 * الذي يمنع بايتات التحكّم كان يحملها في مصدره، **ولم يكن يفحص نفسه**.
 *
 * والسلوك محفوظٌ حرفاً: NUL وBEL وBOM تُمسك، والشَّرطة `-` والنصُّ العاديّ لا يُمسّان.
 */
const FORBIDDEN_RANGES = [
    [0x00, 0x08], // C0 عدا tab وlf
    [0x0b, 0x0c],
    [0x0e, 0x1f],
    [0x7f, 0x9f], // DEL وC1 — أثرُ فكّ UTF-8 بصفحةٍ أحاديّة البايت
    [0xfeff, 0xfeff], // علامةُ ترتيب البايت
];

/** نقاطُ كلّ محرفٍ ممنوعٍ في النصّ — بديلُ `matchAll` على صنفٍ يحمل محارفَ تحكّم. */
function findForbiddenCodePoints(text) {
    const found = [];
    for (const char of text) {
        const codePoint = char.codePointAt(0);
        if (FORBIDDEN_RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi)) {
            found.push(codePoint);
        }
    }
    return found;
}

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

/**
 * **طَورٌ سابقٌ للالتزام — ولماذا وُجد.**
 *
 * البوّابة تُشغَّل **قبل** الالتزام، وهذا الحارس يقرأ التاريخ — **فالرسالةُ التي تُكتب
 * لا تُفحص أبداً، بل التي قبلها.** تأخُّرٌ بالتزامٍ واحد، وقع أثرُه مرّتين في يومٍ واحد
 * (٢٠٢٦-٠٩-١٣): بادئةُ `docs(` على سكربت، وBOM في موضوعٍ كتبته أداةٌ تُضيفه —
 * **وكلتاهما لزمها `amend` بعد وقوعها**، ولم يكن في العُدّة ما يسبقها.
 *
 *     node scripts/guard-commit-conventions.mjs --pending <ملفّ الرسالة>
 *
 * يفحص **الرسالةَ المعلّقة** مع `git diff --cached --name-status` بالقواعد نفسها، قبل
 * أن يصير الالتزام تاريخاً. **ولا إعفاءات في هذا الطور:** الإعفاءُ يُمنح لتاريخٍ منشور
 * لا يُعاد كتابته، **وما لم يُلتزَم بعدُ يُصلَح لا يُعفى**.
 *
 * **ولا يُغني عن الطور التاريخيّ ولا يُلغيه:** ذاك يفحص المدى كلَّه، وهذا واحداً.
 */
const pendingIndex = process.argv.indexOf('--pending');
const pendingMessageFile = pendingIndex === -1 ? null : process.argv[pendingIndex + 1];
if (pendingIndex !== -1 && !pendingMessageFile) {
    console.error('[commit-conventions] FAIL — `--pending` بلا مسار ملفّ الرسالة.');
    process.exit(1);
}

/** `STATUS\tمسار` أو `R100\tقديم\tجديد` — والوجهةُ هي الأخيرة دائماً. */
function parseNameStatus(text) {
    return text
        .split('\n')
        .filter(Boolean)
        .map((line) => line.split('\t'))
        .filter((parts) => parts.length >= 2 && parts[parts.length - 1]);
}

const epoch = pendingMessageFile ? null : resolveEpoch();

const units = pendingMessageFile
    ? [
          {
              label: 'PENDING ',
              hash: '',
              raw: readFileSync(pendingMessageFile, 'utf8'),
              entries: parseNameStatus(git(['diff', '--cached', '--name-status'])),
          },
      ]
    : git(['rev-list', '--no-merges', `${epoch}..HEAD`])
          .split('\n')
          .filter(Boolean)
          .map((hash) => ({
              label: hash.slice(0, 8),
              hash,
              raw: git(['show', '-s', '--format=%B', hash]),
              entries: parseNameStatus(git(['show', '--name-status', '--format=', hash])),
          }));

const failures = [];
const notes = [];
/** كلّ إعفاءٍ استُهلك فعلاً — ليُقال في النهاية أيُّها لم يَعُد له داعٍ. */
const exemptionsUsed = new Set();

for (const unit of units) {
    const short = unit.label;
    /* %B هو الرسالة كاملةً: أوّل سطرٍ هو الموضوع وما بعده الجسد — نداءٌ واحد بلا فاصل */
    const raw = unit.raw;
    const newline = raw.indexOf('\n');
    const subject = (newline === -1 ? raw : raw.slice(0, newline)).trim();
    const body = newline === -1 ? '' : raw.slice(newline + 1);

    /* الرسالةُ المعلّقة بلا تجزئة، فلا إعفاء لها — وذلك مقصود لا أثرٌ جانبيّ. */
    const excuseKey = unit.hash
        ? [...GRANDFATHERED.keys()].find((k) => unit.hash.startsWith(k))
        : undefined;
    const excused = (rule) => {
        if (!excuseKey || !GRANDFATHERED.get(excuseKey).rules.includes(rule)) return false;
        exemptionsUsed.add(`${excuseKey}:${rule}`);
        return true;
    };

    /*
     * الترميز أوّلاً: رسالةٌ فاسدة الترميز تُفشل كلّ قاعدةٍ بعدها لأسبابٍ كاذبة —
     * فبادئةٌ خلفها BOM «غير مسموحة»، وعبارةُ التجميد «غائبة» وهي مكتوبة.
     */
    const forbidden = findForbiddenCodePoints(raw);
    if (forbidden.length > 0 && !excused('ENCODING')) {
        const points = [
            ...new Set(
                forbidden.map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`),
            ),
        ];
        failures.push(
            `${short}  ${forbidden.length} محرفَ تحكّمٍ أو علامةَ ترتيب في الرسالة ` +
                `(${points.slice(0, 8).join(' · ')}${points.length > 8 ? ' …' : ''}) — علامةُ ترميزٍ فاسد\n` +
                `          ${subject.slice(0, 80)}\n` +
                '          رسالةٌ تُكتب بأداةٍ تُخرج UTF-8 بلا BOM، ولا تُقرأ ولا تُكتب عبر PowerShell 5.1.',
        );
    }

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
    const entries = unit.entries;

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
    /* في الطور المعلّق لم يُمسح مدىً، فغيابُ الاستهلاك لا يدلّ على شيء. */
    if (pendingMessageFile) break;
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
    pendingMessageFile
        ? `[commit-conventions] فُحصت رسالةٌ معلّقة (${pendingMessageFile}) و${units[0].entries.length} ` +
          'ملفّاً مُدرَجاً — بلا إعفاءات، وبلا مسحِ تاريخ'
        : `[commit-conventions] فُحص ${units.length} التزاماً منذ ${epoch.slice(0, 8)}، ` +
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
