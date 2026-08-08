import fs from 'fs';

const p =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/9c9c03a2-4309-4bdf-9e28-c176961080d8/subagents/8179ce6d-f6f7-4e5a-9c33-e5e8ae67fcf9.jsonl';
const raw = fs.readFileSync(p, 'utf8');
const idx = raw.indexOf('*** Begin Patch');
if (idx === -1) {
    console.error('patch not found');
    process.exit(1);
}
const end = raw.indexOf('*** End Patch', idx);
const patch = raw.slice(idx, end + '*** End Patch'.length);
fs.writeFileSync('scripts/recovered.patch', patch);
console.log('wrote', patch.length, 'chars');
