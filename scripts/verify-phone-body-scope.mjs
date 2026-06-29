import fs from 'fs';
import {
    buildPhoneBodyScopeKeys,
    collectPhoneBodyRequiredKeys,
    extractComponentProps,
    extractPhoneBodyDestructuredKeys,
    isPassthroughScopeKey,
    isValidScopeKey,
    resolveExecutionScopeBindings,
    validateScopeKeys,
} from './phone-body-scope-utils.mjs';

const phoneBodyPath =
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx';
const keysJsonPath = 'scripts/_phone-body-keys.json';
const viewPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardView.tsx';

const body = fs.readFileSync(phoneBodyPath, 'utf8');
const view = fs.readFileSync(viewPath, 'utf8');
const keys = JSON.parse(fs.readFileSync(keysJsonPath, 'utf8'));
const keySet = new Set(keys);
const viewBindings = resolveExecutionScopeBindings(view);
const componentProps = extractComponentProps(view);
const { required } = collectPhoneBodyRequiredKeys(body, view);
const expectedKeys = new Set(buildPhoneBodyScopeKeys(body, view));

const scopeKeys = keySet;

const destructured = extractPhoneBodyDestructuredKeys(body);

const problems = [];
problems.push(...validateScopeKeys(view, [...scopeKeys]));

for (const key of scopeKeys) {
    if (componentProps.has(key) || isPassthroughScopeKey(key)) continue;
    if (!isValidScopeKey(key)) continue;
}

for (const id of required) {
    if (!expectedKeys.has(id)) {
        problems.push(`required key missing from buildPhoneBodyScopeKeys: ${id}`);
    }
    if (!destructured.has(id)) problems.push(`missing destructure: ${id}`);
    if (!keySet.has(id)) problems.push(`missing prop key: ${id}`);
    if (!scopeKeys.has(id)) problems.push(`missing getScopeSources: ${id}`);
}

if (keySet.size !== destructured.size) {
    const missingFromBody = [...keySet].filter(
        (k) => !destructured.has(k) && !isPassthroughScopeKey(k),
    );
    if (missingFromBody.length) {
        problems.push(`keys missing from destructure (${missingFromBody.length}): ${missingFromBody.slice(0, 8).join(', ')}…`);
    }
}

if (/\bp\.[a-zA-Z_]/.test(body)) {
    problems.push('PhoneBody still contains p.* references — run repair-phone-body.mjs');
}
if (/\\=/.test(body)) {
    problems.push('PhoneBody contains corrupted \\= JSX syntax');
}

if (problems.length) {
    console.error('PhoneBody scope verification failed:\n' + [...new Set(problems)].join('\n'));
    process.exit(1);
}

console.log('PhoneBody scope OK —', keys.length, 'keys aligned');
