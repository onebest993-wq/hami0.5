#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const TARGET = '@/app/components/ui/lucideIcons';
let files = 0;

function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (['node_modules', 'dist', '.git'].includes(ent.name)) continue;
            walk(p);
            continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(ent.name)) continue;
        if (p.endsWith(`${path.sep}lucideIcons.ts`)) continue;
        let text = fs.readFileSync(p, 'utf8');
        if (!/\bfrom\s*['"]lucide-react['"]/.test(text)) continue;
        const next = text
            .replace(/\bfrom\s*['"]lucide-react['"]/g, `from '${TARGET}'`)
            .replace(/\bfrom\s*"lucide-react"/g, `from '${TARGET}'`);
        if (next !== text) {
            fs.writeFileSync(p, next, 'utf8');
            files += 1;
        }
    }
}

walk(SRC);
console.log(`[migrate-lucide-imports] updated ${files} files`);
