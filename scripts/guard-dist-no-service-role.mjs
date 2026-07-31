/**
 * حارس: لا يظهر SERVICE_ROLE / service_role في حزم العميل (dist/assets).
 * يُشغَّل بعد npm run build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(ROOT, 'dist', 'assets');
const NEEDLE = /SERVICE_ROLE|service_role/;

function main() {
    if (!fs.existsSync(assetsDir)) {
        console.error('[guard-dist-no-service-role] dist/assets missing — run build first');
        process.exit(1);
    }
    const hits = [];
    for (const file of fs.readdirSync(assetsDir)) {
        if (!file.endsWith('.js')) continue;
        const text = fs.readFileSync(path.join(assetsDir, file), 'utf8');
        if (NEEDLE.test(text)) hits.push(file);
    }
    if (hits.length) {
        console.error('[guard-dist-no-service-role] FAIL — client chunks contain service_role:');
        for (const h of hits) console.error(`  - ${h}`);
        process.exit(1);
    }
    console.log('[guard-dist-no-service-role] OK — no SERVICE_ROLE/service_role in dist/assets/*.js');
}

main();
