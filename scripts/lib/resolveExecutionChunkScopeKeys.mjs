/**
 * يحلّ مفاتيح chunk scope من core + ملفات scope المستخرجة (موجة 14+).
 */
import fs from 'node:fs';
import { extractConstArrayKeys } from './extractConstArrayKeys.mjs';

const CORE_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const DYNAMIC_SCOPE_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts';
void fs.existsSync(DYNAMIC_SCOPE_PATH);
const DECISIONSSEIZUREEVICTIONSCOPEBAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardDecisionsSeizureEvictionScopeBag.ts';
void fs.existsSync(DECISIONSSEIZUREEVICTIONSCOPEBAG_PATH);
const WORKSPACESCOPEBAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardWorkspaceScopeBag.ts';
void fs.existsSync(WORKSPACESCOPEBAG_PATH);
const TIMELINE_DOSSIER_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardTimelineDossierScopeBag.ts';
void fs.existsSync(TIMELINE_DOSSIER_BAG_PATH);
const FINANCIAL_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardFinancialScopeBag.ts';
void fs.existsSync(FINANCIAL_BAG_PATH);
const COERCIVE_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoerciveScopeBag.ts';
void fs.existsSync(COERCIVE_BAG_PATH);
const FOLLOWUP_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardFollowupScopeBag.ts';
void fs.existsSync(FOLLOWUP_BAG_PATH);

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

function addScopeBagArrayKeys(resolved, filePath, constName) {
    if (!fs.existsSync(filePath)) return;
    const src = fs.readFileSync(filePath, 'utf8');
    for (const k of extractConstArrayKeys(src, constName, filePath)) resolved.add(k);
    for (const k of extractPropertyKeysFromFile(filePath)) resolved.add(k);
}

function extractObjectConstKeys(path, constName) {
    if (!fs.existsSync(path)) return new Set();
    const c = fs.readFileSync(path, 'utf8');
    const re = new RegExp(`export const ${constName} = \\{`);
    const m = c.match(re);
    if (!m) return new Set();
    const start = c.indexOf(m[0]) + m[0].length - 1;
    const body = extractBalancedBlock(c, start);
    return extractExplicitScopeKeys(body);
}

function extractInputScopeKeysFromGenerated(path) {
    if (!fs.existsSync(path)) return new Set();
    const src = fs.readFileSync(path, 'utf8');
    const keys = new Set();
    for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*): input\./gm)) keys.add(m[1]);
    return keys;
}

function extractPipeFragmentKeys(path) {
    if (!fs.existsSync(path)) return new Set();
    const src = fs.readFileSync(path, 'utf8');
    const keys = new Set();
    for (const m of src.matchAll(/'([^'|]+)'/g)) {
        const token = m[1];
        if (token.includes('|')) {
            for (const part of token.split('|')) keys.add(part);
        } else {
            keys.add(token);
        }
    }
    return keys;
}

function extractPropertyKeysFromFile(path) {
    if (!fs.existsSync(path)) return new Set();
    const src = fs.readFileSync(path, 'utf8');
    const keys = new Set();
    for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    for (const m of src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)) keys.add(m[1]);
    return keys;
}

function extractPhoneBodyFallbackComponentKeys() {
    const path =
        'src/app/components/lawyer/ExecutionDashboard/components/executionDashboardPhoneBodyScopeFallback.ts';
    if (!fs.existsSync(path)) return new Set();
    const src = fs.readFileSync(path, 'utf8');
    const marker = 'const componentFallbacks: Record<string, unknown> = {';
    const start = src.indexOf(marker);
    if (start < 0) return new Set();
    const open = start + marker.length - 1;
    const body = extractBalancedBlock(src, open);
    return extractExplicitScopeKeys(body);
}

