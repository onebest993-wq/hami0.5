/**
 * Trim useExecutionDashboardCore imports — body-usage only, multiline-safe.
 */
import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const core = fs.readFileSync(corePath, 'utf8');
const fnIdx = core.indexOf('export function useExecutionDashboardCore');
if (fnIdx < 0) {
    console.error('export function useExecutionDashboardCore not found');
    process.exit(1);
}

const preamble = core.slice(0, fnIdx);
const body = core.slice(fnIdx);

const ids = new Set();
for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) ids.add(m[1]);

const REQUIRED_EXTRA = [
    'useExecutionDashboardCoreBootPipeline',
    'useExecutionDashboardCorePipelinesChain',
    'buildExecutionDashboardCoreRuntimeTailInput',
    'useExecutionDashboardCoreFollowupDebtorPipeline',
    'useExecutionDashboardCoreClaimFinancialLedgerPipeline',
    'useExecutionDashboardCoreHandlerCluster',
    'pickCoreAssemblyHandlers',
    'buildExecutionDashboardCoreModalScopeInput',
    'buildExecutionDashboardCoreChunkFingerprint',
    'SCOPE_LOCAL_ALL_KEYS',
    'SCOPE_REST_ALL_KEYS',
    'READY_FOR_COERCIVE',
];
for (const x of REQUIRED_EXTRA) ids.add(x);

function extractImportBlocks(text) {
    const blocks = [];
    const lines = text.split('\n');
    let i = 0;
    while (i < lines.length) {
        const trimmed = lines[i].trim();
        if (!trimmed.startsWith('import ')) {
            i++;
            continue;
        }
        let block = lines[i];
        i++;
        while (i < lines.length && !block.includes(';')) {
            block += '\n' + lines[i];
            i++;
        }
        blocks.push(block.trim());
    }
    return blocks;
}

function parseImportClause(clause) {
    const symbols = [];
    let rest = clause.trim();

    if (rest.startsWith('type ')) rest = rest.slice(5).trim();

    if (rest.startsWith('* as ')) {
        const m = rest.match(/^\* as (\w+)/);
        if (m) symbols.push({ local: m[1], kind: 'namespace' });
        return symbols;
    }

    const defaultThenNamed = rest.match(/^(\w+)\s*,\s*(\{[\s\S]*\})\s*$/);
    if (defaultThenNamed) {
        symbols.push({ local: defaultThenNamed[1], kind: 'default' });
        rest = defaultThenNamed[2];
    } else if (/^\w+$/.test(rest)) {
        symbols.push({ local: rest, kind: 'default' });
        return symbols;
    }

    const namedMatch = rest.match(/^\{([\s\S]*)\}$/);
    if (namedMatch) {
        for (const part of namedMatch[1].split(',')) {
            const seg = part.trim().replace(/^\/\/.*$/, '');
            if (!seg) continue;
            const mm = seg.match(/^(?:type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
            if (!mm) continue;
            symbols.push({
                local: mm[2] || mm[1],
                imported: mm[1],
                kind: seg.startsWith('type ') ? 'type' : 'named',
            });
        }
    }
    return symbols;
}

function filterImportBlock(block) {
    const sideEffect = /^import\s+['"][^'"]+['"]\s*;?\s*$/.test(block.replace(/\s+/g, ' '));
    if (sideEffect) return null;

    const m = block.match(/^import\s+([\s\S]+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/);
    if (!m) return null;

    const isTypeOnly = block.startsWith('import type ');
    const clause = m[1].trim();
    const from = m[2];
    const symbols = parseImportClause(clause);
    const kept = symbols.filter((s) => ids.has(s.local));
    if (!kept.length) return null;

    const defaults = kept.filter((s) => s.kind === 'default');
    const namespaces = kept.filter((s) => s.kind === 'namespace');
    const named = kept.filter((s) => s.kind === 'type' || s.kind === 'named');

    const parts = [];
    if (defaults.length) parts.push(defaults.map((s) => s.local).join(', '));
    if (namespaces.length) parts.push(`* as ${namespaces[0].local}`);
    if (named.length) {
        const namedStr = named
            .map((s) => {
                if (s.kind === 'type') return `type ${s.imported || s.local}`;
                if (s.imported && s.imported !== s.local) return `${s.imported} as ${s.local}`;
                return s.local;
            })
            .join(', ');
        parts.push(`{ ${namedStr} }`);
    }

    const prefix = isTypeOnly && !defaults.length && named.every((s) => s.kind === 'type') ? 'import type ' : 'import ';
    return `${prefix}${parts.join(', ')} from '${from}';`;
}

const header = `// @ts-nocheck
/** منطق ExecutionDashboard — chunk execution-dashboard-core */
`;

const keptImports = [];
for (const block of extractImportBlocks(preamble)) {
    const filtered = filterImportBlock(block);
    if (filtered) keptImports.push(filtered);
}

const tail = core.slice(fnIdx);
fs.writeFileSync(corePath, `${header}\n${keptImports.join('\n')}\n\n${tail}`, 'utf8');

const lineCount = fs.readFileSync(corePath, 'utf8').split('\n').length;
console.log('trimmed imports in', corePath);
console.log('import statements:', keptImports.length, '| total lines:', lineCount);
