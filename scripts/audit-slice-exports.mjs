import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const root = 'src/app/components/lawyer/ExecutionDashboard';
const sliceDirs = [root + '/utils', root + '/helpers'];
const sliceFiles = [];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else sliceFiles.push(p.replace(/\\/g, '/'));
  }
}
sliceDirs.forEach(walk);
for (const f of fs.readdirSync(root)) {
  const p = path.join(root, f).replace(/\\/g, '/');
  if (fs.statSync(p).isFile()) sliceFiles.push(p);
}
sliceFiles.sort();

const prodFiles = [];
function walkProd(d, skip) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
      walkProd(p, skip);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) {
      const rel = p.replace(/\\/g, '/');
      if (skip.some((s) => rel.includes(s))) continue;
      prodFiles.push(rel);
    }
  }
}
walkProd('src', ['__tests__', '/tests/', '.test.', '.spec.']);

const prodContent = new Map();
for (const f of prodFiles) {
  prodContent.set(f, fs.readFileSync(f, 'utf8'));
}

function extractExports(filePath, content) {
  const exports = [];
  // re-export all
  if (/export\s+\*\s+from\s+['"]/.test(content)) {
    exports.push({ name: '*', kind: 'reexport-all', line: content.split('\n').findIndex((l) => /export\s+\*\s+from/.test(l)) + 1 });
  }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // export function/class/const/type/interface/enum
    let m = line.match(/^export\s+(?:async\s+)?(?:function|class|const|let|var|enum|interface|type)\s+(\w+)/);
    if (m) {
      exports.push({ name: m[1], kind: 'named', line: i + 1 });
      continue;
    }
    m = line.match(/^export\s+\{\s*([^}]+)\s*\}/);
    if (m) {
      const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
      for (const n of names) exports.push({ name: n, line: i + 1, kind: 'named' });
      continue;
    }
    m = line.match(/^export\s+default\s+(?:function\s+)?(\w+)?/);
    if (m) exports.push({ name: m[1] || 'default', line: i + 1, kind: 'default' });
  }
  return exports;
}

function isUsed(exportName, fromFile, content) {
  if (exportName === '*') return true; // re-export barrel - skip
  const patterns = [
    new RegExp(`\\b${exportName}\\b`),
  ];
  for (const [file, c] of prodContent) {
    if (file === fromFile) continue;
    for (const p of patterns) {
      if (p.test(c)) {
        // rough import check - symbol appears
        return { file, via: 'symbol-ref' };
      }
    }
  }
  return null;
}

const dead = [];
const allExports = [];
const ledger = [];

for (const f of sliceFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n').length;
  const exps = extractExports(f, content);
  ledger.push({ f, lines, exportCount: exps.length });
  for (const exp of exps) {
    if (exp.name === '*') continue;
    allExports.push({ ...exp, file: f });
    const use = isUsed(exp.name, f, content);
    if (!use) dead.push({ ...exp, file: f });
  }
}

console.log('SLICE_FILES', sliceFiles.length);
console.log('SLICE_LINES', ledger.reduce((s, x) => s + x.lines, 0));
console.log('TOTAL_EXPORTS', allExports.length);
console.log('DEAD_EXPORTS', dead.length);
console.log('\n---DEAD---');
for (const d of dead.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(`${d.file}:${d.line}\t${d.name}`);
}
