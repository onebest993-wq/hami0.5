import fs from 'node:fs';

const t = fs.readFileSync(
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl',
    'utf8',
);
const marker = 'export function purgeCriminalCaseRecord';
const i = t.indexOf(marker);
console.log('idx', i);
console.log(t.slice(i - 80, i + 1500));
