import fs from 'node:fs';

const t = fs.readFileSync(
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl',
    'utf8',
);

function dump(name, idx, before, after) {
    if (idx < 0) {
        console.log(name, 'MISSING');
        return;
    }
    const plain = t
        .slice(Math.max(0, idx - before), idx + after)
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    fs.writeFileSync(`.cursor/criminal-replay/${name}.ts`, plain);
    console.log(name, 'ok', plain.length);
}

dump('X-setCache', t.indexOf('setCriminalCasesCache'), 300, 1200);
dump('X-findKey', t.indexOf('findCaseStorageKey'), 200, 600);
dump('X-dispatch', t.indexOf('dispatchCriminalStoragePatched'), 200, 500);
dump('X-readCasesRoot', t.indexOf('function readCasesRoot'), 50, 1200);
dump('X-readCasesRootAsync', t.indexOf('async function readCasesRootAsync'), 50, 1200);
dump('X-type', t.indexOf('type CriminalCaseRecord'), 20, 200);