function collectPhaseCScopeArchitectureKeys(resolved) {
    const coreDir = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore';
    const bagSpecs = [
        [FOLLOWUP_BAG_PATH, 'EXECUTION_DASHBOARD_FOLLOWUP_SCOPE_BAG_KEYS'],
        [COERCIVE_BAG_PATH, 'EXECUTION_DASHBOARD_COERCIVE_SCOPE_BAG_KEYS'],
        [DECISIONSSEIZUREEVICTIONSCOPEBAG_PATH, 'EXECUTION_DASHBOARD_DECISIONS_SEIZURE_EVICTION_SCOPE_BAG_KEYS'],
        [WORKSPACESCOPEBAG_PATH, 'EXECUTION_DASHBOARD_WORKSPACE_SCOPE_BAG_KEYS'],
        [TIMELINE_DOSSIER_BAG_PATH, 'EXECUTION_DASHBOARD_TIMELINE_DOSSIER_SCOPE_BAG_KEYS'],
        [FINANCIAL_BAG_PATH, 'EXECUTION_DASHBOARD_FINANCIAL_SCOPE_BAG_KEYS'],
    ];
    for (const [path, constName] of bagSpecs) addScopeBagArrayKeys(resolved, path, constName);

    const runtimeKeysPath = `${coreDir}/executionDashboardCoreRuntimeVarKeys.generated.ts`;
    if (fs.existsSync(runtimeKeysPath)) {
        const runtimeSrc = fs.readFileSync(runtimeKeysPath, 'utf8');
        for (const k of extractConstArrayKeys(runtimeSrc, 'CORE_RUNTIME_VAR_SEED_KEYS', runtimeKeysPath)) {
            resolved.add(k);
        }
        for (const k of extractConstArrayKeys(runtimeSrc, 'CORE_RUNTIME_VAR_KEYS', runtimeKeysPath)) {
            resolved.add(k);
        }
    }

    const bundleGroupsPath = `${coreDir}/buildScopeBundleGroups.ts`;
    if (fs.existsSync(bundleGroupsPath)) {
        const bundleSrc = fs.readFileSync(bundleGroupsPath, 'utf8');
        for (const m of bundleSrc.matchAll(/'([^']+)'/g)) resolved.add(m[1]);
    }

    for (const k of extractInputScopeKeysFromGenerated(
        `${coreDir}/groupExecutionDashboardCoreScopeBagInput.generated.ts`,
    )) {
        resolved.add(k);
    }

    for (const k of extractPipeFragmentKeys(`${coreDir}/executionDashboardCoreScopeBagFragments.ui.ts`)) {
        resolved.add(k);
    }
    const scopeFragmentsDir = `${coreDir}/scopeBagFragments`;
    if (fs.existsSync(scopeFragmentsDir)) {
        for (const name of fs.readdirSync(scopeFragmentsDir)) {
            if (!name.endsWith('.ts') || name === 'index.ts') continue;
            for (const k of extractPipeFragmentKeys(`${scopeFragmentsDir}/${name}`)) {
                resolved.add(k);
            }
        }
    } else {
        for (const k of extractPipeFragmentKeys(`${coreDir}/executionDashboardCoreScopeBagFragments.ts`)) {
            resolved.add(k);
        }
    }

    for (const file of [
        `${coreDir}/buildExecutionDashboardCoreScopeRestBundles.ts`,
        `${coreDir}/buildExecutionDashboardCoreScopeLocalBundles.ts`,
        `${coreDir}/buildExecutionDashboardModalScope.ts`,
        `${coreDir}/pickHandlerClusterAssemblyHandlers.ts`,
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardStaticChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardRuntimeChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/hooks/pickExecutionPhoneBodyScopeReadBag.ts',
    ]) {
        for (const k of extractPropertyKeysFromFile(file)) resolved.add(k);
        if (fs.existsSync(file)) {
            const src = fs.readFileSync(file, 'utf8');
            for (const k of extractConstArrayKeys(src, 'EXECUTION_PHONE_BODY_SCOPE_READ_KEYS', file)) {
                resolved.add(k);
            }
        }
    }

    for (const [file, constName] of [
        [
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScopeShell.ts',
            'EXECUTION_DASHBOARD_LAZY_CHUNK_SCOPE_SHELL',
        ],
        [
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScopeOverlays.ts',
            'EXECUTION_DASHBOARD_LAZY_CHUNK_SCOPE_OVERLAYS',
        ],
    ]) {
        for (const k of extractObjectConstKeys(file, constName)) {
            resolved.add(k);
        }
    }
    for (const k of extractObjectConstKeys(
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardUiChunkScope.ts',
        'EXECUTION_DASHBOARD_UI_CHUNK_SCOPE',
    )) {
        resolved.add(k);
    }
    for (const k of extractObjectConstKeys(
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardImportedHelpersChunkScope.ts',
        'EXECUTION_DASHBOARD_IMPORTED_HELPERS_CHUNK_SCOPE',
    )) {
        resolved.add(k);
    }
    for (const k of extractPhoneBodyFallbackComponentKeys()) resolved.add(k);

    const followupRegistryPath =
        'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts';
    if (fs.existsSync(followupRegistryPath)) {
        const followupSrc = fs.readFileSync(followupRegistryPath, 'utf8');
        for (const k of extractConstArrayKeys(
            followupSrc,
            'EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS',
            followupRegistryPath,
        )) {
            resolved.add(k);
        }
    }

    resolved.add('followupModalSpecializationEffective');
    resolved.add('followupSpecialization');

    // Phone-body registry component keys supplied at render layer (lazy/direct import), not chunk scope bags.
    for (const k of [
        'DossierSwitcher',
        'GuarantorExternalHub',
        'InlineActionGate',
        'UnifiedSeizureLogHost',
    ]) {
        resolved.add(k);
    }
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
        addScopeBagArrayKeys(
            keys,
            DECISIONSSEIZUREEVICTIONSCOPEBAG_PATH,
            'EXECUTION_DASHBOARD_DECISIONS_SEIZURE_EVICTION_SCOPE_BAG_KEYS',
        );
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
        addScopeBagArrayKeys(keys, WORKSPACESCOPEBAG_PATH, 'EXECUTION_DASHBOARD_WORKSPACE_SCOPE_BAG_KEYS');
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
        addScopeBagArrayKeys(
            keys,
            TIMELINE_DOSSIER_BAG_PATH,
            'EXECUTION_DASHBOARD_TIMELINE_DOSSIER_SCOPE_BAG_KEYS',
        );
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
        addScopeBagArrayKeys(keys, FINANCIAL_BAG_PATH, 'EXECUTION_DASHBOARD_FINANCIAL_SCOPE_BAG_KEYS');
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
        addScopeBagArrayKeys(keys, COERCIVE_BAG_PATH, 'EXECUTION_DASHBOARD_COERCIVE_SCOPE_BAG_KEYS');
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
        addScopeBagArrayKeys(keys, FOLLOWUP_BAG_PATH, 'EXECUTION_DASHBOARD_FOLLOWUP_SCOPE_BAG_KEYS');
    }
    return keys;
}

