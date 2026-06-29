/**
 * يصلّح PhoneBody: يزيل p.* ويعيد destructure كامل من _phone-body-keys.json
 */
import fs from 'fs';

const phoneBodyPath =
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx';
const keysJsonPath = 'scripts/_phone-body-keys.json';

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let content = fs.readFileSync(phoneBodyPath, 'utf8');
const merged = JSON.parse(fs.readFileSync(keysJsonPath, 'utf8')).sort();

content = content.replace(/\bp\.([a-zA-Z_][a-zA-Z0-9_]*):/g, '$1:');

content = content.replace(
    /<([A-Za-z_][A-Za-z0-9_]*)\={p\.([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
    '<$1 $2={p.$2}',
);
content = content.replace(/\\=\{p\.([a-zA-Z_][a-zA-Z0-9_]*)\}/g, ' $1={p.$1}');
content = content.replace(/\\=\{String\(/g, ' fileNumber={String(');
content = content.replace(/\}\={p\.todayYmd\}/g, '} todayYmd={p.todayYmd}');
content = content.replace(/\\=\{\(\)\s*=>/g, ' onClose={() =>');

const sorted = [...merged].sort((a, b) => b.length - a.length);
for (const key of sorted) {
    const re = new RegExp(`\\bp\\.${escapeRegExp(key)}\\b`, 'g');
    content = content.replace(re, key);
}

content = content.replace(
    /\(([a-zA-Z_][a-zA-Z0-9_]*),\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>/g,
    (m, a, b) => {
        if (merged.includes(a) && merged.includes(b)) return m;
        return m;
    },
);

const destructure = merged.map((k) => `        ${k},`).join('\n');
const blockRe = /const props = \{[\s\S]*?\} = props;/;
if (!blockRe.test(content)) {
    console.error('props destructure block not found');
    process.exit(1);
}

content = content.replace(
    blockRe,
    `const props = {
        ...readExecutionPhoneBodyScope(scopeRef),
        renderFingerprint,
    } as Record<string, any>;
    const {
${destructure}
    } = props;`,
);

const badSlash = content.match(/\\=/g);
if (badSlash?.length) {
    console.error('remaining \\\\= count:', badSlash.length);
    process.exit(1);
}

const leftoverP = content.match(/\bp\.[a-zA-Z_]/g);
if (leftoverP?.length) {
    console.error('remaining p. refs:', [...new Set(leftoverP)].slice(0, 20).join(', '));
    process.exit(1);
}

fs.writeFileSync(phoneBodyPath, content);
console.log('PhoneBody repaired with', merged.length, 'destructured keys');
