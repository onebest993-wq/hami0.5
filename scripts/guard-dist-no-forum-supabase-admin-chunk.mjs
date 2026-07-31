/**
 * حارس: لا تُصدَّر حزمة forum-supabase-admin في dist (عميل منتدى مميّز خادم فقط).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(ROOT, 'dist', 'assets');
const FORBIDDEN = /^forum-supabase-admin-.*\.js$/;

function main() {
  if (!fs.existsSync(assetsDir)) {
    console.error('[guard-dist-no-forum-supabase-admin-chunk] dist/assets missing — run build first');
    process.exit(1);
  }
  const hits = fs.readdirSync(assetsDir).filter((f) => FORBIDDEN.test(f));
  if (hits.length) {
    console.error('[guard-dist-no-forum-supabase-admin-chunk] FAIL — forum supabase admin chunk shipped:');
    for (const h of hits) console.error(`  - ${h}`);
    process.exit(1);
  }
  console.log('[guard-dist-no-forum-supabase-admin-chunk] OK — no forum-supabase-admin*.js in dist/assets');
}

main();
