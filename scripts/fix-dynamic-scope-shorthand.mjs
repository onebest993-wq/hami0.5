import fs from 'node:fs';
import path from 'node:path';

const p = path.join(
    import.meta.dirname,
    '../src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts',
);
let s = fs.readFileSync(p, 'utf8');
const before = (s.match(/^        [a-zA-Z_][a-zA-Z0-9_]*,$/gm) || []).length;
s = s.replace(/^        ([a-zA-Z_][a-zA-Z0-9_]*),$/gm, '        $1: input.$1,');
fs.writeFileSync(p, s);
const after = (s.match(/^        [a-zA-Z_][a-zA-Z0-9_]*,$/gm) || []).length;
console.log('fixed shorthand lines:', before, '->', after);
