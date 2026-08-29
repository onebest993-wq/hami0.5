import fs from 'node:fs';

const tests = {
    'src/app/components/lawyer/FinancialOperationsCenter/__tests__/focStructure.test.ts':
        'src/app/components/lawyer/FinancialOperationsCenter',
    'src/app/components/lawyer/ExecutionCreationView/__tests__/executionCreationViewStructure.test.ts':
        'src/app/components/lawyer/ExecutionCreationView',
};

const deleted = new Set(
    fs.readFileSync('.audit/dead-list.txt', 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
);

const PATH_RE = /["'`]([A-Za-z0-9_/.\-]+\.tsx?)["'`]/g;
const out = new Set();

for (const [test, base] of Object.entries(tests)) {
    const txt = fs.readFileSync(test, 'utf8');
    for (const m of txt.matchAll(PATH_RE)) {
        for (const cand of [m[1], `${base}/${m[1]}`]) {
            if (deleted.has(cand)) out.add(cand);
        }
    }
}

const list = [...out].sort();
console.log(`exact restores: ${list.length}`);
for (const f of list) console.log(`  ${f}`);
fs.writeFileSync('.audit/restore-list.txt', `${list.join('\n')}\n`);
