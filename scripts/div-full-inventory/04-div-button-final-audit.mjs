import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const AUDIT_DIR = join(REPO_ROOT, '.audit', 'div-full-inventory');
if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });

// Re-scan all prod TSX for divs, count, verify nested buttons, reconciliation with 5548 baseline

function walk(d, out = []) {
    for (const ent of readdirSyncSyncSafe(d)) {
        const f = join(d, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist') continue;
            if (ent.name === '__tests__') continue;
            walk(f, out);
        } else if (/\.(tsx|jsx)$/.test(ent.name)) {
            if (ent.name.includes('.test.') || ent.name.includes('.spec.')) continue;
            out.push(f);
        }
    }
    return out;
}
function readdirSyncSyncSafe(d) { try { return readdirSync(d, { withFileTypes: true }); } catch { return []; } }

const files = walk(join(REPO_ROOT, 'src'));
let totalDivs = 0;
let totalButtons = 0;
let nestedButtonViolations = 0;
const perFileCounts = [];
const nestedViolations = [];

for (const abs of files) {
    const rel = relative(REPO_ROOT, abs).split(dirname.sep).join('/');
    try {
        const raw = readFileSync(abs, 'utf8');
        const divMatches = raw.match(/<div[\s>]/g);
        const btnMatches = raw.match(/<button[\s>]/g);
        const d = (divMatches || []).length;
        const b = (btnMatches || []).length;
        totalDivs += d; totalButtons += b;
        if (d + b > 0) perFileCounts.push([rel, d, b]);
        // Nested buttons check: scan lines, track <button open depth, any <button found while depth>0 = violation
        const lines = raw.split('\n');
        let btnDepth = 0;
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            const opens = (l.match(/<button[\s>]/g) || []).length;
            const selfClose = (l.match(/<button[^>]*?\/>/g) || []).length;
            const closes = (l.match(/<\/button>/g) || []).length;
            if (btnDepth > 0 && (opens - selfClose) > 0) {
                nestedButtonViolations++;
                nestedViolations.push([rel, String(i + 1), `nested <button> inside <button> depth=${btnDepth}`]);
            }
            btnDepth += opens - selfClose - closes;
        }
    } catch {}
}

// Reconciliation: baseline 5548 (div-button-hits.csv rows)
const baseline5548 = 5548;
const delta = Math.abs(totalDivs - baseline5548);
const reconOk = delta <= 50; // <1% drift expected due to regex + our 3 conversions (removed 3 divs added 0 → 3 less)
const reconVerdict = `Actual <div> now: ${totalDivs} · Baseline inventory: ${baseline5548} · Delta: ${delta} ${delta<=50?'OK':'DRIFT'} (3 conversions expected)`;

const CSV = nestedViolations.length ? ['"file","line","reason"', ...nestedViolations.map(r => r.map(c=>`"${String(c).replace(/"/g, "'")}"`).join(','))].join('\n') : '"file","line","reason"\n';
writeFileSync(join(AUDIT_DIR, 'nested-button-violations.csv'), CSV, 'utf8');

const out = `
DIV FULL INTEGRITY FINAL AUDIT (T8)
==================================
UI files scanned (TSX prod): ${files.length}
Total <div> openings: ${totalDivs}
Total <button> openings: ${totalButtons}
Nested <button-in-<button> violations: ${nestedButtonViolations}

Baseline reconciliation:
  ${reconVerdict}

Violations details -> nested-button-violations.csv.
`;
process.stdout.write(out);
writeFileSync(join(AUDIT_DIR, 'final-integrity-audit.txt'), out, 'utf8');
process.exit(nestedButtonViolations > 0 ? 2 : reconOk ? 0 : 1);
