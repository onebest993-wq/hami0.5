/**
 * حارس: لا تُصدَّر حزمة app-kv-store-admin في dist (وحدة إدارة KV للخادم فقط).
 * يُشغَّل بعد npm run build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(ROOT, 'dist', 'assets');
const FORBIDDEN = /^app-kv-store-admin-.*\.js$/;

function main() {
  if (!fs.existsSync(assetsDir)) {
    console.error('[guard-dist-no-kv-admin-chunk] dist/assets missing — run build first');
    process.exit(1);
  }
  const hits = fs.readdirSync(assetsDir).filter((f) => FORBIDDEN.test(f));
  if (hits.length) {
    console.error('[guard-dist-no-kv-admin-chunk] FAIL — admin KV chunk shipped to client:');
    for (const h of hits) console.error(`  - ${h}`);
    process.exit(1);
  }
  console.log('[guard-dist-no-kv-admin-chunk] OK — no app-kv-store-admin*.js in dist/assets');
}

main();
