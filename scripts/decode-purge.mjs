import fs from 'node:fs';

const t = fs.readFileSync(
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl',
    'utf8',
);
const marker = 'export function purgeCriminalCaseRecord';
const re = /"new_string":"((?:\\\\.|[^"\\\\])*)"/g;
let m;
let found = 0;
while ((m = re.exec(t))) {
    const raw = m[1];
    if (!raw.includes('purgeCriminalCaseRecord')) continue;
    let decoded;
    try {
        decoded = JSON.parse(`"${raw}"`);
    } catch {
        continue;
    }
    if (!decoded.includes(marker)) continue;
    found++;
    fs.writeFileSync(`.cursor/criminal-replay/PURGE-DECODED-${found}.ts`, decoded);
    console.log('found', found, decoded.length);
}
console.log('total', found);
