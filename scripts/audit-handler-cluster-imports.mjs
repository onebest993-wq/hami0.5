import fs from 'node:fs';

const hc = fs.readFileSync(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreHandlerCluster.ts',
    'utf8',
);
const imports = new Set();
for (const m of hc.matchAll(/import\s+\{([^}]+)\}\s+from\s+'([^']+)'/g)) {
    for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+/).pop();
        if (name) imports.add(name);
    }
}
for (const m of hc.matchAll(/import\s+(\w+)\s+from\s+'([^']+)'/g)) {
    imports.add(m[1]);
}

const used = [...hc.matchAll(/\b(use[A-Z][A-Za-z0-9_]*)\s*\(/g)].map((x) => x[1]);
const uniq = [...new Set(used)];
const missing = uniq.filter(
    (u) =>
        (u.startsWith('useExecution') || u.startsWith('useDossier') || u.startsWith('useEviction')) &&
        !imports.has(u),
);
console.log('Missing:', missing.join('\n'));
