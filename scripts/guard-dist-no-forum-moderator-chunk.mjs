/**
 * حارس: لا تُصدَّر حزمة forum-moderator-ids في dist (قائمة مشرفين خادم فقط).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(ROOT, 'dist', 'assets');
const FORBIDDEN = /^forum-moderator-ids-.*\.js$/;

function main() {
  if (!fs.existsSync(assetsDir)) {
    console.error('[guard-dist-no-forum-moderator-chunk] dist/assets missing — run build first');
    process.exit(1);
  }
  const hits = fs.readdirSync(assetsDir).filter((f) => FORBIDDEN.test(f));
  if (hits.length) {
    console.error('[guard-dist-no-forum-moderator-chunk] FAIL — moderator chunk shipped to client:');
    for (const h of hits) console.error(`  - ${h}`);
    process.exit(1);
  }
  console.log('[guard-dist-no-forum-moderator-chunk] OK — no forum-moderator-ids*.js in dist/assets');
}

main();
