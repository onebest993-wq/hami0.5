import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const RESERVED = new Set([
    'if', 'else', 'return', 'const', 'let', 'var', 'new', 'try', 'catch', 'function', 'typeof',
    'void', 'null', 'undefined', 'true', 'false', 'case', 'switch', 'default', 'break', 'import',
    'export', 'for', 'while', 'do', 'await', 'async', 'throw', 'delete', 'instanceof', 'in', 'of',
]);

export const SCOPE_DENYLIST = new Set([
    'key', 'idx', 'val', 'row', 'ok', 'now', 'raw', 'base', 'kind', 'subj', 'sole', 'exId', 'prev',
    'cur', 'num', 'year', 'st', 'tmp', 'ref', 'err', 'msg', 'tab', 'ctx', 'ev', 'fn', 'id', 'type',
    'name', 'data', 'item', 'node', 'props', 'state', 'event', 'value', 'index', 'label', 'open',
    'show', 'set', 'get', 'use', 'from', 'size', 'icon', 'text', 'date', 'time', 'code', 'mode',
]);

export const EXTRA_HOOK_BINDINGS = [
    'parentHeaderFields',
    'parentClassificationDisplay',
    'parentClaimTypeArabicDisplay',
    'parentShowJudgmentMeta',
    'parentJudgmentDateDisplay',
];

export function isValidScopeKey(key) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return false;
    if (RESERVED.has(key)) return false;
    if (SCOPE_DENYLIST.has(key)) return false;
    if (key.length <= 2 && key === key.toLowerCase()) return false;
    return true;
}

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addImportBindings(viewText, bindings) {
    for (const m of viewText.matchAll(/^import\s+(?!type\b)(?:type\s+)?\{([^}]+)\}\s+from/gm)) {
        if (/^import\s+type\s+\{/.test(m[0])) continue;
        for (const part of m[1].split(',')) {
            const token = part.trim();
            if (!token || token.startsWith('type ')) continue;
            const asMatch = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (asMatch) {
                bindings.add(asMatch[2]);
                continue;
            }
            const name = token.split(/\s+/)[0]?.trim();
            if (name && /^[a-zA-Z_]/.test(name) && name !== 'type') bindings.add(name);
        }
    }
    for (const m of viewText.matchAll(/^import\s+(?!type\b)([A-Za-z_][A-Za-z0-9_]*)\s+from/gm)) {
        bindings.add(m[1]);
    }
}

function stripComments(text) {
    let out = '';
    let i = 0;
    while (i < text.length) {
        if (text[i] === "'" || text[i] === '"' || text[i] === '`') {
            const q = text[i];
            out += q;
            i++;
            while (i < text.length && text[i] !== q) {
                if (text[i] === '\\') {
                    out += text[i++];
                }
                out += text[i++];
            }
            if (i < text.length) {
                out += text[i++];
            }
            continue;
        }
        if (text[i] === '/' && text[i + 1] === '/') {
            while (i < text.length && text[i] !== '\n') i++;
            continue;
        }
        if (text[i] === '/' && text[i + 1] === '*') {
            i += 2;
            while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
            i += 2;
            continue;
        }
        out += text[i++];
    }
    return out;
}

function addDestructuredNames(fragment, bindings) {
    const inner = stripComments(fragment.trim());
    if (!inner) return;
    if (inner.startsWith('{') && inner.endsWith('}')) {
        for (const part of inner.slice(1, -1).split(',')) {
            const token = part.trim();
            if (!token || token.startsWith('...')) continue;
            const rename = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (rename) {
                bindings.add(rename[2]);
                continue;
            }
            const name = token.split(/\s|:|\{/)[0]?.trim();
            if (name && /^[a-zA-Z_]/.test(name)) bindings.add(name);
        }
        return;
    }
    if (inner.startsWith('[') && inner.endsWith(']')) {
        for (const part of inner.slice(1, -1).split(',')) {
            const name = part.trim().split(/\s+/)[0]?.trim();
            if (name && /^[a-zA-Z_]/.test(name)) bindings.add(name);
        }
        return;
    }
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(inner)) bindings.add(inner);
}

function skipQuoted(viewText, i, endIdx) {
    const ch = viewText[i];
    if (ch === '`') {
        i++;
        while (i < endIdx && viewText[i] !== '`') {
            if (viewText[i] === '\\') i++;
            i++;
        }
        return i + 1;
    }
    if (ch === "'" || ch === '"') {
        const quote = ch;
        i++;
        while (i < endIdx && viewText[i] !== quote) {
            if (viewText[i] === '\\') i++;
            i++;
        }
        return i + 1;
    }
    return i;
}

function skipLineComment(viewText, i, endIdx) {
    while (i < endIdx && viewText[i] !== '\n') i++;
    return i;
}

