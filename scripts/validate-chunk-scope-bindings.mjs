/**
 * يتحقق من مفاتيح chunk scope التي تُمرَّر كـ shorthand دون binding في الـ hook
 * node scripts/validate-chunk-scope-bindings.mjs
 */
import fs from 'fs';

const hookPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const staticScopePath =
    'src/app/components/lawyer/ExecutionDashboard/executionDashboardStaticChunkScope.ts';
const lazyScopePaths = [
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScopeShell.ts',
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScopeOverlays.ts',
];
const src = fs.readFileSync(hookPath, 'utf8');
const staticSrc = fs.existsSync(staticScopePath) ? fs.readFileSync(staticScopePath, 'utf8') : '';
const lazySrc = lazyScopePaths
    .filter((p) => fs.existsSync(p))
    .map((p) => fs.readFileSync(p, 'utf8'))
    .join('\n');

const staticScopeKeys = new Set(
    [...staticSrc.matchAll(/^\s+([A-Za-z_][A-Za-z0-9_]*),/gm)].map((m) => m[1]),
);
for (const m of lazySrc.matchAll(/^\s+([A-Za-z_][A-Za-z0-9_]*),/gm)) {
    staticScopeKeys.add(m[1]);
}

const lucideImportMatch = src.match(/from 'lucide-react';/);
const lucideBlock = lucideImportMatch
    ? src.slice(src.lastIndexOf('import {', lucideImportMatch.index), lucideImportMatch.index + 20)
    : '';

const lazyImportMatch = src.match(/from '\.\.\/executionDashboardLazyShell';/);
const lazyBlock = lazyImportMatch
    ? src.slice(src.lastIndexOf('import {', lazyImportMatch.index), lazyImportMatch.index + 40)
    : '';

const hookStart = src.indexOf('export function useExecutionDashboardCore');
const scopeStart = src.indexOf('getScopeSources: () => ({', hookStart);
const scopeEnd = src.indexOf('\n        }),', scopeStart);
const scopeBlock = src.slice(scopeStart, scopeEnd);
const pre = src.slice(0, scopeStart);

const keys = [...scopeBlock.matchAll(/^\s+([A-Za-z_][A-Za-z0-9_]*),/gm)].map((m) => m[1]);

const bindingRe = (name) =>
    new RegExp(
        `(?:const|let|var|function)\\s+(?:\\[\\s*)?${name}\\b|` +
            `[,{]\\s*${name}\\b|` +
            `:\\s*${name}\\b|` +
            `\\b${name}\\s*[:=]`,
    );

const bad = keys.filter((k) => {
    if (staticScopeKeys.has(k)) return false;
    if (lucideBlock.includes(k) || lazyBlock.includes(k)) return false;
    if (bindingRe(k).test(pre)) return false;
    return true;
});

if (bad.length) {
    console.error('Unbound getScopeSources shorthand keys:', bad.join(', '));
    process.exit(1);
}

console.log(`OK — ${keys.length} scope keys validated`);
