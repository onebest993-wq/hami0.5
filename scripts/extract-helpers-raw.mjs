import fs from 'node:fs';

const t = fs.readFileSync(
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl',
    'utf8',
);

function extractAround(marker, before = 200, after = 2500) {
    const i = t.indexOf(marker);
    if (i < 0) return null;
    const slice = t.slice(Math.max(0, i - before), i + after);
    return slice
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
}

const helpers = extractAround('function setCriminalCasesCache', 50, 2000);
fs.writeFileSync('.cursor/criminal-replay/HELPERS-cache.ts', helpers || 'MISSING');

const findKey = extractAround('function findCaseStorageKey', 20, 800);
fs.writeFileSync('.cursor/criminal-replay/HELPERS-findKey.ts', findKey || 'MISSING');

const dispatch = extractAround('function dispatchCriminalStoragePatched', 20, 500);
fs.writeFileSync('.cursor/criminal-replay/HELPERS-dispatch.ts', dispatch || 'MISSING');

const readRoot = extractAround('function readCasesRoot(', 20, 1500);
fs.writeFileSync('.cursor/criminal-replay/HELPERS-readRoot.ts', readRoot || 'MISSING');

// purge with authorize
const authIdx = t.indexOf('authorizeCriminalEmptyPersist');
console.log('auth idx', authIdx);
const purgeAuth = extractAround('authorizeCriminalEmptyPersist();', 400, 400);
fs.writeFileSync('.cursor/criminal-replay/HELPERS-purge-auth-context.ts', purgeAuth || 'MISSING');

console.log('done');
