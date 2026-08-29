import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const toPosix = (p) => p.split(sep).join('/');

function runEslint() {
    const cli = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
    const targets = ['src', 'api'].filter((d) => existsSync(join(ROOT, d)));
    let out = '';
    try {
        out = execFileSync(process.execPath, [cli, ...targets, '--no-error-on-unmatched-pattern', '--format', 'json'], {
            cwd: ROOT,
            encoding: 'utf8',
            maxBuffer: 256 * 1024 * 1024,
        });
    } catch (err) {
        out = err.stdout || '';
    }
    const start = out.indexOf('[');
    return JSON.parse(start > 0 ? out.slice(start) : out);
}

const results = runEslint();
const perFile = {};
for (const file of results) {
    const rel = toPosix(relative(ROOT, file.filePath));
    const hooksMsgs = (file.messages || []).filter(
        (m) => m.ruleId === 'react-hooks/rules-of-hooks' && m.severity === 2,
    );
    if (hooksMsgs.length) {
        perFile[rel] = hooksMsgs.map((m) => ({ line: m.line, message: m.message }));
    }
}

const baseline = JSON.parse(readFileSync(join(ROOT, '.audit/lint-baseline.json'), 'utf8'));
const baseCrashSet = new Set(baseline.crashFiles ?? []);

const report = {
    currentFiles: perFile,
    baselineCrashFiles: baseline.crashFiles ?? [],
    newFiles: Object.keys(perFile).filter((f) => !baseCrashSet.has(f)),
    totalCurrent: Object.values(perFile).reduce((s, arr) => s + arr.length, 0),
};

writeFileSync(join(ROOT, '.audit/hooks-diff-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('total current rules-of-hooks errors:', report.totalCurrent);
console.log('files:', Object.keys(perFile).join(', '));
console.log('new files (not in baseline crashFiles):', report.newFiles.join(', ') || '(none)');
for (const [f, msgs] of Object.entries(perFile)) {
    console.log(f, '->', msgs.map((m) => m.line).join(','));
}
