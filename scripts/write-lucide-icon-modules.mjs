#!/usr/bin/env node
/**
 * يولّد ملفاً لكل أيقونة مستعملة — بلا برميل قيم.
 * التشغيل: node scripts/write-lucide-icon-modules.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const ICONS_DIR = path.join(SRC, 'app/components/ui/icons');
const BARREL = path.join(ROOT, 'node_modules/lucide-react/dist/esm/lucide-react.js');
const TYPE_ONLY = new Set(['LucideIcon', 'LucideProps']);

function parseLucideExportMap() {
    const src = fs.readFileSync(BARREL, 'utf8');
    const map = new Map();
    for (const m of src.matchAll(/export \{([^}]+)\} from '\.\/icons\/([^']+)'/g)) {
        const file = m[2].replace(/\.js$/, '');
        for (const part of m[1].split(',')) {
            const nameM = part.trim().match(/^default as (\w+)$/);
            if (nameM) map.set(nameM[1], file);
        }
    }
    if (map.size < 100) {
        throw new Error(`[write-lucide-icon-modules] lucide export map too small: ${map.size}`);
    }
    return map;
}

function collectUsedIconNames() {
    const names = new Set();
    function walk(dir) {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                if (['node_modules', 'dist', '.git', 'icons'].includes(ent.name)) continue;
                walk(p);
                continue;
            }
            if (!/\.(tsx?|jsx?)$/.test(ent.name)) continue;
            if (p.endsWith(`${path.sep}lucideIcons.ts`)) continue;
            const text = fs.readFileSync(p, 'utf8');
            for (const m of text.matchAll(
                /from\s*['"]@\/app\/components\/ui\/icons\/([A-Z][A-Za-z0-9]*)['"]/g,
            )) {
                names.add(m[1]);
            }
            for (const spec of ["'@/app/components/ui/lucideIcons'", '"@/app/components/ui/lucideIcons"', "'lucide-react'", '"lucide-react"']) {
                const re = new RegExp(
                    String.raw`import\s+(?:type\s+)?\{([^}]+)\}\s*from\s*${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
                    'g',
                );
                for (const m of text.matchAll(re)) {
                    for (const part of m[1].split(',')) {
                        const trimmed = part.trim();
                        if (!trimmed || trimmed.startsWith('type ')) continue;
                        const name = trimmed.split(/\s+as\s+/)[0].trim();
                        if (name && /^[A-Z]/.test(name) && !TYPE_ONLY.has(name)) names.add(name);
                    }
                }
            }
        }
    }
    walk(SRC);
    return [...names].sort();
}

function writeIconModules(names, exportMap) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
    const existing = fs.existsSync(ICONS_DIR)
        ? fs.readdirSync(ICONS_DIR).filter((f) => /^[A-Z][A-Za-z0-9]*\.ts$/.test(f))
        : [];
    for (const file of existing) {
        fs.unlinkSync(path.join(ICONS_DIR, file));
    }

    const missing = [];
    for (const name of names) {
        const spec = exportMap.get(name);
        if (!spec) {
            missing.push(name);
            continue;
        }
        const out = path.join(ICONS_DIR, `${name}.ts`);
        fs.writeFileSync(
            out,
            `export { default as ${name} } from 'lucide-react/dist/esm/icons/${spec}.js';\n`,
            'utf8',
        );
    }
    if (missing.length) {
        throw new Error(`[write-lucide-icon-modules] unknown lucide exports: ${missing.join(', ')}`);
    }
}

const exportMap = parseLucideExportMap();
const names = collectUsedIconNames();
if (!names.length) throw new Error('[write-lucide-icon-modules] no icons found');
writeIconModules(names, exportMap);
console.log(`[write-lucide-icon-modules] wrote ${names.length} icon modules`);
