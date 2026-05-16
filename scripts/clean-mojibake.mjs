/**
 * تصحيح نصوص U+FFFD تحت src/ (آمن للتشغيل المتكرر).
 * تشغيل: node scripts/clean-mojibake.mjs
 * فحص:   node scripts/clean-mojibake.mjs --check
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "../src");
const EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);
const R = "\uFFFD";
const checkOnly = process.argv.includes("--check");

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (EXT.has(path.extname(e.name))) a.push(p);
  }
  return a;
}

function normalizeBoxLines(content) {
  return content
    .split("\n")
    .map((line) => {
      const t = line.trimStart();
      if (!line.includes(R) || !/[═─]/.test(line)) return line;
      if (t.startsWith("//") && line.includes("═")) return line.replace(/\uFFFD/g, "═");
      if (t.startsWith("{/*") && line.includes("═")) return line.replace(/\uFFFD/g, "═");
      if (t.startsWith("//") && line.includes("─")) return line.replace(/\uFFFD/g, "─");
      return line;
    })
    .join("\n");
}

const LITERAL_PAIRS = [
  [`لوحة التح${R}م: الأمر الولائي`, "لوحة التحكم: الأمر الولائي"],
  [`لوحة التح${R}${R}م: الأمر الولائي`, "لوحة التحكم: الأمر الولائي"],
  [
    `// ═════════════════════════════════════════════════${R}═════════════════════════`,
    "// ═══════════════════════════════════════════════════════════════════════════",
  ],
  [`(التبليغ والإخب${R}ر)`, "(التبليغ والإخبار)"],
  [`{/* ${R}${R} ADD PARTY BUTTON */}`, "{/* ADD PARTY BUTTON */}"],
  [
    `title="المحرك ${R}لبصري (Deep Customization)"`,
    'title="المحرك البصري (Deep Customization)"',
  ],
  [
    `const EXCEPTION_TYPES = ['تخلي', 'شيوع', 'دين', 'استرداد', 'تعرض', 'و${R}${R}ف', 'تعويض'];`,
    "const EXCEPTION_TYPES = ['تخلي', 'شيوع', 'دين', 'استرداد', 'تعرض', 'وقف', 'تعويض'];",
  ],
  [`'الح${R}${R}اسة القضائية'`, "'الحراسة القضائية'"],
  [
    `{defendants.length === 1 ? 'المدعى ${R}ليه:' : defendants.length === 2 ? 'المدعى عليهما:' : 'المدعى عليهم:'}`,
    "{defendants.length === 1 ? 'المدعى عليه:' : defendants.length === 2 ? 'المدعى عليهما:' : 'المدعى عليهم:'}",
  ],
  [`الطرف ال${R}${R}ول:`, "الطرف الأول:"],
  [
    `details: 'تم إبطال عريضة الدعوى قانوناً لتركها لل${R}${R}راجعة للمرة الثانية.'`,
    "details: 'تم إبطال عريضة الدعوى قانوناً لتركها للمراجعة للمرة الثانية.'",
  ],
  [
    `هل أنت متأكد من زوال سبب ${R}${R}نقطاع السير (مثل تبليغ الورثة أو تعيين ممثل قانوني) والرغبة في اس${R}${R}ئناف الدعوى؟`,
    "هل أنت متأكد من زوال سبب انقطاع السير (مثل تبليغ الورثة أو تعيين ممثل قانوني) والرغبة في استئناف الدعوى؟",
  ],
  [
    `يوضح وجود استئ${R}${R}اف متقابل مقدم من الخصم.`,
    "يوضح وجود استئناف متقابل مقدم من الخصم.",
  ],
  [`placeholder="عنو${R}${R}ن المقر الرئيسي"`, 'placeholder="عنوان المقر الرئيسي"'],
  [
    `// ═══════════════════════════════════════════${R}═══════════════════════════════`,
    "// ═══════════════════════════════════════════════════════════════════════════",
  ],
  [
    `{/* ═══════════════════${R}${R}═══════════════════════════════════`,
    "{/* ════════════════════════════════════════════════════════════════════════",
  ],
  [
    `// ═══════════════════════════════${R}═══════════════════════════════════════`,
    "// ═══════════════════════════════════════════════════════════════════════",
  ],
  [
    `// ═════════════════════════════════════════${R}══════════════════════════════════`,
    "// ═══════════════════════════════════════════════════════════════════════════",
  ],
];

const EXTRA_REGEX = [
  [/لوحة التح[\uFFFD]+م: الأمر الولائي/g, "لوحة التحكم: الأمر الولائي"],
  [/المحرك [\uFFFD]+لبصري/g, "المحرك البصري"],
  [/'المدعى [\uFFFD]+ليه:'/g, "'المدعى عليه:'"],
  [/الإخب[\uFFFD]+ر\)/g, "الإخبار)"],
];

function clean(s) {
  let out = s;
  for (const [a, b] of LITERAL_PAIRS) {
    if (out.includes(a)) out = out.split(a).join(b);
  }
  for (const [re, rep] of EXTRA_REGEX) {
    out = out.replace(re, rep);
  }
  return normalizeBoxLines(out);
}

let touched = 0;
for (const file of walk(SRC)) {
  const s = fs.readFileSync(file, "utf8");
  if (!s.includes(R)) continue;
  const next = clean(s);
  if (next !== s && !checkOnly) {
    fs.writeFileSync(file, next, "utf8");
    touched++;
  }
}

let remaining = 0;
for (const file of walk(SRC)) {
  if (fs.readFileSync(file, "utf8").includes(R)) {
    remaining++;
    if (checkOnly) console.log("still:", path.relative(SRC, file));
  }
}

if (checkOnly) {
  console.log(remaining ? `FAIL: ${remaining} file(s) contain U+FFFD` : "OK: no U+FFFD under src/");
  process.exit(remaining ? 1 : 0);
}

console.log(`clean-mojibake: updated ${touched} file(s); ${remaining} file(s) still contain U+FFFD`);
process.exit(remaining ? 1 : 0);
