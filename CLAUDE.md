# Hami-app — Tier-1 Production Hardening: CLAUDE.md

> **ملف التعليمات الرسمي لمراجعة المستقلين والاعتمادات المستقبلية.**
> **Version:** `package.json` → `version` · **Node:** `.nvmrc` · **Branch:** `git rev-parse --abbrev-ref HEAD`
>
> **قواعدُ هذا الملفّ مُلزِمة، وليس فيه سرد.** و**لماذا** صار كلُّ بندٍ إلى ما هو عليه —
> الحادثةُ والقياسُ والخطأُ الذي صُحّح بعده — في [`.audit/CHARTER_HISTORY.md`](.audit/CHARTER_HISTORY.md).
>
> **ومبدأٌ يسري على الملفّ كلّه:** **حقيقةٌ تتغيّر لا تُكتب هنا، بل يُكتب الأمرُ الذي
> يقولها.** فلا رقمَ خطِّ أساسٍ ولا اسمَ فرعٍ ولا عدّةَ حرّاسٍ تُنسخ إلى هنا — تُقرأ من
> مكانها. *(هذا المبدأ نفسه كُتب بعد أن أخطأ §٣ ثلاث مرّات و§٤ مرّتين.)*

---

## §1 — Tech Stack (مكانُ كلّ تثبيت — لا نسخةٌ مكرّرة)

| Layer | Package | مكانُ التثبيت |
|---|---|---|
| Runtime | Node.js | `.nvmrc` |
| Core | React (+ `react-dom`) | `package.json` `dependencies` |
| Bundler | Vite (+ `@vitejs/plugin-react`) | `package.json` `dependencies` |
| Language | TypeScript | `package.json` `devDependencies` |
| Styling | Tailwind CSS (+ `@tailwindcss/vite`) | `package.json` `dependencies` |
| State | Zustand | `package.json` `dependencies` |
| Native | Capacitor (النواةُ والإضافات بمجالٍ رئيسيٍّ واحد) | `package.json` `dependencies` |
| BaaS/Auth/RPC | `@supabase/supabase-js` | `package.json` `dependencies` |
| E2E | `@playwright/test` | `package.json` `devDependencies` |
| Unit/integration | Vitest (+ `@vitest/coverage-v8`) | `package.json` `devDependencies` |
| Telemetry | `@sentry/react` (لا إضافةَ Capacitor) | `package.json` `dependencies` |
| Package manager | npm (strict lockfile-3) | `.npmrc` · `package-lock.json` |

**والنسخُ تُقرأ بأمرٍ لا من هنا:**

```bash
node -e "const p=require('./package.json');console.log(p.dependencies,p.devDependencies)"
```

> *(كان هذا الجدول يحمل النسخ فتقادم في أربعة صفوف — Zustand ومجالٌ رئيسيٌّ كامل،
> وSentry ومجالان، وVite وTailwind في القسم الخطأ. [`CHARTER_HISTORY.md §١`](.audit/CHARTER_HISTORY.md).)*

---

## §2 — Atomic Commit Rules

1. **Prefix (Conventional Commits STRICT):**
   ```
   fix(scope):     — bug-correction only (no feature)
   feat(scope):    — new behavior (gate:wave0 MUST PASS)
   docs(scope):    — لا يُحرّك شفرة. يُسمح: أيّ *.md · وما تحت .audit/ أو
                     perf-reports/ ما لم يكن قابلاً للتنفيذ (.ts .tsx .js .jsx .mjs .cjs)
                     — وهو ما يفرضه guard:commit-conventions حرفاً
   refactor(scope):— behavior equivalent, T1/T2/T3 style examples
   chore(scope):   — dep bumps, ci-tweaks only (no logic)
   baseline(scope):— RARE — ONLY for --save ratchet baseline corrections
   ```
