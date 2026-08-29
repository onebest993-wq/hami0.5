#!/usr/bin/env node
/**
 * يحوّل استيرادات lucideIcons / lucide-react (قيم) إلى ملف أيقونة واحد.
 * الأنواع LucideIcon / LucideProps تبقى عبر lucideIcons.ts (أنواع فقط).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const TYPE_ONLY = new Set(['LucideIcon', 'LucideProps']);
const SPECS = [
    '@/app/components/ui/lucideIcons',
    'lucide-react',
];

function splitImportNames(clause) {
    const values = [];
    const types = [];
    for (const part of clause.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const isType = trimmed.startsWith('type ');
        const raw = isType ? trimmed.slice(5).trim() : trimmed;
        const [exported, alias] = raw.split(/\s+as\s+/).map((s) => s.trim());
        if (!exported) continue;
        if (isType || TYPE_ONLY.has(exported)) {
            types.push(alias && alias !== exported ? `${exported} as ${alias}` : exported);
        } else {
            values.push({ exported, alias: alias && alias !== exported ? alias : null });
        }
    }
    return { values, types };
}

function buildReplacement(values, types) {
    const lines = [];
    for (const { exported, alias } of values) {
        const binding = alias ? `{ ${exported} as ${alias} }` : `{ ${exported} }`;
        lines.push(`import ${binding} from '@/app/components/ui/icons/${exported}';`);
    }
    if (types.length) {
        lines.push(`import type { ${types.join(', ')} } from '@/app/components/ui/lucideIcons';`);
    }
    return lines.join('\n');
}

function migrateText(text) {
    let next = text;
    for (const spec of SPECS) {
        const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(
            String.raw`import\s+(type\s+)?\{([^}]+)\}\s*from\s*['"]${escaped}['"];?`,
            'g',
        );
        next = next.replace(re, (full, typeKw, clause) => {
            if (typeKw) {
                return `import type {${clause}} from '@/app/components/ui/lucideIcons';`;
            }
            const { values, types } = splitImportNames(clause);
            if (!values.length && types.length) {
                return `import type { ${types.join(', ')} } from '@/app/components/ui/lucideIcons';`;
            }
            if (!values.length) return full;
            return buildReplacement(values, types);
        });
    }
    return next;
}

function walk(dir, acc) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (['node_modules', 'dist', '.git', 'icons'].includes(ent.name)) continue;
            walk(p, acc);
            continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(ent.name)) continue;
        if (p.endsWith(`${path.sep}lucideIcons.ts`)) continue;
        acc.push(p);
    }
}

const files = [];
walk(SRC, files);
let updated = 0;
for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes("from '@/app/components/ui/lucideIcons'") && !text.includes('from "lucide-react"') && !text.includes("from 'lucide-react'")) {
        continue;
    }
    const next = migrateText(text);
    if (next !== text) {
        fs.writeFileSync(file, next, 'utf8');
        updated += 1;
    }
}
console.log(`[migrate-lucide-imports] updated ${updated} files`);