const SCOPE_CHUNK_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreScopeAndChunk.ts';
const SCOPE_SOURCES_LAZY_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardCoreScopeSourcesLazy.ts';
void fs.existsSync(SCOPE_SOURCES_LAZY_PATH);
const SCOPE_SOURCE_GROUPS_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardCoreScopeSourceGroups.ts';

function extractScopeBlockFromSourceGroups() {
    if (!fs.existsSync(SCOPE_SOURCE_GROUPS_PATH)) {
        throw new Error('executionDashboardCoreScopeSourceGroups.ts not found');
    }
    const groupsSrc = fs.readFileSync(SCOPE_SOURCE_GROUPS_PATH, 'utf8');
    const returnStart = groupsSrc.indexOf('    return {');
    if (returnStart < 0) throw new Error('scope source groups return not found');
    const returnOpen = returnStart + '    return '.length;
    const returnBody = extractBalancedBlock(groupsSrc, returnOpen);
    const inputMatch = groupsSrc.match(
        /ExecutionDashboardCoreDeferredChunkScopeSourcesInput = \{([\s\S]*?)\};/,
    );
    const inputBody = inputMatch ? inputMatch[1] : '';
    return `${inputBody}\n${returnBody}`;
}

function extractScopeBlock(core) {
    const marker = 'buildExecutionDashboardCoreDynamicScope({';
    let start = core.indexOf(marker);
    let srcForBlock = core;
    if (start < 0 && fs.existsSync(SCOPE_SOURCES_LAZY_PATH)) {
        srcForBlock = fs.readFileSync(SCOPE_SOURCES_LAZY_PATH, 'utf8');
        start = srcForBlock.indexOf(marker);
    }
    if (start < 0 && fs.existsSync(SCOPE_CHUNK_PATH)) {
        srcForBlock = fs.readFileSync(SCOPE_CHUNK_PATH, 'utf8');
        start = srcForBlock.indexOf(marker);
    }
    if (start < 0) {
        return extractScopeBlockFromSourceGroups();
    }
    const open = start + marker.length - 1;
    const inputBody = extractBalancedBlock(srcForBlock, open);

    if (!fs.existsSync(DYNAMIC_SCOPE_PATH)) {
        return `${inputBody}\n${extractScopeBlockFromSourceGroups()}`;
    }

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
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScopeShell.ts',
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScopeOverlays.ts',
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

    collectPhaseCScopeArchitectureKeys(resolved);

    return resolved;
}
