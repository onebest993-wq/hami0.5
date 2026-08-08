#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const icons = new Set();

const TYPE_ONLY_NAMES = new Set(['LucideIcon', 'LucideProps']);

function collectFromImportClause(clause) {
    for (const part of clause.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const typePrefix = trimmed.startsWith('type ') ? trimmed.slice(5).trim() : trimmed;
        const name = typePrefix.split(/\s+as\s+/)[0].trim();
        if (name && /^[A-Z]/.test(name) && !TYPE_ONLY_NAMES.has(name)) icons.add(name);
    }
}

function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (['node_modules', 'dist', '.git', '__tests__'].includes(ent.name)) continue;
            walk(p);
            continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(ent.name)) continue;
        const text = fs.readFileSync(p, 'utf8');
        for (const m of text.matchAll(
            /import\s+(?:type\s+)?\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g,
        )) {
            collectFromImportClause(m[1]);
        }
        for (const m of text.matchAll(/import\s+type\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g)) {
            collectFromImportClause(m[1]);
        }
        for (const m of text.matchAll(/import\s+(\w+)\s*from\s*['"]lucide-react['"]/g)) {
            if (m[1] !== 'default') icons.add(m[1]);
        }
    }
}

walk(SRC);
const sorted = [...icons].sort();
console.log(`[scan-lucide-icons] ${sorted.length} unique icons`);
if (process.argv.includes('--write')) {
    const out = path.join(SRC, 'app/components/ui/lucideIcons.ts');
    const body = sorted.map((n) => `    ${n},`).join('\n');
    fs.writeFileSync(
        out,
        `/** مُولَّد — لا تعدّل يدوياً. شغّل: node scripts/scan-lucide-icons.mjs --write */\nexport {\n${body}\n} from 'lucide-react';\nexport type { LucideIcon, LucideProps } from 'lucide-react';\n`,
        'utf8',
    );
    console.log(`[scan-lucide-icons] wrote ${out}`);
} else {
    console.log(sorted.join('\n'));
}
