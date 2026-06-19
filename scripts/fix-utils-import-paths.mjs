import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const utilsDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/utils',
);

for (const file of fs.readdirSync(utilsDir)) {
    const p = path.join(utilsDir, file);
    let t = fs.readFileSync(p, 'utf8');
    t = t
        .replaceAll("from './types'", "from '../types'")
        .replaceAll("from './decisionCardGlassShell'", "from '../decisionCardGlassShell'")
        .replaceAll("from './appealUiLabels'", "from '../appealUiLabels'");
    fs.writeFileSync(p, t);
}
console.log('Fixed import paths');
