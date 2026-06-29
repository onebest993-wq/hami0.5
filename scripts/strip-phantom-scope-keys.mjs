/**
 * يزيل مفاتيح getScopeSources غير المعرّفة على مستوى الـ hook (تسبب ReferenceError)
 * node scripts/strip-phantom-scope-keys.mjs
 */
import fs from 'fs';

const hookPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardState.ts';
const keysPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.ts';
const shellKeysPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts';
const phoneBodyPath =
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx';
const chunkKeysPath = 'scripts/_chunk-scope-keys.json';
const phoneKeysJsonPath = 'scripts/_phone-body-keys.json';

/** مفاتيح JSX/حلقات — ليست bindings على مستوى الـ hook */
const ARTIFACT_DENYLIST = new Set([
    'bundle',
    'checked',
    'config',
    'counts',
    'cur',
    'current',
    'entries',
    'existing',
    'fallback',
    'footer',
    'haspopup',
    'hint',
    'initiator',
    'inputMode',
    'isTask',
    'length',
    'locked',
    'num',
    'st',
    'target',
]);

function collectImportedValueNames(src) {
    const names = new Set();
    const importRe = /^import\s+(?!type\b)(?:[\s\S]*?)\s+from\s+['"][^'"]+['"]/gm;
    for (const block of src.match(importRe) || []) {
        if (block.startsWith('import type')) continue;
        const inner = block.replace(/^import\s+/, '').replace(/\s+from\s+['"][^'"]+['"];?$/, '');
        if (inner.startsWith('{')) {
            for (const part of inner.slice(1, -1).split(',')) {
                const t = part.trim();
                if (!t || t.startsWith('type ')) continue;
                const alias = t.split(/\s+as\s+/);
                names.add((alias[1] || alias[0]).trim());
            }
        } else if (inner.includes('* as ')) {
            names.add(inner.split('* as ')[1].trim());
        } else {
            names.add(inner.trim());
        }
    }
    return names;
}

function isTopLevelHookBinding(name, pre) {
    const patterns = [
        new RegExp(`^    const \\[[^\\]]*\\b${name}\\b`, 'm'),
        new RegExp(`^    const \\{[^}]*\\b${name}\\b`, 'm'),
        new RegExp(`^    (?:const|let|var|function) \\b${name}\\b`, 'm'),
    ];
    return patterns.some((re) => re.test(pre));
}

function collectScopeKeys(scopeBlock) {
    return [...scopeBlock.matchAll(/^\s+([A-Za-z_][A-Za-z0-9_]*),/gm)].map((m) => m[1]);
}

function removeLinesWithKeys(text, keys, linePattern) {
    const set = new Set(keys);
    return text
        .split('\n')
        .filter((line) => {
            const m = line.match(linePattern);
            if (!m) return true;
            return !set.has(m[1]);
        })
        .join('\n');
}

function removeJsonKeys(path, keys) {
    if (!fs.existsSync(path)) return;
    const set = new Set(keys);
    const arr = JSON.parse(fs.readFileSync(path, 'utf8'));
    fs.writeFileSync(path, JSON.stringify(arr.filter((k) => !set.has(k)), null, 2) + '\n');
}

let hook = fs.readFileSync(hookPath, 'utf8');
const hookStart = hook.indexOf('export function useExecutionDashboardState');
const scopeStart = hook.indexOf('getScopeSources: () => ({', hookStart);
const scopeEnd = hook.indexOf('\n        }),', scopeStart);
const scopeBlock = hook.slice(scopeStart, scopeEnd);
const pre = hook.slice(hookStart, scopeStart);

const imports = collectImportedValueNames(hook.slice(0, scopeStart));
const scopeKeys = collectScopeKeys(scopeBlock);

const phantom = scopeKeys.filter((k) => {
    if (ARTIFACT_DENYLIST.has(k)) return true;
    if (imports.has(k)) return false;
    return !isTopLevelHookBinding(k, pre);
});

if (!phantom.length) {
    console.log('No phantom scope keys found.');
    process.exit(0);
}

console.log(`Removing ${phantom.length} phantom keys:\n`, phantom.join(', '));

hook = removeLinesWithKeys(hook, phantom, /^\s+([A-Za-z_][A-Za-z0-9_]*),$/);
fs.writeFileSync(hookPath, hook);

for (const filePath of [keysPath, shellKeysPath]) {
    if (!fs.existsSync(filePath)) continue;
    let text = fs.readFileSync(filePath, 'utf8');
    for (const k of phantom) {
        text = text.replace(new RegExp(`\\n    '${k}',`, 'g'), '');
    }
    fs.writeFileSync(filePath, text);
}

let phoneBody = fs.readFileSync(phoneBodyPath, 'utf8');
phoneBody = removeLinesWithKeys(phoneBody, phantom, /^\s+([A-Za-z_][A-Za-z0-9_]*),$/);
fs.writeFileSync(phoneBodyPath, phoneBody);

removeJsonKeys(chunkKeysPath, phantom);
removeJsonKeys(phoneKeysJsonPath, phantom);

console.log('Done.');
