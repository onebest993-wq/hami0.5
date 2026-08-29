import fs from 'node:fs';
import path from 'node:path';

// --- SeizureInlineSectionsCore ---
const sisDir = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/components/seizureInlineSections',
);
const sisPath = path.join(sisDir, 'SeizureInlineSectionsCore.tsx');
const sis = fs.readFileSync(sisPath, 'utf8').split(/\r?\n/);

const typesThemeHelpers = sis.slice(0, 158).join('\n'); // through InlineSectionShell end ~159
// Find InlineSectionShell end
const shellEnd = sis.findIndex((l, i) => i > 130 && l === '};' && sis[i - 1]?.includes('</div>'));
console.log('sis shell-ish', shellEnd);

// Better: extract lines 33-158 as shared, keep composer importing sections body
const coreExport = sis.findIndex((l) => l.startsWith('export const SeizureInlineSectionsCore'));
console.log('core export', coreExport + 1, 'total', sis.length);

const sharedFile = `${sis.slice(0, coreExport).join('\n')}\n`;
const bodyStart = sis.findIndex((l) => l.includes('const showMark ='));
console.log('showMark', bodyStart + 1);

// Extract shared (imports through helpers+shell+props setup until showMark)
// Actually simplest: 
// 1) seizureInlineSectionsShared.tsx - FIELD, THEME, types, helpers, InlineSectionShell
// 2) SeizureInlineSectionsBody.tsx - receives prepared props and renders sections
// 3) thin SeizureInlineSectionsCore

const sharedEnd = coreExport; // exclusive
fs.writeFileSync(
    path.join(sisDir, 'seizureInlineSectionsShared.tsx'),
    `${sis.slice(0, sharedEnd).join('\n')}\n`,
);

// For party badges - extract usePartyInteractiveBadgesController from line 57 to return(
const badgesDir = path.resolve(
    'src/app/components/lawyer/execution/partyInteractiveBadges',
);
const badgesPath = path.join(badgesDir, 'ExecutionPartyInteractiveBadges.tsx');
const badges = fs.readFileSync(badgesPath, 'utf8').split(/\r?\n/);
const returnIdx = badges.findIndex((l) => l.trim() === 'return (' && badges.indexOf(l) > 600);
// find last major return before end
let lastReturn = -1;
for (let i = 0; i < badges.length; i++) {
    if (badges[i] === '    return (') lastReturn = i;
}
console.log('party return at', lastReturn + 1, 'total', badges.length);
console.log('sis shared lines', sharedEnd);
