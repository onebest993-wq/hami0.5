#!/usr/bin/env node
/**
 * يمنع تتبّع git لملفات أسرار محلية (.env ونسخها الحية).
 *
 * القاعدة: أي ملف يبدأ بـ `.env*` في أي مجلد (بما في ذلك hami/.env) محظور
 * من التتبّع — **الاستثناء الوحيد**: الملفات التي تنتهي بـ `.example`.
 */
import { execFileSync } from 'node:child_process';

const ENV_BLOCK_RE = /(^|\/)\.env(?:\.|$)/;
const ENV_ALLOW_RE = /\.example$/;

function fail(msg) {
    console.error(`[guard-tracked-secrets] FAIL: ${msg}`);
    process.exit(1);
}

let allTracked = [];
try {
    allTracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
} catch {
    fail('git ls-files failed — is this a git repository?');
}

const blockedTracked = allTracked.filter((p) => {
    if (!ENV_BLOCK_RE.test(p)) return false;
    return !ENV_ALLOW_RE.test(p);
});

if (blockedTracked.length > 0) {
    fail(
        'tracked secret env files must be removed from git index (only *.example is allowed): ' +
            blockedTracked.join(', '),
    );
}

console.log('[guard-tracked-secrets] PASS');
