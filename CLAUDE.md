# Hami-app — Tier-1 Production Hardening: CLAUDE.md

> **ملف التعليمات الرسمي لمراجعة المستقلين والاعتمادات المستقبلية.**
> **Version:** v10.5.0-tier1-hardened · **Branch:** improve/current · **Node:** 24.x (`cat .nvmrc`)

---

## §1 — Tech Stack & Versions (Pin-Exact unless stated)

| Layer | Package | Pinned version | Source |
|---|---|---|---|
| Runtime | Node.js | `24.x` | `.nvmrc` |
| Core | React | `18` | `package.json` `dependencies` |
| Bundler | Vite | `7` | `package.json` `devDependencies` |
| Language | TypeScript | `5.9` | `package.json` `devDependencies` |
| Styling | Tailwind CSS | `4` | `package.json` `devDependencies` |
| State | Zustand | `4.x` | `package.json` `dependencies` |
| Native | Capacitor | `8` (+ plugins same major) | `package.json` |
| BaaS/Auth/RPC | Supabase (supabase-js) | `2.108` | `package.json` |
| E2E | Playwright | latest stable lockfile | `package.json` |
| Unit/integration | Vitest | pinned | `package.json` |
| Telemetry | Sentry (client + cap plugin) | pinned 8.x matching major | `package.json` |
| Package manager | npm (strict lockfile-3) | Node 24 default | `.npmrc` |

---

## §2 — Atomic Commit Rules

1. **Prefix (Conventional Commits STRICT):**
   ```
   fix(scope):     — bug-correction only (no feature)
   feat(scope):    — new behavior (gate:wave0 MUST PASS)
   docs(scope):    — .md only, no TSX/TS/CSS
   refactor(scope):— behavior equivalent, T1/T2/T3 style examples
   chore(scope):   — dep bumps, ci-tweaks only (no logic)
   baseline(scope):— RARE — ONLY for --save ratchet baseline corrections
   ```
