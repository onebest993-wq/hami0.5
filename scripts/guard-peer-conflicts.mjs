/**
 * `legacy-peer-deps=true` يقول لـnpm حرفياً: «اقبل حلّاً خاطئاً وربّما معطوباً».
 * وهو علم شامل، فتختفي تحته تعارضات حقيقية كما اختفى أنّ إضافة حجب لقطة
 * الشاشة كانت مبنيّة لـCapacitor 7 بينما المشروع كلّه على 6 — أي أن الحماية
 * ما كانت لتعمل على الجهاز أصلاً.
 *
 * هذا الحارس يستبدل بالإخفاء الشامل قائمةَ استثناءات معدودة: يفحص التثبيت
 * بالوضع الصارم، ويسمح فقط بما هو مُعلَن هنا ومُبرَّر، ويسقط عند أي تعارض جديد.
 *
 * Usage: node scripts/guard-peer-conflicts.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * تعارضات مقبولة عن معرفة. كل بند يحمل سببه وشرط زواله — لا استثناء بلا موعد.
 */
/**
 * قائمة فارغة عن عمد: التثبيت الصارم نظيف بعد إزالة expo-secure-store.
 * أي تعارض جديد يجب أن يُحلّ أو يُعلَن هنا بسبب وشرط زوال — لا تُعاد legacy-peer-deps.
 */
const ACCEPTED = [];

/**
 * يُستدعى npm عبر Node مباشرةً: تمرير الوسائط خلال الصدفة يدمجها نصّاً بلا
 * تهريب (DEP0190)، وويندوز لم يعد يشغّل ملفات .cmd بلا صدفة بعد إصلاح أمني —
 * فيفشل الأمر صامتاً بلا مخرجات. استدعاء ملف npm-cli.js يتفادى الأمرين.
 */
function resolveNpmCli() {
    const fromEnv = process.env.npm_execpath;
    if (fromEnv && fromEnv.endsWith('.js') && fs.existsSync(fromEnv)) return fromEnv;
    const beside = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    if (fs.existsSync(beside)) return beside;
    const nested = path.join(ROOT, 'node_modules/npm/bin/npm-cli.js');
    return fs.existsSync(nested) ? nested : null;
}

function strictInstallOutput() {
    const cli = resolveNpmCli();
    if (!cli) return { failed: true, text: '', reason: 'تعذّر العثور على npm-cli.js' };
    try {
        execFileSync(process.execPath, [cli, 'install', '--dry-run', '--no-audit', '--no-fund', '--legacy-peer-deps=false'], {
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { failed: false, text: '' };
    } catch (e) {
        return { failed: true, text: `${e.stdout ?? ''}${e.stderr ?? ''}`, reason: e.message };
    }
}

const result = strictInstallOutput();

if (!result.failed) {
    console.log('[peer conflicts] OK — strict install has zero peer conflicts');
    process.exit(0);
}

const out = result.text;

// npm يبلّغ عن أول تعارض فقط: «While resolving: <pkg>@<ver>» ثم «peer <peer>@… from <pkg>»
const resolving = out.match(/While resolving:\s*(\S+?)@[\d.]/)?.[1];
const peerLine = out.match(/peer\s+(\S+?)@"[^"]*"\s+from\s+(\S+?)@/);
const peerName = peerLine?.[1];

if (!resolving) {
    console.error('[peer conflicts] فشل التثبيت الصارم بسبب غير تعارض أقران:');
    console.error(`  ${result.reason ?? 'بلا سبب مُبلَّغ'}`);
    if (out.trim()) console.error(out.split('\n').slice(0, 25).join('\n'));
    process.exit(1);
}

const hit = ACCEPTED.find((a) => a.pkg === resolving && (!peerName || a.peer === peerName));

if (!hit) {
    console.error(`[peer conflicts] BLOCKED — تعارض أقران غير معلَن: ${resolving}${peerName ? ` ↔ ${peerName}` : ''}`);
    console.error('');
    console.error(out.split('\n').filter((l) => /npm error/.test(l)).slice(0, 18).join('\n'));
    console.error('');
    console.error('  إمّا أن تُواءم الإصدارات، وإمّا أن تُضيفه إلى ACCEPTED في هذا الملف بسبب وشرط زوال.');
    process.exit(1);
}

console.log(`[peer conflicts] OK — تعارض معلَن ومقبول: ${hit.pkg} ↔ ${hit.peer}`);
console.log(`  السبب: ${hit.why}`);
console.log(`  يزول عند: ${hit.clearsWhen}`);
console.log(`  (المُعلَن كلّه: ${ACCEPTED.map((a) => a.pkg).join('، ')})`);