2. **Bisectable**: كل commit مهمة واحدة فقط. لا خلط T1+T2.
3. **One-rule fail = amend**: إذا اخفق guard، لا تدمج تصحيحه مع مهمة أخرى؛ اعمل amend أو commit منفصل.
4. **Zero Visual Edits flag**: رسالة الـ commit **مستحقة** إفادة `Zero Visual Edits = confirmed` إلا في حال تعديل واجهة صريح بموافقة المستخدم.
5. **Baseline: prefix REQUIRED for `--save`**: أي `--save` لـ ratchet **يجب** أن يبدأ بـ `baseline(scope):` مع سبب موثق + موافقة المستخدم verbatim في رسالة الـ commit.
6. **No force push** مطلقًا على أيّ فرعٍ منشور — `main` · `release/*` · وكلُّ فرعِ عملٍ
   دُفع إلى `origin`. **والمعيار «أمنشورٌ هو؟» لا اسمُه.**

---

## §3 — Quality Gates (القائمةُ مُشتقّة لا معدودة)

> Runner الرسمي: `node scripts/run-gate-wave0.mjs` (يكتشف npm.cmd + shell:true على Windows تلقائيًا — لا `npm run gate:wave0` مباشر).

> **الحرّاسُ وترتيبُهم وعدّتُهم يُشتقّون بأمرٍ، لا بعدّ صفوف هذا الجدول:**
>
> ```bash
> node -e "const s=require('./package.json').scripts['gate:wave0'];const m=[...s.matchAll(/npm run (guard:[A-Za-z0-9:_-]+)/g)].map(x=>x[1]);console.log(m.length, m)"
> ```
>
> **والجدولُ أدناه وصفٌ لكلّ حارسٍ لا تعدادٌ له** — فمَن وجد اختلافاً فالأمرُ هو الحُجّة.
> **ولا يُكتب فيه فحصٌ لا يُقابله سطرٌ في سكربته.**
> *(أخطأ هذا الجدول ثلاث مرّات قبل هذه القاعدة — [`CHARTER_HISTORY.md §٣`](.audit/CHARTER_HISTORY.md).)*

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
| 13 | `guard:screen-closure` | إغلاقُ الشاشات المسجّلة داخل ميزانيةِ كلٍّ منها (بالكيلوبايت) |
| 14 | `guard:source-paths` | ملفات الـ source روابطها غير معطلة — **ويقرأ `.md` أيضاً** |
| 15 | `guard:tailwind-source` | Tailwind source content ملموس، لا يكرر السورس |
| 16 | `guard:injected-globals` | define ↔ declare ↔ استعمال متطابقة لكلّ عَلَمٍ مُحقَن |
| 17 | `guard:ci-covers-guards` | كل `guard:*` مربوط بـCI أو بالبوّابة، والمستثنى بسببٍ مكتوب |
| 18 | `guard:gate-harness-paths` | عُدّة البوّابات: مرشّحات المسارات وخطوات التشغيل (أُضيف `00ecf4a4`؛ وأسنانه ناقصة في أربع صيغ YAML — F3) |
| 19 | `guard:supabase-info-boundary` | `info.ts` محصور في devFallbackConfig وحده |
| 20 | `guard:tracked-secrets` | لا سرَّ من قائمة الحارس يظهر في ملفٍّ متتبَّع |
| 21 | `guard:shell-auth-prod` | production shell auth fail-closed |
| 22 | `guard:prod-env-contract` | مفاتيحُ `VITE_` موثّقةٌ + parity + BFF/Auth مُغلَقان |
| 23 | `guard:security-headers` | vercel.json · vercel-hq.json · public/_headers في تزامن تام |
| 24 | `guard:tsc` | TS diagnostics ≤ baseline أحادي الاتجاه (لكل ملفّ) |
| 25 | `guard:cloud-types` | الملفّاتُ السحابية الحاسمة (قائمةُ الحارس) بلا أخطاء أنواع |
| 26 | `guard:lint` | ESLint ≤ baseline |
| 27 | `guard:execution-window-confirm` | execution paths لا تستخدم `window.confirm` |
| 28 | `guard:execution-modal-mobile` | execution modals dvh + pointer-events safe |
| 29 | `guard:root-pointer-events` | لا كتابة `pointer-events` بجانب `document.documentElement` |
| 30 | `guard:tests` | Vitest failing ≤ baseline؛ KNOWN_TIMING_FLAKES بسقفٍ موثّق |
| 31 | `guard:architecture-boundaries` | 4 طوابق T21 (api/services/domain+application) ≤ baseline |

