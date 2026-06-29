/**
 * Phase B — أدوات مشتركة لاستخراج حقائب scope بأمان
 */
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const CORE_PATH = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
);
export const DYNAMIC_SCOPE_PATH = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts',
);

export const SCOPE_BAGS_IN_CALL = [
    'executionModalFlags',
    'executionModalSetters',
    'followupScopeBag',
    'coerciveScopeBag',
    'financialScopeBag',
    'timelineDossierScopeBag',
    'decisionsSeizureEvictionScopeBag',
    'workspaceScopeBag',
];

export function extractBalancedBlock(src, openBraceIdx) {
    let depth = 0;
    for (let i = openBraceIdx; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') {
            depth -= 1;
            if (depth === 0) return { body: src.slice(openBraceIdx + 1, i), end: i + 1 };
        }
    }
    throw new Error('unbalanced brace block');
}

export function extractShorthandKeys(body) {
    return [...body.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1]);
}

export function extractObjectKeys(src, varName) {
    const marker = `const ${varName} = {`;
    const start = src.indexOf(marker);
    if (start < 0) return [];
    const open = start + marker.length - 1;
    const { body } = extractBalancedBlock(src, open);
    return extractShorthandKeys(body);
}

export function transformShorthandLines(body, inputName = 'input') {
    return body
        .split('\n')
        .map((line) => {
            const m = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*),(\s*)$/);
            if (m) return `${m[1]}${m[2]}: ${inputName}.${m[2]},${m[3]}`;
            return line;
        })
        .join('\n');
}

export function readDynamicScopeCallKeys(coreSrc) {
    const lazyMarker =
        'getScopeSources: () =>\n            buildExecutionDashboardChunkScopeSources(\n                buildExecutionDashboardCoreDynamicScope({';
    const lazyStart = coreSrc.indexOf(lazyMarker);
    if (lazyStart < 0) throw new Error('dynamic scope call not found in core');
    const lazyOpen = lazyStart + lazyMarker.length - 1;
    const lazyExtract = extractBalancedBlock(coreSrc, lazyOpen);
    const bagSet = new Set(SCOPE_BAGS_IN_CALL);
    return extractShorthandKeys(lazyExtract.body).filter((k) => !bagSet.has(k));
}

export function rebuildScopeCall(coreSrc, scopeKeys) {
    const bagLines = SCOPE_BAGS_IN_CALL.map((b) => `                    ${b},`).join('\n');
    const scopeInputLines = scopeKeys.map((k) => `                        ${k},`).join('\n');
    const lazyMarker =
        'getScopeSources: () =>\n            buildExecutionDashboardChunkScopeSources(\n                buildExecutionDashboardCoreDynamicScope({';
    const lazyStart = coreSrc.indexOf(lazyMarker);
    if (lazyStart < 0) throw new Error('lazy scope call not found');
    const lazyOpen = lazyStart + lazyMarker.length - 1;
    const lazyExtract = extractBalancedBlock(coreSrc, lazyOpen);
    let tail = coreSrc.slice(lazyExtract.end);
    // Normalize tail after dynamic-scope object: must close ChunkScopeSources + getScopeSources property.
    tail = tail.replace(/^\s*\)\s*,?\s*\)\s*,?/, '');
    return (
        coreSrc.slice(0, lazyStart) +
        `getScopeSources: () =>
            buildExecutionDashboardChunkScopeSources(
                buildExecutionDashboardCoreDynamicScope({
${bagLines}
${scopeInputLines}
                }),
            ),` +
        tail
    );
}

export function ensureCoreImport(coreSrc, symbol, importPath, afterImportLine) {
    if (coreSrc.includes(`${symbol}'`)) return coreSrc;
    return coreSrc.replace(
        afterImportLine,
        `${afterImportLine}\nimport { ${symbol} } from '${importPath}';`,
    );
}

/** إصلاح shorthand مكسور (key, بدلاً من key: input.key,) */
export function fixDynamicScopeShorthand(dynamicSrc) {
    return dynamicSrc.replace(/^        ([a-zA-Z_][a-zA-Z0-9_]*),$/gm, '        $1: input.$1,');
}

export function removeKeysFromDynamicScope(dynamicSrc, keys) {
    let next = dynamicSrc;
    for (const key of keys) {
        next = next.replace(new RegExp(`\\n\\s+${key}: input\\.${key},`, 'g'), '');
    }
    return next;
}

export function addBagSpreadToDynamicScope(dynamicSrc, bagVar, afterBagVar) {
    if (dynamicSrc.includes(bagVar)) return dynamicSrc;
    let next = dynamicSrc.replace(
        `    const ${afterBagVar} = input.${afterBagVar} as Record<string, unknown>;\n    return {`,
        `    const ${afterBagVar} = input.${afterBagVar} as Record<string, unknown>;\n    const ${bagVar} = input.${bagVar} as Record<string, unknown>;\n    return {`,
    );
    next = next.replace(
        `        ...${afterBagVar},\n`,
        `        ...${afterBagVar},\n        ...${bagVar},\n`,
    );
    return next;
}

export function writeBagFile(outPath, bagFnName, bagTypeName, comment, keys) {
    const body = keys.map((k) => `        ${k},`).join('\n');
    const src = `// @ts-nocheck
/** ${comment} */
export type ${bagTypeName} = Record<string, unknown>;

export function ${bagFnName}(
    input: ${bagTypeName},
): Record<string, unknown> {
    return {
${transformShorthandLines(body)}
    };
}
`;
    fs.writeFileSync(outPath, src, 'utf8');
}

export function getModalKeySet(coreSrc) {
    return new Set([
        ...extractObjectKeys(coreSrc, 'executionModalFlags'),
        ...extractObjectKeys(coreSrc, 'executionModalSetters'),
    ]);
}
