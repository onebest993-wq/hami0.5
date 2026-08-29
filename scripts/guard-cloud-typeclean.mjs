#!/usr/bin/env node
/**
 * بوابة نظافة أنواع لمسارات العمل السحابي / المسح / الاستعادة.
 * تفشل إن وُجد أي خطأ tsc في الملفات الحرجة — بلا مِسنَنة وبلا تسامح.
 * مكملة لـ guard:tsc (مِسنَنة عامة + حظر TS2304).
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const CRITICAL = [
    'src/app/api/work-checkpoints/route.ts',
    'src/app/api/settings/wipe/wipeAuthenticatedUserCloud.ts',
    'src/app/services/cloud/workCloudCheckpoint.ts',
    'src/app/services/cloudSync/runCloudSyncAllNow.ts',
    'src/app/domain/lawsuit/lawsuitWorkspaceRecovery.ts',
    'src/app/services/SupabaseService.ts',
];

function runTsc() {
    const cli = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
    if (!existsSync(cli)) {
        console.error('[cloud-typeclean] typescript missing — run npm install');
        process.exit(2);
    }
    try {
        execFileSync(process.execPath, [cli, '--noEmit', '--pretty', 'false'], {
            cwd: ROOT,
            encoding: 'utf8',
            maxBuffer: 128 * 1024 * 1024,
        });
        return '';
    } catch (err) {
        return err.stdout || '';
    }
}

const hits = [];
for (const line of runTsc().split(/\r?\n/)) {
    const m = /^(.+?)\(\d+,\d+\): error (TS\d+)/.exec(line);
    if (!m) continue;
    const file = m[1].replace(/\\/g, '/');
    if (CRITICAL.includes(file)) hits.push(line.trim());
}

if (hits.length) {
    console.log(`FAIL: ${hits.length} type error(s) in cloud-critical paths:`);
    for (const h of hits) console.log(`  ${h}`);
    process.exit(1);
}

console.log(`[cloud-typeclean] OK — ${CRITICAL.length} critical files clean`);
