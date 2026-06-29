import fs from 'fs';
import path from 'path';

const modalsDir = 'src/app/components/lawyer/criminal-system/components/modals';
const extraFiles = [
    'src/app/components/lawyer/criminal-system/components/JudicialCassationAppealModal.tsx',
    'src/app/components/lawyer/criminal-system/components/JudicialCassationResultModal.tsx',
];

const shellRe =
    /<div\s+className="fixed inset-0 z-\[[^\]]+\][^"]*backdrop-blur-sm p-4 flex items-center justify-center print:hidden"(\s+dir="rtl")?\s*>/g;

const shellReIsolate =
    /<div\s+className="fixed inset-0 z-\[[^\]]+\] isolate bg-black\/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"(\s+dir="rtl")?\s*>/g;

function stripFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('CriminalModalPortal')) {
        console.log('skip (already portaled):', filePath);
        return;
    }
    const original = content;
    content = content.replace(shellReIsolate, '');
    content = content.replace(shellRe, '');
    content = content.replace(/\n        <\/div>\n    \);\n};\s*$/m, '\n    );\n};\n');
    if (content === original) {
        console.log('no shell found:', filePath);
        return;
    }
    if (!content.includes('criminalModalPortal')) {
        const importLine = "import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../criminalModalPortal';\n";
        const importLine2 = "import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';\n";
        if (filePath.includes('/modals/')) {
            content = content.replace(/^(import .+\n)+/m, (m) => m + importLine2);
        } else {
            content = content.replace(/^(import .+\n)+/m, (m) => m + importLine);
        }
    }
    content = content.replace(
        /if \(!open[^)]*\) return null;\s*\n\s*return \(\s*\n\s*<div className="w-full/,
        (m) => m.replace('return (\n            <div', 'return (\n        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.default}>\n            <div'),
    );
    fs.writeFileSync(filePath, content);
    console.log('stripped shell:', filePath);
}

for (const f of fs.readdirSync(modalsDir)) {
    if (!f.endsWith('.tsx')) continue;
    stripFile(path.join(modalsDir, f));
}
for (const f of extraFiles) stripFile(f);
