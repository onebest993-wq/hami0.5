/**
 * Extracts string keys from `export const NAME = [...] as const`,
 * following `...IDENT` spreads via relative imports in the same file.
 */
import fs from 'node:fs';
import path from 'node:path';

function quotedKeys(body) {
    return [...body.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

function resolveImportPath(fromFile, spec) {
    const dir = path.dirname(fromFile);
    const raw = path.join(dir, spec);
    if (fs.existsSync(raw)) return raw;
    if (fs.existsSync(`${raw}.ts`)) return `${raw}.ts`;
    if (fs.existsSync(`${raw}.tsx`)) return `${raw}.tsx`;
    return null;
}

export function extractConstArrayKeys(content, constName, fromFile) {
    const m = content.match(new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`));
    if (!m) return [];
    const body = m[1];
    const keys = quotedKeys(body);
    const spreads = [...body.matchAll(/\.\.\.([A-Z_][A-Z0-9_]*)/g)].map((x) => x[1]);
    if (!spreads.length || !fromFile) return keys;

    const extra = [];
    for (const ident of spreads) {
        const importRe = new RegExp(
            `import \\{[^}]*\\b${ident}\\b[^}]*\\} from ['"](\\.[^'"]+)['"]`,
        );
        const im = content.match(importRe);
        if (!im) continue;
        const abs = resolveImportPath(fromFile, im[1]);
        if (!abs) continue;
        extra.push(...extractConstArrayKeys(fs.readFileSync(abs, 'utf8'), ident, abs));
    }
    return [...keys, ...extra];
}

export function extractConstArrayKeysFromFile(filePath, constName) {
    if (!fs.existsSync(filePath)) return [];
    return extractConstArrayKeys(fs.readFileSync(filePath, 'utf8'), constName, filePath);
}
