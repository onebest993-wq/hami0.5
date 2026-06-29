import fs from 'fs';

const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf8').split(/\r?\n/);
const chunks = [
    lines.slice(13743, 14058),
    lines.slice(14997, 15590),
].flat();

const keys = new Set();
const rx = /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{/g;
for (const line of chunks) {
    let m;
    while ((m = rx.exec(line))) {
        if (!m[1].startsWith('Lazy') && !m[1].startsWith('EXEC_')) keys.add(m[1]);
    }
    const cond = line.match(/\{([A-Za-z_][A-Za-z0-9_]*)\s*&&/);
    if (cond) keys.add(cond[1]);
}

// followup
const fuStart = lines.findIndex((l) => l.includes('buildFollowupModalSnapshot({'));
const fuEnd = lines.findIndex((l, i) => i > fuStart && l.trim().endsWith('})}'));
for (const line of lines.slice(fuStart, fuEnd + 1)) {
    for (const m of line.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?::|,)/g)) {
        keys.add(m[1]);
    }
}

for (const m of fs
    .readFileSync('src/app/components/lawyer/ExecutionDashboard/hooks/pickSeizedPropertyPortalProps.ts', 'utf8')
    .matchAll(/'([a-zA-Z0-9_]+)'/g)) {
    keys.add(m[1]);
}

keys.add('showUnifiedExecutionModal');
keys.add('file');
keys.add('requestEditTimelineEvent');
keys.delete('export');
keys.delete('type');
keys.delete('open');
keys.delete('Suspense');

const sorted = [...keys].sort();
const body = sorted.map((k) => `        ${k}: v.${k},`).join('\n');

const followupInner = lines
    .slice(fuStart + 1, fuEnd)
    .map((l) => l.replace(/^                    /, '            '))
    .join('\n');

const out = `// @ts-nocheck
/** Auto-generated — لا تُعدَّل يدوياً */
import { buildFollowupModalSnapshot } from '../followupModalSnapshot';

export function buildShellOverlayProps(v: Record<string, any>) {
    return {
${body}
        executionFollowupModalSnapshot: buildFollowupModalSnapshot({
${followupInner}
        }),
    };
}
`;

fs.writeFileSync(
    'src/app/components/lawyer/ExecutionDashboard/hooks/buildShellOverlayProps.generated.ts',
    out,
);
console.log('generated', sorted.length, 'keys');
