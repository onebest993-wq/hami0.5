#!/usr/bin/env node
/**
 * يمنع تتبّع git لملفات أسرار محلية (.env ونسخها الحية).
 */
import { execFileSync } from 'node:child_process';

const BLOCKED = ['.env', '.env.local', '.env.production'];

function fail(msg) {
    console.error(`[guard-tracked-secrets] FAIL: ${msg}`);
    process.exit(1);
}

let tracked = [];
try {
    tracked = execFileSync('git', ['ls-files', ...BLOCKED], { encoding: 'utf8' })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
} catch {
    fail('git ls-files failed — is this a git repository?');
}

if (tracked.length > 0) {
    fail(`tracked secret files must be removed from git index: ${tracked.join(', ')}`);
}

console.log('[guard-tracked-secrets] PASS');
