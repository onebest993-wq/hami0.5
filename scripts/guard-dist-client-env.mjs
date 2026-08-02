/**
 * يرفض حزمة إنتاج تُشحَن بـplaceholders لعميل Supabase.
 * بناء بـ.env.production.example دون قيم حقيقية كان يمرّ سابقاً لأن العميل
 * يسقط على info.ts — ذلك المسار أُغلق في الكود، وهذا الحارس يغلقه في dist أيضاً.
 *
 * Usage: node scripts/guard-dist-client-env.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { invalidateE2eDistStamp } from './e2e-dist-stamp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(ROOT, 'dist', 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('[guard-dist-client-env] BLOCKED: dist/assets missing — run build first');
  process.exit(1);
}

const forbidden = [
  { re: /YOUR_PROJECT\.supabase\.co/i, label: 'placeholder Supabase host' },
  // علامة وحدة الاحتياطي — إن بقيت فـDCE فشل وinfo.ts ما زال في مسار الإنتاج
  { re: /hami-dev-supabase-fallback-v1/, label: 'dev Supabase fallback marker (info.ts path leaked)' },
];

let hits = 0;
for (const name of fs.readdirSync(assetsDir)) {
  if (!name.endsWith('.js')) continue;
  const text = fs.readFileSync(path.join(assetsDir, name), 'utf8');
  for (const { re, label } of forbidden) {
    if (re.test(text)) {
      console.error(`[guard-dist-client-env] BLOCKED: ${name} embeds ${label}`);
      hits++;
      break;
    }
  }
}

if (hits) {
  console.error(
    '[guard-dist-client-env] Production client must use build-time VITE_SUPABASE_* only — no placeholders, no info.ts fallback',
  );
  process.exit(1);
}

if (process.env.VITE_E2E !== '1') {
    invalidateE2eDistStamp();
}

console.log('[guard-dist-client-env] OK — no placeholder / committed-fallback Supabase identity in dist');
