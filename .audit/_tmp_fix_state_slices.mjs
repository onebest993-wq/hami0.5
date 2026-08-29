import fs from 'node:fs';
import path from 'node:path';

const root = 'src/app/components/lawyer/criminal-system';
const files = [
    'criminalStoreStateData.types.ts',
    'criminalStoreStateDraftSlice.types.ts',
    'criminalStoreStateEvidenceSlice.types.ts',
    'criminalStoreStateRequestTrialSlice.types.ts',
    'criminalStoreStateJudicialSlice.types.ts',
    'criminalStoreStateLifecycleSlice.types.ts',
];

for (const file of files) {
    let text = fs.readFileSync(path.join(root, file), 'utf8');
    text = text.replace(/\uFEFF/g, '');
    text = text.replace(/export type CriminalStoreState = \{\n/, '');
    const m = text.match(/export type (\w+) = \{\n([\s\S]*?)\n\};\n?$/);
    if (!m) {
        console.error('no match', file);
        continue;
    }
    const [, typeName, body] = m;
    const indented = body
        .split('\n')
        .map((line) => (line.trim() === '' ? '' : `    ${line.trimStart()}`))
        .join('\n');
    text = text.replace(/export type \w+ = \{[\s\S]*\};\n?$/, `export type ${typeName} = {\n${indented}\n};\n`);
    fs.writeFileSync(path.join(root, file), text);
    console.log('fixed', file);
}
