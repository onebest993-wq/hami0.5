import fs from 'node:fs';
import path from 'node:path';

const root =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts';
const needles = [
    'export function getCachedExecutionDashboard',
    'export function primeExecutionDossierSurface',
    'export function ensureExecutionDossierFirstPaintReady',
    'export function isExecutionDossierFirstPaintReady',
    'export async function hydrateExecutionFilesStorageForOwner',
    'export function hydrateExecutionFilesStorageForOwner',
    'export function adoptCachedArchivePortal',
    'export function setPendingLawyerNewCaseJurisdiction',
];

function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (e.name.endsWith('.jsonl')) acc.push(p);
    }
    return acc;
}

const best = Object.fromEntries(needles.map((n) => [n, null]));
for (const f of walk(root)) {
    const raw = fs.readFileSync(f, 'utf8');
    for (const n of needles) {
        if (!raw.includes(n)) continue;
        // extract around marker via unescape from escaped JSON
        let idx = 0;
        while ((idx = raw.indexOf(n, idx)) >= 0) {
            const slice = raw.slice(idx, idx + 2500);
            const plain = slice
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            if (!best[n] || plain.length > best[n].len) {
                best[n] = { len: plain.length, f, plain };
            }
            idx += n.length;
        }
    }
}

fs.mkdirSync('.cursor/shim-src', { recursive: true });
for (const [n, v] of Object.entries(best)) {
    const safe = n.replace(/\W+/g, '_').slice(0, 80);
    if (!v) {
        console.log('MISSING', n);
        continue;
    }
    fs.writeFileSync(`.cursor/shim-src/${safe}.ts`, v.plain);
    console.log('OK', n, v.len);
}