2. **Bisectable**: كل commit مهمة واحدة فقط. لا خلط T1+T2.
3. **One-rule fail = amend**: إذا اخفق guard، لا تدمج تصحيحه مع مهمة أخرى؛ اعمل amend أو commit منفصل.
4. **Zero Visual Edits flag**: رسالة الـ commit **مستحقة** إفادة `Zero Visual Edits = confirmed` إلا في حال تعديل واجهة صريح بموافقة المستخدم.
5. **Baseline: prefix REQUIRED for `--save`**: أي `--save` لـ ratchet **يجب** أن يبدأ بـ `baseline(scope):` مع سبب موثق + موافقة المستخدم verbatim في رسالة الـ commit.
6. **No force push** مطلقًا على الأفرع الرسمية (improve/current · main · release/*).

---

## §3 — Quality Gates (31 Registered Guards)

> Runner الرسمي: `node scripts/run-gate-wave0.mjs` (يكتشف npm.cmd + shell:true على Windows تلقائيًا — لا `npm run gate:wave0` مباشر).

> **هذا الجدول مُشتقّ من `scripts["gate:wave0"]` في `package.json` بالترتيب نفسه.**
> وكان قبل ٢٠٢٦-٠٩-١٠ يذكر ثلاثة حرّاس **لا وجود لهم** (`guard:install` ·
> `guard:lockfile-parity` · `guard:cloud-delete-audit`) ويُسقط تسعةً قائمين —
> أي أنّ السجلّ الرسمي كان خاطئاً في اثني عشر صفّاً. صُحّح بالقياس.
>
> **وصُحّح ٢٠٢٦-٠٩-١٢ ثانيةً:** كان العنوان يقول ٢٨ والواقع **٣١**، والجدول يُسقط ثلاثةً
> أُضيفت بعده: `guard:commit-conventions` · `guard:gate-harness-paths` ·
> `guard:root-pointer-events`. **والقائمة أعلاه اشتُقّت بأمرٍ من `package.json` لا بالعين**
> (`scripts["gate:wave0"]` ← مطابقة `npm run guard:*` بالترتيب) — وهو ما يشترطه هذا
> السطر على نفسه. **فمَن وجد عدداً رابعاً فليُعِد الاشتقاق، لا أن يعدّ الصفوف.**
>
> **وصُحّح الصفُّ الأوّل ٢٠٢٦-٠٩-١٣:** كان يَنسب إلى `826cd335` فحصَ «لا BOM»،
> **ولم يكن في الحارس شيءٌ من ذلك** — `git show --stat 826cd335` يُنشئ الملفّ في ١٦٦
> سطراً، وليس فيها ذكرُ BOM. وصفٌ أكبر من الشيء، وهو بعينه ما طُعن فيه في F3.
> **فجُعل صادقاً بدل أن يُحذف:** شُحن فحصُ ترميزٍ يمنع علامةَ الترتيب **ومحارفَ التحكّم**
> معاً، وأُعيد الصفّ إلى وصف ما يُشغَّل فعلاً. **ولا يُكتب في هذا الجدول فحصٌ لا يُقابله
> سطرٌ في سكربته.**

| # | Gate script (`package.json` name) | الموصوفة |
|---|---|---|
| 1 | `guard:commit-conventions` | قواعد §٢ آلياً على كلّ التزام: البادئات · عبارة التجميد · بادئةُ `baseline(` · حدُّ `docs(` · سلامةُ ترميز الرسالة |
| 2 | `guard:ts-nocheck` | عدد ملفات `// @ts-nocheck` ≤ baseline |
| 3 | `guard:import-closure` | import graph broken=0 |
| 4 | `guard:cycles` | دوائر استيراد ساكنة ≤ baseline |
| 5 | `guard:module-twins` | لا وحدة مكرّرة بنسختين في الرسم |
| 6 | `guard:module-shadow` | لا وحدة تُظلّل أخرى (absence assertions) |
| 7 | `guard:dead-modules` | وحدات لا تُبلَغ ≤ baseline |
| 8 | `guard:dead-exports` | dead exports ≤ baseline (أحادي الاتجاه، مُفهرَس بالمسار) |
| 9 | `guard:duplicate-logic` | منطق مُكرَّر ≤ baseline |
| 10 | `guard:peer-conflicts` | peer-deps zero-conflict بعد strict install |
| 11 | `guard:native-foundation` | Capacitor pinned + native-ready templates موجود |
| 12 | `guard:cold-entry` | index.html لا يحتوي Google Fonts على critical path |
| 13 | `guard:screen-closure` | LawsuitArchiveChrome +3 شاشات داخل KB ميزانيتها |
| 14 | `guard:source-paths` | ملفات الـ source روابطها غير معطلة — **ويقرأ `.md` أيضاً** |
| 15 | `guard:tailwind-source` | Tailwind source content ملموس، لا يكرر السورس |
| 16 | `guard:injected-globals` | define ↔ declare ↔ استعمال متطابقة ×5 |
| 17 | `guard:ci-covers-guards` | كل `guard:*` مربوط بـCI أو بالبوّابة، والمستثنى بسببٍ مكتوب |
| 18 | `guard:gate-harness-paths` | عُدّة البوّابات: مرشّحات المسارات وخطوات التشغيل (أُضيف `00ecf4a4`؛ وأسنانه ناقصة في أربع صيغ YAML — F3) |
| 19 | `guard:supabase-info-boundary` | `info.ts` محصور في devFallbackConfig وحده |
| 20 | `guard:tracked-secrets` | 11+ tracked secrets لا تُكرَّم في committed files |
| 21 | `guard:shell-auth-prod` | production shell auth fail-closed |
| 22 | `guard:prod-env-contract` | 13+ VITE_ keys documented + parity + BFF/Auth closed |
| 23 | `guard:security-headers` | vercel.json · vercel-hq.json · public/_headers في تزامن تام |
| 24 | `guard:tsc` | TS diagnostics ≤ baseline أحادي الاتجاه (لكل ملفّ) |
| 25 | `guard:cloud-types` | 6 ملفات سحابية حاسمة clean types |
| 26 | `guard:lint` | ESLint ≤ baseline |
| 27 | `guard:execution-window-confirm` | execution paths لا تستخدم `window.confirm` |
| 28 | `guard:execution-modal-mobile` | execution modals dvh + pointer-events safe |
| 29 | `guard:root-pointer-events` | لا كتابة `pointer-events` بجانب `document.documentElement` |
| 30 | `guard:tests` | Vitest failing ≤ baseline؛ KNOWN_TIMING_FLAKES بسقفٍ موثّق |
| 31 | `guard:architecture-boundaries` | 4 طوابق T21 (api/services/domain+application) ≤ baseline |

### ستّة حرّاس خارج البوّابة — ولكلٍّ سببه

خمسةٌ تحتاج `dist` فلا معنى لطلبها قبل بناء، **ويُشغّلها CI**:
`guard:cold-entry:dist` · `guard:boot-critical-weight` · `guard:lawyer-inner-weight` ·
`guard:first-open-shared-tax` · `guard:dist-secrets`.

والسادس `guard:baseline` **يكتب** خطوط الأساس بدل فحصها، فتشغيله يمحو المِسنَنة —
وهو مسجَّل في `NOT_FOR_CI` بسببه، ومعفىً من البوّابة صراحةً بـ`alsoExemptFromWave0`.

### بوّابةٌ متناسبة — رخصةٌ مشروطةٌ بثلاثة، لا إعفاء

**الأصل: الـ٣١ كاملةً قبل كلّ commit.** ويجوز تشغيل **مجموعةٍ فرعية** بدلها **إذا
تحقّقت الثلاثة معاً، وإلا فالكلّ**:

1. **الافتراض هو الكلّ.** أيّ ملفٍّ في التغيير لا يقع في صنفٍ **معلَنٍ** مسبقاً ⇒ الـ٣١
   كاملة. الفشل إلى الأمان، لا إلى التخطّي. **وتعذُّرُ التحليل ليس نجاحاً** — وهذا
   بعينه عطلُ `guard:gate-harness-paths` (F3): «بلا مرشّح ⇐ تخطٍّ» حوّل كلّ فشلٍ إلى
   أخضر. لا يُعاد.
2. **الاشتقاق بالقياس لا بالعين.** لكلّ صنفٍ تُثبَت مجموعتُه **بما يقرؤه كلّ حارسٍ
   فعلاً**، لا بما يُظنّ أنّه يقرؤه. **ومثالٌ مضادّ جاهز: `guard:source-paths` يقرأ
   `.md`** — فالتزامُ وثائق **ليس** بلا حرّاس.
3. **الخريطة نفسها محروسةٌ باختبارٍ سلبيّ** يُسقطها حين تُخطئ: يُحذف مسارٌ من صنفٍ
   فيسقط الحارس **باسمه**. **وحارسٌ بلا اختبارٍ سلبيّ زينةٌ لا حارس** (§٦ من وثيقة
   الحرّاس، و`967123c0`).

> **وحتى يُشحن ذلك الحارس، البوّابة الكاملة إلزاميةٌ بلا استثناء.** هذا البند **لا
> يفتح شيئاً اليوم**؛ يشترط ثمنَ فتحه.

**ولماذا:** ٢٩ حارساً يُنجَزون في **٢ دقيقة و٥٨ ثانية**، و`guard:tests` وحده يستغرق ما
بقي من الـ١٥ دقيقة (١٢٬٢٣٣ اختباراً) — أي **نحو ٨٠٪ من زمن البوّابة**، ولا يمسّه التزامُ
`.md` بحال. **والكلفة ليست الوقت بل ما يفعله الوقت بالسلوك:** بوّابةٌ بهذا الثمن تدفع
إلى **جمع مهمّتين في التزامٍ واحد** هرباً من بوّابةٍ ثانية — وهو بعينه ما أنتج
`79315b66` (F1). فالقاعدتان — الذرّية والبوّابة — تتشادّان، وهذا البند يفكّ الشدّ
**دون أن يُرخّص التخطّي**.

---

## §4 — 6 Ratchet Baselines + Save Policy

| Ratchet | Baseline (locked JSON) | POST-T2 actual | Trend allowed | `--save` only if |
|---|---|---|---|---|
| tsc errors | **`956`** `.audit/tsc-ratchet-baseline.json` | **`955`** | ≤ baseline فقط | baseline: prefix + سبب موثق |
| lint errors | **`11`** `.audit/lint-baseline.json` | **`11`** | ≤ baseline فقط | baseline: prefix |
| dead exports | **`1885`** `.audit/dead-exports-baseline.json` | **`1878`** | ≤1885 فقط | baseline: prefix |
| test failures | **`21`** `.audit/test-ratchet-baseline.json` | **`13`** | ≤ baseline فقط | baseline: prefix + flakes documented |
| arch boundaries 4-floor | `244` (1/129/114) `.audit/architecture-boundaries-baseline.json` | **`212`** (1/127/84) | ≤244 فقط | baseline: prefix + T21 violation reason |

| import closure broken | `0` | `0` | **فقط 0** | غير مسموح به أبدًا — لا --save |

> **صُحّح ٢٠٢٦-٠٩-١٠:** كان الجدول يذكر `.audit/tsc-baseline.json` وهو **غير موجود**
> (الحارس يقرأ `tsc-ratchet-baseline.json`)، ويذكر خطّ أساس ١٨٨٨ للتصديرات الميتة
> والملفّ يقول ١٨٨٥. **خطّ الأساس في الملفّ هو الحُجّة، لا الجدول.**
>
> **وصُحّح ٢٠٢٦-٠٩-١٢ بقراءة الملفّات نفسها وسجلّ بوّابةٍ خضراء:** كان عمودُ الأساس فارغاً
> في ثلاثة صفوف، **وعمودُ «الحاليّ» يحمل الأساس في صفّ الاختبارات** (١٣ هو الحاليّ لا
> الأساس؛ `numFailedTests` في الملفّ **٢١**). والمُصحَّح: tsc أساسُه ٩٥٦ · lint **١١** لا
> ١٧٧ · التصديرات الميتة الحاليّ **١٨٧٨** لا ١٨٨١ · الطوابق الأربعة **٢١٢** (1/127/84)
> لا ٢١٩. **ولا يُنقل رقمٌ إلى هنا إلا من ملفّ الأساس أو من سجلّ تشغيلةٍ خضراء.**

### Save Policy:
```
❌ NO --save عادي حتى لو كان actual < baseline (التحسين تلقائي بدون --save)
✅ ONLY --save مسموح به في حال:
   (1) رسالة commit بادئة "baseline(scope): ..."
   (2) سبب مكتوب تفصيلي لماذا الـ baseline الجديد أكثر عدلاً
   (3) رد verbatim من المستخدم يُوافق على تصحيح الـ baseline
```

---

## §5 — Zero Visual Freeze (ZVF) Policy

**Non-negotiable من القسم ٢ verbatim:**

> لا تعديل على أي ملف يُغيّر المخرجات المرئية تحت أي ظرف — طويلاً كان أم قصيرًا.
> السماح فقط بمنطق runtime / ثوابت / استعلامات SQL / ملفات .md / imports.

### التعديلات المُمنوعة صراحة (ممنوع 100% ما لم يأذن المستخدم صراحةً):
- CSS files (src/**/*.css · *.module.css)
- className="..." assignments في .tsx
- style={{ ... }} أو sx={{ ... }} أو prop ألوان/أحجام
- تغييرات لائقة تلمّس الألوان/التباعد/الخطوط/الأنماط
- تغيير إجابات layout في Grid/Flex components

