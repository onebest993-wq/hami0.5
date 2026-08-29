#!/usr/bin/env node
/**
 * يحوّل استيراد motion/react إلى نقطة الدخول الوحيدة overlayMotionRuntime.
 * لا يلمس overlayMotionRuntime نفسه ولا اختبارات الصدق.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const skipName = new Set([
    'overlayMotionRuntime.ts',
    'overlayMotionIsolationHonesty.test.ts',
]);

function walk(dir, acc = []) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === 'dist') continue;
            walk(full, acc);
            continue;
        }
        if (!/\.(ts|tsx)$/.test(ent.name)) continue;
        if (skipName.has(ent.name)) continue;
        if (ent.name.includes('.test.') || ent.name.endsWith('.spec.ts') || ent.name.endsWith('.spec.tsx')) continue;
        if (dir.replace(/\\/g, '/').includes('/__tests__/')) continue;
        acc.push(full);
    }
    return acc;
}

const files = walk(srcRoot);
let changed = 0;
for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('motion/react')) continue;
    const next = text.replace(/from (['"])motion\/react\1/g, "from '@/app/motion/overlayMotionRuntime'");
    if (next === text) continue;
    fs.writeFileSync(file, next);
    changed += 1;
    console.log(path.relative(root, file));
}
console.log(`[migrate-motion] ${changed} files`);
