import fs from 'fs';

const core = fs.readFileSync(
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
    'utf8',
);
const lines = core.split('\n');

const startIdx = lines.findIndex((l) => l.includes('executorDecisions,')) - 1;
const endIdx = lines.findIndex((l) => l.includes('const specificDeliveryConvertedAmount ='));

const body = lines.slice(startIdx, endIdx).join('\n');

const keywords = new Set([
    'if', 'else', 'return', 'const', 'let', 'var', 'function', 'typeof', 'new', 'true', 'false', 'null',
    'undefined', 'async', 'await', 'import', 'from', 'export', 'default', 'case', 'switch', 'break',
    'continue', 'try', 'catch', 'finally', 'throw', 'for', 'while', 'do', 'in', 'of', 'this', 'Boolean',
    'String', 'Number', 'Array', 'Object', 'Record', 'Date', 'Math', 'JSON', 'Promise',
]);

const declared = new Set();
for (const m of body.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
for (const m of body.matchAll(/\blet\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
for (const block of body.matchAll(/\{\s*([^}]+)\}\s*=\s*(?:use|[\w])/g)) {
    for (const part of block[1].split(',')) {
        const name = part.trim().split(':')[0].split('=')[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
    }
}

const used = new Set();
for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
    const id = m[1];
    if (!keywords.has(id) && !declared.has(id)) used.add(id);
}

const free = [...used]
    .filter((id) => !id.startsWith('useExecution') && !id.startsWith('useEviction'))
    .filter((id) => !id.startsWith('useDossier') && !id.startsWith('useParty') && !id.startsWith('useFinancial'))
    .filter((id) => id !== 'useMemo' && id !== 'useCallback')
    .filter((id) => id !== 'useExecutionDecisionAppealSnapshot' && id !== 'useExecutionDossierLifecycleActionsOrchestrator')
    .filter((id) => id !== 'useDossierMeta' && id !== 'useEvictionProcedures')
    .filter((id) => !['as', 'OF', 'PERIOD', 'TRIGGER', 'CRITICAL', 'END', 'GRACE', 'current', 'd'].includes(id))
    .filter((id) => !/^[A-Z_]+$/.test(id) || ['EVICTION_WORKFLOW_BY_ACTION_ID', 'READY_FOR_COERCIVE'].includes(id))
    .filter((id) => id !== 'Debtor' && id !== 'TimelineEvent' && id !== 'ExecutionFile')
    .sort();

fs.writeFileSync('scripts/handler-cluster-ctx-keys.json', JSON.stringify(free, null, 2), 'utf8');
console.log('start', startIdx + 1, 'end', endIdx + 1, 'body lines', endIdx - startIdx);
console.log('declared', declared.size);
console.log('free vars', free.length);
console.log(free.join('\n'));
