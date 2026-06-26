/**
 * يحلّ مفاتيح chunk scope من core + ملفات scope المستخرجة (موجة 14+).
 */
import fs from 'node:fs';

const CORE_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const DYNAMIC_SCOPE_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts';
const FOLLOWUP_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardFollowupScopeBag.ts';

function extractBalancedBlock(src, openBraceIdx) {
    let depth = 0;
    for (let i = openBraceIdx; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') {
            depth -= 1;
            if (depth === 0) return src.slice(openBraceIdx + 1, i);
        }
    }
    throw new Error('unbalanced');
}

function extractExplicitScopeKeys(block) {
    const keys = new Set();
    for (const m of block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)) keys.add(m[1]);
    for (const m of block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    return keys;
}

function extractObjectKeys(core, varName) {
    const re = new RegExp(`const ${varName} = \\{`);
    const m = core.match(re);
    if (!m) return new Set();
    const start = core.indexOf(m[0]) + m[0].length - 1;
    const body = extractBalancedBlock(core, start);
    return extractExplicitScopeKeys(body);
}

function extractFollowupBagKeys(core) {
    const keys = new Set();
    const marker = 'buildExecutionDashboardFollowupScopeBag({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(FOLLOWUP_BAG_PATH)) {
        const src = fs.readFileSync(FOLLOWUP_BAG_PATH, 'utf8');
        for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
}

function extractScopeBlock(core) {
    const marker = 'buildExecutionDashboardCoreDynamicScope({';
    const start = core.indexOf(marker);
    if (start < 0) throw new Error('buildExecutionDashboardCoreDynamicScope call not found');
    const open = start + marker.length - 1;
    const inputBody = extractBalancedBlock(core, open);

    const dynamicSrc = fs.readFileSync(DYNAMIC_SCOPE_PATH, 'utf8');
    const returnStart = dynamicSrc.indexOf('return {');
    if (returnStart < 0) throw new Error('dynamic scope return not found');
    const returnOpen = returnStart + 'return '.length;
    const returnBody = extractBalancedBlock(dynamicSrc, returnOpen);

    return `${inputBody}\n${returnBody}`;
}

export function resolveExecutionChunkScopeKeys(coreSrc = fs.readFileSync(CORE_PATH, 'utf8')) {
    const block = extractScopeBlock(coreSrc);
    const explicit = extractExplicitScopeKeys(block);
    const spreads = [...block.matchAll(/\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]);
    const resolved = new Set(explicit);

    if (spreads.includes('executionModalFlags') || block.includes('executionModalFlags')) {
        for (const k of extractObjectKeys(coreSrc, 'executionModalFlags')) resolved.add(k);
    }
    if (spreads.includes('executionModalSetters') || block.includes('executionModalSetters')) {
        for (const k of extractObjectKeys(coreSrc, 'executionModalSetters')) resolved.add(k);
    }
    if (spreads.includes('pickExecutionFollowupScopeSlice') || block.includes('followupScopeBag')) {
        for (const k of extractFollowupBagKeys(coreSrc)) resolved.add(k);
    }

    for (const file of [
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardStaticChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardRuntimeChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardUiChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardImportedHelpersChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardPhoneBodyComponentsChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScope.ts',
    ]) {
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        for (const k of [...src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)].map((m) => m[1])) {
            resolved.add(k);
        }
        for (const k of [...src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1])) {
            resolved.add(k);
        }
    }

    return resolved;
}
