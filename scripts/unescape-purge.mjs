import fs from 'node:fs';

const t = fs.readFileSync(
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl',
    'utf8',
);
const comment = '/** حذف فوري متزامن';
const cidx = t.indexOf(comment);
const slice = t.slice(cidx, cidx + 4000);
const end = slice.indexOf('return changed;');
const chunk = slice.slice(0, end >= 0 ? end + 'return changed;'.length + 10 : 3000);
const plain = chunk
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
fs.writeFileSync('.cursor/criminal-replay/PURGE-PLAIN.ts', plain);
console.log(plain);
