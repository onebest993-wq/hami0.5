import fs from 'fs';

const core = fs.readFileSync(
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
    'utf8',
);
const lines = core.split('\n');
const markers = [
    'const realEstateSeizureHandlers =',
    'const scopeLocalBundles = buildExecutionDashboardCoreScopeLocalBundles',
    'const followupOrchestrator = useExecutionFollowupOrchestrator',
    'const propertyInlineSaveCtx =',
];
for (const m of markers) {
    const idx = lines.findIndex((l) => l.includes(m));
    console.log(m, idx >= 0 ? idx + 1 : 'NOT FOUND');
}
console.log('total lines', lines.length);