### حرّاسٌ خارج البوّابة — صنفان، ولكلٍّ سببه

**والقائمةُ تُشتقّ لا تُعدّ** (فرقُ كلّ `guard:*` عن المُسجَّلين في `gate:wave0`):

```bash
node -e "const p=require('./package.json');const g=new Set([...p.scripts['gate:wave0'].matchAll(/npm run (guard:[A-Za-z0-9:_-]+)/g)].map(x=>x[1]));console.log(Object.keys(p.scripts).filter(k=>/^guard:/.test(k)&&!g.has(k)))"
```

**الصنف الأوّل — يحتاج `dist`**، فلا معنى لطلبه قبل بناء، **ويُشغّله CI بعد البناء**.
**والصنف الثاني — `guard:baseline` وحده:** **يكتب** خطوط الأساس بدل فحصها، فتشغيله يمحو
المِسنَنة — وهو مسجَّل في `NOT_FOR_CI` بسببه، ومعفىً من البوّابة صراحةً
بـ`alsoExemptFromWave0`. **وربطُ كلٍّ منهما بـCI محروسٌ بـ`guard:ci-covers-guards`**،
فالسهوُ يسقط بالحارس لا بمراجعةِ هذا السطر.

### بوّابةٌ متناسبة — رخصةٌ مشروطةٌ بثلاثة، لا إعفاء

**الأصل: البوّابة كاملةً قبل كلّ commit.** ويجوز تشغيل **مجموعةٍ فرعية** بدلها **إذا
تحقّقت الثلاثة معاً، وإلا فالكلّ**:

1. **الافتراض هو الكلّ.** أيّ ملفٍّ في التغيير لا يقع في صنفٍ **معلَنٍ** مسبقاً ⇒
   البوّابة كاملة. الفشل إلى الأمان، لا إلى التخطّي. **وتعذُّرُ التحليل ليس نجاحاً** — وهذا
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
>
> **وله أجلٌ يسقط به:** إن لم يُشحن حارسُه **ومعه اختبارُه السلبيّ** — **يُحذف هذا
> القسم كلّه**، ولا يُمدَّد إلا بكلمةٍ من المالك. **والنصُّ الذي لا يصير آلةً يُحذف
> ولا يُورَّث.** *(ولماذا كُتب، ولماذا له أجل — [`CHARTER_HISTORY.md §٣`](.audit/CHARTER_HISTORY.md).)*

---

## §4 — 6 Ratchet Baselines + Save Policy

> **لا أرقامَ في هذا الجدول — وذلك تصحيحٌ لا نقص.** ما يُكرَّر بيدٍ يتقادم، **وحراسةُ
> نسخةٍ مكرّرة أضعفُ من حذفها.** فبقي مكانُ الحقيقة والأمرُ الذي يقولها.
> *(أخطأ هذا الجدول مرّتين في يومين — [`CHARTER_HISTORY.md §٤`](.audit/CHARTER_HISTORY.md).)*

| Ratchet | مكانُ الحقيقة | الاتّجاه المسموح |
|---|---|---|
| tsc errors | `.audit/tsc-ratchet-baseline.json` | ≤ baseline فقط |
| lint errors | `.audit/lint-baseline.json` | ≤ baseline فقط |
| dead exports | `.audit/dead-exports-baseline.json` | ≤ baseline فقط |
| test failures | `.audit/test-ratchet-baseline.json` | ≤ baseline فقط (+ flakes موثّقة) |
| arch boundaries 4-floor | `.audit/architecture-boundaries-baseline.json` | ≤ baseline فقط |
| import closure broken | — | **صفرٌ حصراً، ولا `--save` أبداً** |

**وأرقامُها تُقرأ بأمرٍ لا بالعين:**

```bash
node scripts/run-gate-wave0.mjs      # كلّ مِسنَنة تطبع: baseline → current
```

**ولا يُنقل رقمٌ من هنا إلى وثيقةٍ أخرى.** ومن أراد رقماً فليُشغّل الأمر: **الملفُّ هو
الحُجّة، ولا حُجّة في جدول.**

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

