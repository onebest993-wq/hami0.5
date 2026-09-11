/**
 * مِسنَنة إغلاق Inner — تمنع النموّ الصامت.
 *
 * `guard:lawyer-inner-weight` يقيس الإغلاق مقابل ميزانية ٢٢٠ ك.ب وهو أحمر منذ
 * ما قبل هذا الفرع. **وحارسٌ أحمر دائماً لا يدلّ على اتجاه:** بين ٢٠٢٦-٠٩-٠٧
 * (١٤٥ حزمة / ٦٣٦٫٦ ك.ب — `.audit/27-FINAL-DEEP-ARCH-NUCLEUS-VERIFICATION.txt:216`)
 * و٢٠٢٦-٠٩-١١ (١٥٤ / ٨٥٢٫٥) نما الإغلاق ٣٤٪ ولم يُمسكه شيء، لأن الفشل كان
 * ثابتاً في الحالتين.
 *
 * فهذا الحارس لا يمسّ عقد ذاك: الميزانية تبقى هدفاً هناك، وهنا يُمنع التراجع
 * عن أفضل رقمٍ بُلِغ. والتحسين تلقائي بلا `--save` (CLAUDE.md §٤) — يُطبع
 * ويُترك لالتزام `baseline(scope):` أن يُنزل الخطّ حين يستقرّ.
 *
 *   npm run build && node scripts/guard-lawyer-inner-weight-ratchet.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { measureInnerClosure } from './guard-lawyer-inner-weight.mjs';

/** يُتجاوز في الاختبار وحده — لإثبات أسنان الحارس بلا الكتابة فوق خطّ الأساس */
const BASELINE_FILE = process.env.HAMI_INNER_BASELINE_FILE ?? '.audit/lawyer-inner-weight-baseline.json';
const DIST = process.env.HAMI_DIST_DIR ?? 'dist';

/**
 * gzip حتميّ لنفس البايتات، لكن أسماء الحُزَم تحمل تجزئة تتغيّر مع أي تعديل
 * فيتغيّر طول النصّ قليلاً. الهامش يمنع إنذاراً كاذباً من ضجيجٍ كهذا، ويبقى
 * أصغر بكثير من أي تسريب حقيقي (أصغر حزمة تنفيذ في القياس كانت ٣٫٢ ك.ب).
 */
const TOLERANCE_KB = 2;

if (!fs.existsSync(BASELINE_FILE)) {
    console.error(`[inner-ratchet] missing ${BASELINE_FILE}`);
    process.exit(1);
}

let measured;
try {
    measured = measureInnerClosure(DIST);
} catch (err) {
    console.error(`[inner-ratchet] ${err.message}`);
    process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(path.resolve(BASELINE_FILE), 'utf8'));
const { totalKb, chunkCount } = measured;

console.log(
    `[inner-ratchet] ${chunkCount} chunks, ${totalKb.toFixed(1)} KB gzip — ` +
        `baseline ${baseline.totalKb} KB / ${baseline.chunkCount} chunks (tolerance ${TOLERANCE_KB} KB)`,
);

if (totalKb > baseline.totalKb + TOLERANCE_KB) {
    console.error(
        `\n[inner-ratchet] FAIL — the first lawyer screen grew by ${(totalKb - baseline.totalKb).toFixed(1)} KB gzip.\n` +
            `  The usual cause is not a new import but a new neighbour: a module this screen\n` +
            `  needs landed in a chunk holding modules it does not, so the whole chunk and\n` +
            `  everything that chunk imports now ship with the first paint.\n` +
            `  Compare the chunk closure against the module graph before changing this file.\n` +
            `  Baseline recorded ${baseline.recordedAt}: ${baseline.reason}`,
    );
    process.exit(1);
}

if (totalKb + TOLERANCE_KB < baseline.totalKb) {
    console.log(
        `[inner-ratchet] improvement — ${(baseline.totalKb - totalKb).toFixed(1)} KB below baseline. ` +
            `Lower it in a baseline(scope): commit once it settles; no --save here.`,
    );
}

console.log('[inner-ratchet] OK');