function skipBlockComment(viewText, i, endIdx) {
    i += 2;
    while (i < endIdx && !(viewText[i] === '*' && viewText[i + 1] === '/')) i++;
    return i + 2;
}

function skipBalancedGroup(viewText, i, endIdx) {
    const open = viewText[i];
    const close = open === '{' ? '}' : open === '[' ? ']' : open === '(' ? ')' : null;
    if (!close) return i + 1;

    let depth = 0;
    while (i < endIdx) {
        const ch = viewText[i];
        if (ch === '`' || ch === "'" || ch === '"') {
            i = skipQuoted(viewText, i, endIdx);
            continue;
        }
        if (ch === '/' && viewText[i + 1] === '/') {
            i = skipLineComment(viewText, i, endIdx);
            continue;
        }
        if (ch === '/' && viewText[i + 1] === '*') {
            i = skipBlockComment(viewText, i, endIdx);
            continue;
        }
        if (ch === open) depth++;
        if (ch === close) {
            depth--;
            if (depth === 0) return i + 1;
        }
        i++;
    }
    return endIdx;
}

function findBalancedEnd(text, start) {
    const open = text[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    for (let k = start; k < text.length; k++) {
        const ch = text[k];
        if (ch === open) depth++;
        if (ch === close) {
            depth--;
            if (depth === 0) return k;
        }
    }
    return text.length - 1;
}

function parseTopLevelDeclaration(viewText, i, endIdx, bindings) {
    const rest = viewText.slice(i, endIdx);
    const kwMatch = rest.match(/^(?:const|let|var)\s+/);
    if (!kwMatch) return null;

    let j = i + kwMatch[0].length;
    const afterKw = viewText.slice(j, endIdx);

    const simpleMatch = afterKw.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
    if (simpleMatch) {
        bindings.add(simpleMatch[1]);
        j += simpleMatch[0].length;
        return j;
    }

    if (afterKw[0] === '{' || afterKw[0] === '[') {
        const end = findBalancedEnd(afterKw, 0);
        addDestructuredNames(afterKw.slice(0, end + 1), bindings);
        j = skipBalancedGroup(viewText, j, endIdx);
        return j;
    }

    return null;
}

export function findScopeBindingScanEnd(viewText) {
    for (const marker of ['getScopeSources:', 'useExecutionDashboardCoreScopeAndChunk({']) {
        const idx = viewText.indexOf(marker);
        if (idx >= 0) return idx;
    }
    const coreReturn = viewText.match(/\n\s*return\s*\{\s*\n\s*isLoading:\s*boot\.isLoading,/);
    if (coreReturn?.index != null) return coreReturn.index;
    return viewText.length;
}

export function collectScopeBundleKeyDeclarations(bundleGroupsText) {
    const keys = new Set();
    for (const m of bundleGroupsText.matchAll(/'([a-z][a-zA-Z0-9_]*)',/g)) {
        keys.add(m[1]);
    }
    return keys;
}

export function collectHandlerClusterAssemblyKeyDeclarations(handlersText) {
    const keys = new Set();
    const block = handlersText.match(/HANDLER_CLUSTER_ASSEMBLY_HANDLER_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
    if (block) {
        for (const m of block[1].matchAll(/'([a-zA-Z_][a-zA-Z0-9_]*)'/g)) {
            keys.add(m[1]);
        }
    }
    for (const m of handlersText.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*handlerCluster\./gm)) {
        keys.add(m[1]);
    }
    return keys;
}

export function loadExecutionCoreScopeContext(root = REPO_ROOT) {
    const base = path.join(root, 'src/app/components/lawyer/ExecutionDashboard/hooks');
    return {
        corePath: path.join(base, 'useExecutionDashboardCore.ts'),
        core: fs.readFileSync(path.join(base, 'useExecutionDashboardCore.ts'), 'utf8'),
        scopeChunk: fs.readFileSync(
            path.join(base, 'executionDashboardCore/useExecutionDashboardCoreScopeAndChunk.ts'),
            'utf8',
        ),
        bundles: fs.readFileSync(
            path.join(base, 'executionDashboardCore/buildScopeBundleGroups.ts'),
            'utf8',
        ),
        handlers: fs.readFileSync(
            path.join(base, 'executionDashboardCore/pickHandlerClusterAssemblyHandlers.ts'),
            'utf8',
        ),
    };
}

export function collectExecutionCoreScopeBindings(ctx = loadExecutionCoreScopeContext()) {
    const bindings = collectExecutionViewScopeBindings(ctx.core);
    for (const k of collectScopeBundleKeyDeclarations(ctx.bundles)) bindings.add(k);
    for (const k of collectHandlerClusterAssemblyKeyDeclarations(ctx.handlers)) bindings.add(k);
    for (const k of EXTRA_HOOK_BINDINGS) bindings.add(k);
    return bindings;
}

/** View shell + refactored core scope (Phase C) */
export function resolveExecutionScopeBindings(viewText) {
    if (viewText.includes('getScopeSources:')) {
        return collectExecutionViewScopeBindings(viewText);
    }
    const bindings = new Set();
    try {
        for (const k of collectExecutionViewScopeBindings(viewText)) bindings.add(k);
    } catch {
        /* thin view shell — no hook body to scan */
    }
    for (const k of collectExecutionCoreScopeBindings()) bindings.add(k);
    return bindings;
}

export function collectExecutionViewScopeBindings(viewText) {
    const endIdx = findScopeBindingScanEnd(viewText);

    const startMatch =
        viewText.match(/export function useExecutionDashboardCore\(\{([^}]+)\}[^)]*\)\s*\{/) ||
        viewText.match(/export const ExecutionDashboardView = React\.memo\(\(\{([^}]+)\}\)\s*=>\s*\{/) ||
        viewText.match(
            /export const ExecutionDashboardView = React\.memo\(function ExecutionDashboardView\(\{([^}]+)\}/,
        );
    if (!startMatch) throw new Error('Execution dashboard hook entry not found');

    const bindings = new Set();
    for (const part of startMatch[1].split(',')) {
        const name = part.trim().split(':')[0].trim();
        if (name) bindings.add(name);
    }
    addImportBindings(viewText, bindings);

    let i = startMatch.index + startMatch[0].length;
    let depth = 1;

    while (i < endIdx) {
        const ch = viewText[i];
        if (ch === '`' || ch === "'" || ch === '"') {
            i = skipQuoted(viewText, i, endIdx);
            continue;
        }
        if (ch === '/' && viewText[i + 1] === '/') {
            i = skipLineComment(viewText, i, endIdx);
            continue;
        }
        if (ch === '/' && viewText[i + 1] === '*') {
            i = skipBlockComment(viewText, i, endIdx);
            continue;
        }
        if (ch === '{' || ch === '(') {
            depth++;
            i++;
            continue;
        }
        if (ch === '}' || ch === ')') {
            depth = Math.max(1, depth - 1);
            i++;
            continue;
        }

        if (depth === 1) {
            const fnMatch = viewText.slice(i, endIdx).match(/^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
            if (fnMatch) {
                bindings.add(fnMatch[1]);
                i += fnMatch[0].length;
                continue;
            }

            const nextI = parseTopLevelDeclaration(viewText, i, endIdx, bindings);
            if (nextI != null) {
                i = nextI;
                continue;
            }
        }

        i++;
    }

    for (const k of EXTRA_HOOK_BINDINGS) bindings.add(k);
    return bindings;
}

export function extractComponentProps(viewText) {
    const props = new Set();
    const m = viewText.match(
        /export const ExecutionDashboardView = React\.memo\(\(\{([^}]+)\}\)\s*=>\s*\{/,
    );
    if (!m) return props;
    for (const part of m[1].split(',')) {
        const token = part.trim();
        if (!token) continue;
        const alias = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
        if (alias) {
            props.add(alias[1]);
            continue;
        }
        const name = token.split(/\s*[=:]/)[0]?.trim();
        if (name && /^[a-zA-Z_]/.test(name)) props.add(name);
    }
    return props;
}

export function stripPhoneBodyScanNoise(text) {
    return text
        .replace(/^\s*import\s+type\s+.+$/gm, '')
        .replace(/\b[a-zA-Z_][a-zA-Z0-9_]*="[^"]*"/g, '')
        .replace(/\b[a-zA-Z_][a-zA-Z0-9_]*='[^']*'/g, '');
}

export function readPhoneBodyRawAfter(body) {
    for (const marker of ['} = props as Record<string, any>', '} = props;']) {
        const idx = body.indexOf(marker);
        if (idx >= 0) return body.slice(idx + marker.length);
    }
    return '';
}

export function readPhoneBodyImports(body) {
    const phoneBodyImports = new Set();
    for (const m of body.matchAll(/^import\s+(?!type\b)\{([^}]+)\}\s+from/gm)) {
        for (const part of m[1].split(',')) {
            const token = part.trim();
            if (!token || token.startsWith('type ')) continue;
            const name = token.trim().split(/\s+as\s+/)[0]?.trim().split(/\s+/)[0]?.trim();
            if (name) phoneBodyImports.add(name);
        }
    }
    return phoneBodyImports;
}

/** كل binding في الـ hook يظهر في PhoneBody → مطلوب في scope */
export function collectPhoneBodyRequiredKeys(body, viewText) {
    const rawAfter = readPhoneBodyRawAfter(body);
    const clean = stripPhoneBodyScanNoise(rawAfter);
    const viewBindings = resolveExecutionScopeBindings(viewText);
    const componentProps = extractComponentProps(viewText);
    const phoneBodyImports = readPhoneBodyImports(body);

    const jsxLocals = new Set([
        ...phoneBodyImports,
        'map', 'filter', 'slice', 'join', 'min', 'max', 'trim', 'any', 'catch', 'isArray',
        'st', 'cur', 'num', 'year', 'f', 't', 's', 'c', 'row', 'next', 'child', 'bundle',
        'payload', 'patch', 'existing', 'rolled', 'current', 'dossier', 'store', 'sessions',
        'null', 'undefined', 'true', 'false', 'div', 'span', 'button', 'Suspense', 'React',
        'Fragment', 'String', 'Number', 'Boolean', 'Object', 'Array', 'Date', 'Math', 'JSON',
        ...SCOPE_DENYLIST,
    ]);

    const required = new Set();

    for (const binding of viewBindings) {
        if (jsxLocals.has(binding)) continue;
        if (!isValidScopeKey(binding) && !isPassthroughScopeKey(binding)) continue;
        const re = new RegExp(`(?<![a-zA-Z0-9_.])${escapeRegExp(binding)}(?![a-zA-Z0-9_])`);
        if (re.test(rawAfter) || re.test(clean)) required.add(binding);
    }

    for (const prop of componentProps) {
        const re = new RegExp(`(?<![a-zA-Z0-9_.])${escapeRegExp(prop)}(?![a-zA-Z0-9_])`);
        if (re.test(rawAfter)) required.add(prop);
    }

    return { required, viewBindings, componentProps, rawAfter };
}

export function isPassthroughScopeKey(key) {
    return (
        /^[A-Z][A-Za-z0-9_]*$/.test(key) ||
        /^Lazy[A-Z]/.test(key) ||
        /^EXEC_/.test(key) ||
        /^AR_[A-Z_]+$/.test(key) ||
        /^EVICTION_/.test(key) ||
        /^HAMI_/.test(key) ||
        /^SPECIAL_/.test(key)
    );
}

export function buildPhoneBodyScopeKeys(body, viewText) {
    const { required, viewBindings, componentProps } = collectPhoneBodyRequiredKeys(body, viewText);

    const passthrough = [...viewBindings].filter((k) => isPassthroughScopeKey(k));
    const merged = [...new Set([...passthrough, ...required, ...componentProps])]
        .filter((k) => componentProps.has(k) || isPassthroughScopeKey(k) || (isValidScopeKey(k) && viewBindings.has(k)))
        .sort();

    return merged;
}

export function extractPhoneBodyDestructuredKeys(body) {
    const destructureMatch = body.match(/const \{([\s\S]*?)\} = props;/);
    const keys = new Set();
    if (!destructureMatch) return keys;
    const inner = stripComments(destructureMatch[1].trim());
    for (const part of inner.split(',')) {
        const token = part.trim();
        if (!token || token.startsWith('...')) continue;
        const rename = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (rename) {
            keys.add(rename[1]);
            continue;
        }
        const name = token.split(/\s|:|\{/)[0]?.trim();
        if (name && /^[a-zA-Z_]/.test(name)) keys.add(name);
    }
    return keys;
}

export function validateScopeKeys(_viewText, keys) {
    const problems = [];
    for (const key of keys) {
        if (isPassthroughScopeKey(key)) continue;
        if (!isValidScopeKey(key)) {
            problems.push(`denylist/invalid key: ${key}`);
        }
    }
    return problems;
}

// backwards compat for older scripts
export function readPhoneBodyUsedIds(body) {
    const rawAfter = readPhoneBodyRawAfter(body);
    const phoneBodyImports = readPhoneBodyImports(body);
    const used = new Set();
    for (const m of stripPhoneBodyScanNoise(rawAfter).matchAll(/\b([a-z][a-zA-Z0-9_]{2,})\s*\./g)) {
        used.add(m[1]);
    }
    for (const m of rawAfter.matchAll(/=\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)) used.add(m[1]);
    for (const m of stripPhoneBodyScanNoise(rawAfter).matchAll(/\b([a-z][a-zA-Z0-9_]{2,})\(/g)) {
        used.add(m[1]);
    }
    const jsxLocals = new Set([...phoneBodyImports, ...SCOPE_DENYLIST]);
    return { after: rawAfter, used, jsxLocals, phoneBodyImports };
}

export function extractPhoneBodyJsxPropRefs(body) {
    const rawAfter = readPhoneBodyRawAfter(body);
    const refs = new Set();
    for (const m of rawAfter.matchAll(/=\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)) refs.add(m[1]);
    for (const m of rawAfter.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\s*\?\?/g)) refs.add(m[1]);
    return refs;
}