## §6 — 20 Critical Paths

> **مساراتٌ لا أرقام، وروابطُ نسبيةٌ لا مطلقة** — فالقسم وظيفتُه أن يفتحها مراجعٌ ليس
> المالك. *([`CHARTER_HISTORY.md §٦`](.audit/CHARTER_HISTORY.md).)*

1. [package.json](package.json) — Stack pins + `guard:*` scripts + `gate:wave0`
2. [.nvmrc](.nvmrc) — Node 24.x pin
3. [capacitor.config.ts](capacitor.config.ts) — native shell config
4. [vite.config.mts](vite.config.mts) — Bundler + manualChunks + build sourcemaps
5. [tsconfig.json](tsconfig.json) + [tsconfig.app.json](tsconfig.app.json) — strict options
6. [eslint.config.js](eslint.config.js) — global ESLint (لا يحتوي T21 blocks)
7. [.audit/eslint-arch-boundaries.config.js](.audit/eslint-arch-boundaries.config.js) — T21 dedicated config
8. [src/app/runtime/eventConstants.ts](src/app/runtime/eventConstants.ts) — T1 SSOT 45 events
9. [src/app/bootstrap/LOADER_HYDRATOR_ORDER.md](src/app/bootstrap/LOADER_HYDRATOR_ORDER.md) — T3 33-entry registry
10. [src/app/bootstrap/bootReveal.ts](src/app/bootstrap/bootReveal.ts#L119-L147) — markBootRevealDone + SecureStore kickoff
11. [src/app/services/SecureStoreService.ts](src/app/services/SecureStoreService.ts#L1993-L2017) — idle deferral dual mechanism
12. [scripts/run-gate-wave0.mjs](scripts/run-gate-wave0.mjs) — العدّاءُ الرسميّ، cross-platform (القائمة تُشتقّ من `scripts["gate:wave0"]`، فلا تتباعد)
13. [scripts/guard-tsc-ratchet.mjs](scripts/guard-tsc-ratchet.mjs) — tsc ratchet (`.audit/tsc-ratchet-baseline.json`)
14. [scripts/guard-lint-ratchet.mjs](scripts/guard-lint-ratchet.mjs) — lint ratchet (`totalErrors` في `.audit/lint-baseline.json`)
15. [scripts/guard-test-ratchet.mjs](scripts/guard-test-ratchet.mjs) — test ratchet (`.audit/test-ratchet-baseline.json`) + سقفُ الفَلَتات الموسومة في السكربت
16. [scripts/guard-dead-exports.mjs](scripts/guard-dead-exports.mjs) — dead exports (`.audit/dead-exports-baseline.json`)
17. [scripts/guard-architecture-boundaries.mjs](scripts/guard-architecture-boundaries.mjs) — T21 4-floor (`.audit/architecture-boundaries-baseline.json`)
18. [scripts/sync-security-headers.mjs](scripts/sync-security-headers.mjs) — vercel + _headers triple sync
19. [.github/workflows/quality-gate.yml](.github/workflows/quality-gate.yml) — مدخلُ بوّابة CI (وتغطيتُه محروسةٌ بـ`guard:ci-covers-guards`، لا بعددٍ مكتوب هنا)
20. [supabase/migrations/](supabase/migrations/) — هجراتُ T2، ومنها المُقسّاة بـ`search_path`

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
   > **وإذنٌ عامّ لا يُغني عن موافقةٍ مخصوصة حيث اشترطها الميثاق** (§٤ مثلاً).
   >
   > **وضعفُ هذا الاستثناء مُعلَنٌ لا مُداوى: صاغه المنفِّذ نفسه**، ولا يُصلحه مزيدُ نصٍّ
   > من اليد نفسها. **فالعلاج نقلُ الحكم:** كلُّ استعمالٍ لهذه الصلاحية **يُدرَج في موجز
   > المراجعة** باسم التزامه واقتباس إذنه وما فُحص قبله، **ليُحاكَم من مستقلّ**
   > (المرحلة ٥ أدناه).
4. **Phase 4 — Implement:** تنفيذ كل مهمة بالترتيب:
   - ✅  **Commit ذري لكل مهمة** (prefix Conventional Commits الصحيح)
   - ✅  `run-gate-wave0.mjs` exit=0 **على الشجرة التي تُلتزم** قبل كل commit
   - ✅  كلُّ المِسنَنات ≤ خطوطِ أساسها (§٤)
   - ✅  Zero Visual Edits مؤكد في رسالة commit

   > ### إتمامُ العمل — التزامٌ ذاتيّ لا يُنتظر فيه سؤال
   >
   > **أُضيف ٢٠٢٦-٠٩-١٣ بإذنٍ حرفيّ:** «عملك يجب ان تكمله ان كان به نقص او عيب … وانت
   > من تتحرّك وتتأكّد من تلقاء نفسك دون الحاجة الى سؤالك».
   >
   > **القاعدة:** لا يُسلَّم عملٌ فيه نقصٌ أو عيبٌ **يعرفه المنفِّذ**. ومَن وجد نقصاً في
   > عمله **يُتمّه من تلقاء نفسه** ولا يستأذن في إتمامه — فالإذنُ يُطلب لما لا يُستردّ،
   > **لا لإنهاء ما بدأه**. وسؤالُ المالك «أأكمل؟» عن عيبٍ في عملي **تعطيلٌ باسم الحيطة**.
   > **والسؤالُ ليس بديلاً عن الإتمام.**
   >
   > **وأربعةٌ تُفحص قبل أن يُقال «تمّ»** (وكلٌّ منها وقع — السجلّ في `CHARTER_HISTORY`):
   >
   > 1. **الحلُّ الرخيص عيبٌ لا علاج.** وأوضحُ صوره: **تسميةُ عطلٍ بلا قياس علاجه.**
   >    ومنها: إسكاتُ أحمر · رفعُ عتبةٍ بلا قياس نطاقها · وصفٌ في وثيقةٍ بدل آلةٍ تفرضه.
   > 2. **القياسُ المعلَّق يُحسم أو يُسمّى معلّقاً بسببه.** «لا أزعم أنّها تسقط ولا أنّها
   >    تمرّ» **موقفٌ مؤقّت لا خلاصة**؛ إن أمكن حسمُه بتشغيلةٍ أخرى فيُشغَّل.
   > 3. **يُفحَص المُخرَج بالأداة التي شُحنت له.** مَن شحن فحصاً ثمّ لم يُجرِه على
   >    مخرجاته هو **أوّلُ من يخرقه**.
   > 4. **ما أدخلتَه أنت تُصلحه أنت.** أثرٌ جانبيّ ناتجٌ عن تغييري **ليس ديناً موروثاً**
   >    يُكتفى بوصفه.
   >
   > **وما يجوز تركه، حصراً — ويُسمّى ولا يُسكت عنه:** قرارٌ هو للمالك بطبيعته (سياسةُ
   > بيانات · مالٌ · محتوىً تشغيليّ لا يملكه المنفِّذ) · أو ما يتطلّب وصولاً لا يملكه
   > المنفِّذ · أو عملٌ مقيسٌ يتجاوز نطاق المهمّة صراحةً. **ولكلٍّ يُكتب: ما قِيس · ولماذا
   > تُرك · وما الذي يفتحه.** وما عدا ذلك **يُتمّ**.
5. **Phase 5 — Review:** مستقل يتحقق من:
   - كلُّ مهمّةٍ في `tasks.md` مُنفّذة — **والمتروك يُقبل فقط ضمن الحصر في المرحلة ٤
     أعلاه، ومعه قياسُه وسببُه**؛ «موافقةُ المالك» وحدها لا تُبرّر تسليماً ناقصاً
   - البوّابة كاملةً PASS ×3 runs متتالية (Determinism)
   - كل TR في كل مهمة مُحقّق ب دليل حقيقي (grep / run / hash / screenshot)
   - **لا يُعتمد self-review:** نفس اللاعب لا يُحكم على عمله

---

> End of CLAUDE.md. تحديث الرسمي يجب أن يمر ب gate:wave0 exit=0 ثم annotated commit.
