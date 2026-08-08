#!/usr/bin/env node
/**
 * جرد المرحلة 0: ملفات .tsx غير متتبَّعة في lawyer/ + ظلال index.
 * Usage: node scripts/audit-lawyer-untracked-shadows.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAWYER = path.join(ROOT, 'src/app/components/lawyer');

function gitUntrackedUnder(relDir) {
    const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', relDir], {
        cwd: ROOT,
        encoding: 'utf8',
    });
    return r.stdout
        .split('\n')
        .filter((l) => l.startsWith('??'))
        .map((l) => l.slice(3).trim().replace(/\\/g, '/'));
}

function hasFolderIndex(dir) {
    return (
        fs.existsSync(path.join(dir, 'index.tsx')) ||
        fs.existsSync(path.join(dir, 'index.ts'))
    );
}

const untracked = gitUntrackedUnder('src/app/components/lawyer/');
const untrackedTsx = untracked.filter((p) => p.endsWith('.tsx') && !p.includes('/'));

const report = {
    untrackedTsxTopLevel: [],
    indexShadowRisk: [],
    folderOnlyUntracked: untracked.filter((p) => p.includes('/')).length,
    totalUntrackedUnderLawyer: untracked.length,
};

for (const rel of untrackedTsx) {
    const base = rel.replace(/^src\/app\/components\/lawyer\//, '').replace(/\.tsx$/, '');
    const dir = path.join(LAWYER, base);
    const entry = {
        file: rel,
        hasSiblingFolder: fs.existsSync(dir) && fs.statSync(dir).isDirectory(),
        folderHasIndex: fs.existsSync(dir) && hasFolderIndex(dir),
        lines: fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').length,
    };
    report.untrackedTsxTopLevel.push(entry);
    if (entry.folderHasIndex) report.indexShadowRisk.push(rel);
}

const outPath = path.join(ROOT, '.audit/phase0-lawyer-untracked-shadows.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`Untracked under lawyer/: ${report.totalUntrackedUnderLawyer}`);
console.log(`Top-level untracked .tsx: ${report.untrackedTsxTopLevel.length}`);
console.log(`INDEX SHADOW RISK (untracked .tsx + folder/index): ${report.indexShadowRisk.length}`);
for (const f of report.indexShadowRisk) console.log(`  ! ${f}`);
console.log(`Report: ${outPath}`);
