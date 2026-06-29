/**
 * تقرير أداء صادق — يقيس ما يُحمَّل فعلياً من dist بعد البناء.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'dist', 'assets');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}

const entryMatch = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/);
const entry = entryMatch?.[1];
const preloaded = [...indexHtml.matchAll(/modulepreload[^>]+href="\/assets\/([^"]+)"/g)].map((m) => m[1]);

const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));

function statFile(name) {
  const rawBuf = fs.readFileSync(path.join(assetsDir, name));
  const gz = gzipSync(rawBuf);
  return { name, rawLen: rawBuf.length, gzLen: gz.length };
}

console.log('=== 1. المسار الحرج (modulepreload في index.html) ===');
let critRaw = 0;
let critGz = 0;
for (const f of [entry, ...preloaded]) {
  const s = statFile(f);
  critRaw += s.rawLen;
  critGz += s.gzLen;
  console.log(`  ${f}: ${kb(s.rawLen)} KB raw / ${kb(s.gzLen)} KB gzip`);
}
const cssName = fs
  .readdirSync(assetsDir)
  .filter((f) => f.startsWith('index-') && f.endsWith('.css'))
  .sort((a, b) => fs.statSync(path.join(assetsDir, b)).size - fs.statSync(path.join(assetsDir, a)).size)[0];
const css = statFile(cssName);
console.log(`  ${cssName}: ${kb(css.rawLen)} KB raw / ${kb(css.gzLen)} KB gzip (blocking stylesheet)`);
console.log(`  TOTAL first paint JS: ${kb(critRaw)} KB raw / ${kb(critGz)} KB gzip`);
console.log(`  TOTAL first paint JS+CSS gzip: ${kb(critGz + css.gzLen)} KB`);

const homeTabChunks = [
  'LawyerDashboard-',
  'LawyerHomeHubCard-',
  'LazyLegalCommandCenterDock', // may not match
  'CommandHubTiles',
  'LawyerDashboardBackgroundServices-',
  'lazyComponents-',
  'DraggableHomeWidget-',
  'SecretaryOrchestrator-',
].flatMap((prefix) =>
  jsFiles.filter((f) => f.includes(prefix.replace(/-$/, '')) && f.endsWith('.js')),
);

console.log('\n=== 3. تقدير تحميل «الرئيسية» بعد الدخول (prod) ===');
const lawyerMain = jsFiles.find((f) => f.startsWith('LawyerDashboard-') && f.endsWith('.js') && !f.includes('Background'));
const homeRelated = new Set(
  jsFiles.filter(
    (f) =>
      f.startsWith('LawyerDashboard-') ||
      f.startsWith('LawyerHomeHubCard-') ||
      f.startsWith('LegalCommandCenterDock') ||
      f.includes('CommandHubTiles') ||
      f.startsWith('LawyerDashboardBackgroundServices-') ||
      f.startsWith('lazyComponents-') ||
      f.startsWith('DraggableHomeWidget-') ||
      f.startsWith('SecretaryOrchestrator-') ||
      f.startsWith('useForumNotificationStream-') ||
      f.startsWith('LawyerDashboard-B') && f.endsWith('.css'),
  ),
);
let homeGz = critGz + css.gzLen;
let homeList = [];
for (const f of homeRelated) {
  if ([entry, ...preloaded].includes(f)) continue;
  const s = statFile(f);
  homeGz += s.gzLen;
  homeList.push({ f, ...s });
}
homeList.sort((a, b) => b.gzLen - a.gzLen);
console.log(`  بعد المسار الحرج + فتح لوحة المحامي والرئيسية (تقريبي): ~${kb(homeGz)} KB gzip`);
for (const s of homeList.slice(0, 12)) {
  console.log(`    + ${s.name}: ${kb(s.gzLen)} KB gzip`);
}

if (lawyerMain) {
  const s = statFile(lawyerMain);
  console.log(`\n  LawyerDashboard core chunk: ${s.name} — ${kb(s.rawLen)} KB raw / ${kb(s.gzLen)} KB gzip`);
}

console.log('\n=== 4. أكبر 15 chunk (بالحجم — ليست كلها تُحمَّل عند الإقلاع) ===');
const all = jsFiles.map(statFile).sort((a, b) => b.rawLen - a.rawLen);
for (const s of all.slice(0, 15)) {
  const onCrit = [entry, ...preloaded].includes(s.name) ? ' [PRELOAD]' : '';
  console.log(`  ${s.name}: ${kb(s.rawLen)} KB / ${kb(s.gzLen)} KB gzip${onCrit}`);
}

const articleChunks = all.filter((s) => s.name.includes('.articles-'));
const articleGz = articleChunks.reduce((n, s) => n + s.gzLen, 0);
console.log('\n=== 5. قوانين عراقية (lazy per-law) ===');
console.log(`  عدد ملفات articles: ${articleChunks.length}`);
console.log(`  مجموع gzip إن حُمِّلت كلها: ${kb(articleGz)} KB`);
for (const s of articleChunks) {
  console.log(`    ${s.name}: ${kb(s.gzLen)} KB gzip`);
}

const totalJsRaw = all.reduce((n, s) => n + s.rawLen, 0);
const totalJsGz = all.reduce((n, s) => n + s.gzLen, 0);
console.log('\n=== 6. صورة كاملة ===');
console.log(`  عدد ملفات JS: ${all.length}`);
console.log(`  مجموع كل JS في dist: ${kb(totalJsRaw)} KB raw / ${kb(totalJsGz)} KB gzip`);

console.log('\n=== 7. تحذيرات صادقة ===');
console.log('  • npm run dev: LawyerDashboard static (ليس lazy) — الأداء في التطوير أسوأ من الإنتاج');
console.log('  • CSS خام ~760KB: يُحمَّل كاملاً؛ gzip ~75KB لكن parse/layout ما زال ثقيلاً');
console.log('  • execution-followup-shared كان يُpreload بالخطأ — أُضيف لقائمة modulePreload denylist');
console.log('  • vendor-motion/vendor-supabase مُستبعدان من preload — يُحمّلان عند أول lazy import');
console.log('  • فتح تنفيذ/جزائي/ملف ذكي: +94KB إلى +400KB gzip لكل ميزة');
