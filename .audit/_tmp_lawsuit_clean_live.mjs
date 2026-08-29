import fs from 'fs';
import path from 'path';

const roots = [
  'src/app/domain/lawsuit',
  'src/app/components/lawyer/dashboard',
  'src/app/components/lawyer/ArchivePortal',
  'src/app/components/lawyer/LawyerNewCase',
  'src/app/components/lawyer/LawyerNewCase.tsx',
  'src/app/components/lawyer/smart-modal',
  'src/app/hooks',
  'src/app/runtime',
  'src/app/services',
  'src/app/utils',
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const st = fs.statSync(dir);
  if (st.isFile()) {
    out.push(dir);
    return out;
  }
  for (const e of fs.readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist') continue;
    walk(path.join(dir, e), out);
  }
  return out;
}

function includeFile(p) {
  p = p.replace(/\\/g, '/');
  if (!/\.(ts|tsx)$/.test(p)) return false;
  if (p.includes('__tests__') || /\.test\.(ts|tsx)$/.test(p)) return false;
  const base = path.basename(p);
  if (p.includes('/dashboard/') && !/Lawsuit/i.test(base)) return false;
  if (p.startsWith('src/app/hooks/') && !/lawsuit/i.test(base)) return false;
  if (p.startsWith('src/app/runtime/') && !/lawsuit/i.test(base)) return false;
  if (p.startsWith('src/app/utils/') && !/lawsuit/i.test(base)) return false;
  if (p.startsWith('src/app/services/')) {
    if (/lawsuit/i.test(base)) return true;
    if (p.includes('calendar/dossierSync/lawsuit')) return true;
    if (p.includes('search/globalSearchIndexLawsuit')) return true;
    return false;
  }
  return true;
}

const scoped = [];
for (const r of roots) walk(r, scoped);
const scopedNorm = scoped.map((f) => f.replace(/\\/g, '/')).filter(includeFile);

const allSrc = walk('src')
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => f.replace(/\\/g, '/'));
const contents = new Map();
for (const f of allSrc) {
  try {
    contents.set(f, fs.readFileSync(f, 'utf8'));
  } catch {
    /* ignore */
  }
}

const exportRe = /^export\s+(?:async\s+)?(?:function|const|class|let|var)\s+([A-Za-z0-9_]+)/gm;
const exportNamedRe = /^export\s*\{([^}]+)\}/gm;

function countUsages(name, defFile) {
  let count = 0;
  const filesHit = [];
  const re = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`);
  for (const [f, text] of contents) {
    if (f === defFile) continue;
    if (re.test(text)) {
      count++;
      if (filesHit.length < 8) filesHit.push(f);
    }
  }
  return { count, filesHit };
}

const dead = [];
for (const f of scopedNorm) {
  const text = contents.get(f);
  if (!text) continue;
  const names = new Set();
  let m;
  exportRe.lastIndex = 0;
  while ((m = exportRe.exec(text))) names.add(m[1]);
  exportNamedRe.lastIndex = 0;
  while ((m = exportNamedRe.exec(text))) {
    m[1].split(',').forEach((part) => {
      const p = part.trim();
      if (!p || p.startsWith('type ')) return;
      const as = p.split(/\s+as\s+/);
      const exported = (as[1] || as[0]).trim();
      if (exported && !exported.startsWith('type')) names.add(exported);
    });
  }
  for (const name of names) {
    const { count, filesHit } = countUsages(name, f);
    if (count === 0) dead.push({ file: f, name });
  }
}

dead.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));
console.log('LIVE dead value exports:', dead.length);
const by = {};
for (const d of dead) (by[d.file] ||= []).push(d.name);
const ranked = Object.entries(by).sort((a, b) => b[1].length - a[1].length);
for (const [f, names] of ranked) {
  console.log(names.length, f);
  console.log('  ', names.join(', '));
}

// Also: files never imported (basename import string)
console.log('\n=== CANDIDATE DEAD FILES (no path import hit) ===');
const deadFiles = [];
for (const f of scopedNorm) {
  const base = path.basename(f).replace(/\.(tsx?)$/, '');
  const relNoExt = f.replace(/^src\//, '').replace(/\.(tsx?)$/, '');
  let hit = false;
  for (const [other, text] of contents) {
    if (other === f) continue;
    if (
      text.includes(base) &&
      (text.includes(`/${base}'`) ||
        text.includes(`/${base}"`) ||
        text.includes(`/${base}`) ||
        text.includes(`'${base}'`) ||
        text.includes(`"${base}"`) ||
        text.includes(relNoExt))
    ) {
      hit = true;
      break;
    }
  }
  if (!hit) deadFiles.push(f);
}
deadFiles.forEach((f) => console.log(f));
console.log('dead file candidates', deadFiles.length);
