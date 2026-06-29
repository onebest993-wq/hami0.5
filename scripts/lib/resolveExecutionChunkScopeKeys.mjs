/**
 * يحلّ مفاتيح chunk scope من core + ملفات scope المستخرجة (موجة 14+).
 */
import fs from 'node:fs';

const CORE_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const DYNAMIC_SCOPE_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts';
const DECISIONSSEIZUREEVICTIONSCOPEBAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardDecisionsSeizureEvictionScopeBag.ts';
const WORKSPACESCOPEBAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardWorkspaceScopeBag.ts';
const TIMELINE_DOSSIER_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardTimelineDossierScopeBag.ts';
const FINANCIAL_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardFinancialScopeBag.ts';
const COERCIVE_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoerciveScopeBag.ts';
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

function extractDecisionsSeizureEvictionScopeBagKeys(core) {
    const keys = new Set();
    const marker = 'buildExecutionDashboardDecisionsSeizureEvictionScopeBag({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(DECISIONSSEIZUREEVICTIONSCOPEBAG_PATH)) {
        const src = fs.readFileSync(DECISIONSSEIZUREEVICTIONSCOPEBAG_PATH, 'utf8');
        for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
}

function extractWorkspaceScopeBagKeys(core) {
    const keys = new Set();
    const marker = 'buildExecutionDashboardWorkspaceScopeBag({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(WORKSPACESCOPEBAG_PATH)) {
        const src = fs.readFileSync(WORKSPACESCOPEBAG_PATH, 'utf8');
        for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
}

function extractTimelineDossierBagKeys(core) {
    const keys = new Set();
    const marker = 'buildExecutionDashboardTimelineDossierScopeBag({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(TIMELINE_DOSSIER_BAG_PATH)) {
        const src = fs.readFileSync(TIMELINE_DOSSIER_BAG_PATH, 'utf8');
        for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
}

function extractFinancialBagKeys(core) {
    const keys = new Set();
    const marker = 'buildExecutionDashboardFinancialScopeBag({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(FINANCIAL_BAG_PATH)) {
        const src = fs.readFileSync(FINANCIAL_BAG_PATH, 'utf8');
        for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
}

function extractCoerciveBagKeys(core) {
    const keys = new Set();
    const marker = 'buildExecutionDashboardCoerciveScopeBag({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(COERCIVE_BAG_PATH)) {
        const src = fs.readFileSync(COERCIVE_BAG_PATH, 'utf8');
        for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
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

const SCOPE_CHUNK_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreScopeAndChunk.ts';

function extractScopeBlock(core) {
    const marker = 'buildExecutionDashboardCoreDynamicScope({';
    let start = core.indexOf(marker);
    let srcForBlock = core;
    if (start < 0 && fs.existsSync(SCOPE_CHUNK_PATH)) {
        srcForBlock = fs.readFileSync(SCOPE_CHUNK_PATH, 'utf8');
        start = srcForBlock.indexOf(marker);
    }
    if (start < 0) throw new Error('buildExecutionDashboardCoreDynamicScope call not found');
    const open = start + marker.length - 1;
    const inputBody = extractBalancedBlock(srcForBlock, open);

    const dynamicSrc = fs.readFileSync(DYNAMIC_SCOPE_PATH, 'utf8');
    const returnStart = dynamicSrc.indexOf('return {');
    if (returnStart < 0) throw new Error('dynamic scope return not found');
    const returnOpen = returnStart + 'return '.length;
    const returnBody = extractBalancedBlock(dynamicSrc, returnOpen);

    return `${inputBody}\n${returnBody}`;
}

function extractModalScopeKeys(core) {
    const keys = new Set();
    const modalScopePath =
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardModalScope.ts';
    if (fs.existsSync(modalScopePath)) {
        const src = fs.readFileSync(modalScopePath, 'utf8');
        for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
        for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)) keys.add(m[1]);
    }
    for (const k of extractObjectKeys(core, 'executionModalFlags')) keys.add(k);
    for (const k of extractObjectKeys(core, 'executionModalSetters')) keys.add(k);
    if (core.includes('buildExecutionDashboardModalScope(')) keys.add('executionModalFlags');
    if (core.includes('buildExecutionDashboardModalScope(')) keys.add('executionModalSetters');
    if (core.includes('useExecutionDashboardCoreScopeAndChunk(')) {
        keys.add('executionModalFlags');
        keys.add('executionModalSetters');
    }
    return keys;
}

export function resolveExecutionChunkScopeKeys(coreSrc = fs.readFileSync(CORE_PATH, 'utf8')) {
    const block = extractScopeBlock(coreSrc);
    const explicit = extractExplicitScopeKeys(block);
    const spreads = [...block.matchAll(/\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]);
    const resolved = new Set(explicit);

    if (spreads.includes('executionModalFlags') || block.includes('executionModalFlags')) {
        for (const k of extractModalScopeKeys(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('executionModalSetters') || block.includes('executionModalSetters')) {
        for (const k of extractModalScopeKeys(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('decisionsSeizureEvictionScopeBag') || block.includes('decisionsSeizureEvictionScopeBag')) {
        for (const k of extractDecisionsSeizureEvictionScopeBagKeys(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('workspaceScopeBag') || block.includes('workspaceScopeBag')) {
        for (const k of extractWorkspaceScopeBagKeys(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('timelineDossierScopeBag') || block.includes('timelineDossierScopeBag')) {
        for (const k of extractTimelineDossierBagKeys(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('financialScopeBag') || block.includes('financialScopeBag')) {
        for (const k of extractFinancialBagKeys(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('coerciveScopeBag') || block.includes('coerciveScopeBag')) {
        for (const k of extractCoerciveBagKeys(coreSrc)) resolved.add(k);
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