### علامة اجتياز:
كل commit في messages.txt **يجب أن يذكر** `Zero Visual Edits = confirmed` إلا إذا كان هناك تعديل واجهة صريح بموافقة المستخدم verbatim.

---

## §6 — 20 Critical Paths (Clickable file:// links)

1. [package.json](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json) — Stack pins + 31 guards scripts
2. [.nvmrc](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.nvmrc) — Node 24.x pin
3. [capacitor.config.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/capacitor.config.ts) — native shell config
4. [vite.config.mts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/vite.config.mts) — Bundler + manualChunks + build sourcemaps
5. [tsconfig.json](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/tsconfig.json) + [tsconfig.app.json](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/tsconfig.app.json) — strict options
6. [eslint.config.js](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/eslint.config.js) — global ESLint (لا يحتوي T21 blocks)
7. [.audit/eslint-arch-boundaries.config.js](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.audit/eslint-arch-boundaries.config.js) — T21 dedicated config
8. [src/app/runtime/eventConstants.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/eventConstants.ts) — T1 SSOT 45 events
9. [src/app/bootstrap/LOADER_HYDRATOR_ORDER.md](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/LOADER_HYDRATOR_ORDER.md) — T3 33-entry registry
10. [src/app/bootstrap/bootReveal.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/bootReveal.ts#L119-L147) — markBootRevealDone + SecureStore kickoff
11. [src/app/services/SecureStoreService.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/SecureStoreService.ts#L1993-L2017) — idle deferral dual mechanism
12. [scripts/run-gate-wave0.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/run-gate-wave0.mjs) — Official 31/31 runner cross-platform (القائمة تُشتقّ من `scripts["gate:wave0"]`، فلا تتباعد)
13. [scripts/guard-tsc-ratchet.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-tsc-ratchet.mjs) — tsc ratchet (`.audit/tsc-ratchet-baseline.json`)
14. [scripts/guard-lint-ratchet.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-lint-ratchet.mjs) — lint ratchet **11** (`totalErrors` في `.audit/lint-baseline.json`)
15. [scripts/guard-test-ratchet.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-test-ratchet.mjs) — test ratchet **21** + `MAX_ALLOWED_FLAKES_PER_RUN` = **13** (`:196`)
16. [scripts/guard-dead-exports.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-dead-exports.mjs) — dead exports 1885
17. [scripts/guard-architecture-boundaries.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-architecture-boundaries.mjs) — T21 4-floor JSON 244 (حالياً **212**)
18. [scripts/sync-security-headers.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/sync-security-headers.mjs) — vercel + _headers triple sync
19. [.github/workflows/quality-gate.yml](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.github/workflows/quality-gate.yml) — CI gate entry (32 related guards)
20. [supabase/migrations/](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/) — 15 search_path hardened files (T2)

---

## §7 — Review Protocol (Spec-Mode 5 Phases)

> المراجعة الرسمية لا تُنفّذ من نفس الجهة التي نفّذت التنفيذ. يجب مراجعة مستقل تتبع 5 مراحل:

1. **Phase 1 — Specify:** استدعاء `TRAE-spec-mode` Skill → إنتاج `spec.md` مع:
   - **Rule-type ACs** (ثنائية: PASS/FAIL فقط — no partial)
   - **Rubric-type ACs** (مقياس 1-5: أقل حد يُقال — e.g., Rubric≥4)
   - ZeroHallucinations: كل ادعاء له evidence path حقيقي
2. **Phase 2 — Plan:** إنتاج `tasks.md` مع:
   - مهام ذرية (كل مهمة واحدة فقط، bisectable)
   - لكل مهمة list TRs (Task Requirements) صريحة
   - ترتيب الأولويات: high first, medium بعد
3. **Phase 3 — Approve:** المستخدم يوافق صراحةً verbatim على spec.md + tasks.md بالكامل قبل أي تعديل كود. المستخدم قد يجيب على أسئلة Open Qs هنا.

   > **استثناءُ الصلاحية الموسّعة — أُقرّ ٢٠٢٦-٠٩-١٢ بإذنٍ حرفيّ من المالك.**
   > للمالك أن يمنح صلاحيةً موسّعة تنسخ «خطّةٌ ثمّ انتظار» لعملٍ بعينه؛ وحينها يُنفَّذ
   > بلا `spec.md`/`tasks.md` **بشروطٍ أربعة لا يسقط منها شيء**:
   > **(أ)** يُقتبس الإذن **حرفياً** في رسالة الالتزام الذي استُعمل فيه؛
   > **(ب)** تبقى §٢ و§٣ و§٥ كاملةً — الذرّية والبوّابة والتجميد البصريّ لا تُمسّ؛
   > **(ج)** **ما لا يُستردّ يُنفَّذ بتخويلٍ صريحٍ من المالك — حاضراً كان أم غائباً —
   > ولا يُعاد استئذانه في كلّ مرّة.**
   >
   > *(عُدّل ٢٠٢٦-٠٩-١٣ بإذنٍ حرفيّ. وكان: «ما لا يُستردّ يُطلب في كلّ مرّة ولو اتّسع
   > الإذن … وغيابُ المالك لا يوسّع الحدّ». والسبب: الصيغة القديمة كانت تُعطّل عملاً
   > مأذوناً فيه صراحةً كلّما غاب المالك، فتُحوّل الحيطة إلى جمود.)*
   >
   > **والتخويل مشروطٌ بشرطٍ واحدٍ لا يسقط: ألّا يقع فعلٌ ولا قرار إلا بعد دراسةٍ
   > وتعمّقٍ وتحقّقٍ واحتراف.** وهذا الشرط ليس وصفاً أخلاقياً يُقاس بالنيّة، بل **أربعةُ
   > التزاماتٍ تُفحص قبل كلّ فعلٍ لا يُستردّ**:
   >
   > 1. **يُكتب أثرُه قبل وقوعه:** ما الذي يتغيّر بالضبط · من يراه · أله مسار رجوع وكيف.
   > 2. **يُقاس ما يُقاس:** لا يُبنى فعلٌ لا يُستردّ على ترجيح. **ورقمٌ بلا أمرٍ يُعاد
   >    لا يصلح أساساً له** — ولو جاء من وثيقةٍ في هذا المستودع.
   > 3. **تُستوفى شروطُ ما قبله:** إن اشترط الميثاق أو التسليم شيئاً قبله — كإصلاح
   >    `section-gates.yml` قبل الدمج — فذاك **من التخويل لا استثناءٌ منه**، وتخطّيه
   >    **نقضٌ للشرط** لا اجتهادٌ فيه.
   > 4. **يُقتبس التخويل حرفياً** في رسالة الالتزام، **ويُذكر ما فُحص قبله** لا النيّة وحدها.
   >
   > **وحدٌّ واحد يبقى فوق كلّ تخويل: فعلٌ لا مسار رجوع له البتّة** — إتلافُ بياناتٍ أو
   > تاريخٍ بلا نسخة · مالٌ · مسٌّ بحسابٍ أو بطرفٍ ثالث. يُستأذن فيه بكلمةٍ مخصوصة ولو
   > اتّسع التخويل، **لأنّ الخطأ فيه لا يُصحَّح بالتزامٍ تالٍ** — وذلك هو الفرق الذي
   > يجعل هذا الحدّ قاعدةً لا شكليّة. وما دونه — دمجٌ · دفعٌ · إعادةُ تسوية · تعديلُ
   > إعدادات المستودع — **له مسار رجوع، فيدخل في التخويل ويُنفَّذ بشروطه الأربعة**.
   >
   > **وغيابُ المالك لا يوسّع الحدّ ولا يضيّقه:** ما خُوِّل يسري في غيابه، وما لم يُخوَّل
   > لا يُفعل بحجّة الغياب؛
   > **(د)** الإذن **لا يُفترض سريانه** إلى محادثةٍ جديدة ولا إلى بندٍ لم يُذكر.
   > **وإذنٌ عامّ لا يُغني عن موافقةٍ مخصوصة حيث اشترطها الميثاق** (§٤ مثلاً) — وقبولُ
   > العامّ بدل المخصوص هو ما طُعن فيه في `df26ff64` (F4)، فلا يُكرَّر بحجّة هذا السطر.
   >
   > **ولماذا كُتب:** كان الملفّ يشترط موافقةً على `spec.md`+`tasks.md` قبل أيّ كود،
   > وميثاقُ المالك المُملى يمنح صلاحيةً موسّعة تنسخ ذلك — فكان المستودع **يشهد بمخالفةٍ
   > على تنفيذٍ مأذون** (F13). والتعارضُ بين وثيقتين يُدار بالاجتهاد حتى يُحسم، والاجتهادُ
   > في النصّ أسوأ من نصٍّ صريح.
4. **Phase 4 — Implement (Current Phase):** تنفيذ كل مهمة بالترتيب:
   - ✅  **Commit ذري لكل مهمة** (prefix Conventional Commits الصحيح)
   - ✅  `run-gate-wave0.mjs` exit=0 قبل كل commit
   - ✅  6 ratchets ≤baselines
   - ✅  Zero Visual Edits مؤكد في رسالة commit
5. **Phase 5 — Review:** مستقل يتحقق من:
   - 13/13 مهام مُنفّذة (أو مع تعليق موثق لمن لم يتم بموافقة المستخدم)
   - 31/31 gates PASS ×3 runs متتالية (Determinism)
   - كل TR في كل مهمة مُحقّق ب دليل حقيقي (grep / run / hash / screenshot)
   - **لا يُعتمد self-review:** نفس اللاعب لا يُحكم على عمله

---

> End of CLAUDE.md. تحديث الرسمي يجب أن يمر ب gate:wave0 exit=0 ثم annotated commit.
