import fs from 'fs';

const inv = JSON.parse(fs.readFileSync('.audit/execution-inventory.json', 'utf8'));
const key = Object.keys(inv).find((k) => Array.isArray(inv[k]) && inv[k][0]?.module?.startsWith('A'));
const arr = inv[key];
const mods = ['A4-dashboard-utils', 'A5-dashboard-helpers', 'A6-dashboard-root'];
const files = arr.filter((f) => mods.includes(f.module)).sort((a, b) => a.path.localeCompare(b.path));

const prodFiles = [];
function walk(d, skip) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`.replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
      walk(p, skip);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) {
      if (skip.some((s) => p.includes(s))) continue;
      prodFiles.push(p);
    }
  }
}
walk('src', ['__tests__', '/tests/', '.test.', '.spec.']);
const prodBlob = prodFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

function extractExports(content) {
  const ex = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/export\s+\*\s+from/.test(line)) {
      ex.push({ name: '*', line: i + 1 });
      continue;
    }
    let m = line.match(/^export\s+(?:async\s+)?(?:function|class|const|let|var|enum|interface|type)\s+(\w+)/);
    if (m) {
      ex.push({ name: m[1], line: i + 1 });
      continue;
    }
    m = line.match(/^export\s+\{\s*([^}]+)\s*\}/);
    if (m) {
      for (const part of m[1].split(',')) {
        const n = part.trim().split(/\s+as\s+/).pop().trim();
        if (n) ex.push({ name: n, line: i + 1 });
      }
    }
  }
  return ex;
}

function hasProdImport(symbol, fromPath) {
  const base = fromPath.replace(/^src\//, '@/').replace(/\.tsx?$/, '');
  const alt = fromPath.replace(/^src\app\//, '@/app/').replace(/\.tsx?$/, '');
  const relPatterns = [
    new RegExp(`from\\s+['"]${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`),
    new RegExp(`from\\s+['"]${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`),
    new RegExp(`from\\s+['"]\\.\\.?/[^'"]*${fromPath.split('/').pop().replace(/\.tsx?$/, '')}['"]`),
  ];
  for (const f of prodFiles) {
    const c = fs.readFileSync(f, 'utf8');
    if (f === fromPath) continue;
    for (const rp of relPatterns) {
      if (rp.test(c)) {
        const importRe = new RegExp(`\\b${symbol}\\b`);
        if (importRe.test(c)) return f;
        if (symbol.endsWith('ChunkScope') || symbol.startsWith('spreadExecution')) {
          if (c.includes(symbol)) return f;
        }
      }
    }
    if (new RegExp(`\\bimport\\b[\\s\\S]*?\\b${symbol}\\b`).test(c)) return f;
    if (new RegExp(`\\b${symbol}\\b`).test(c) && !fromPath.includes(symbol)) {
      // chunk scope keys referenced as properties
      if (c.includes(`...spread`) && c.includes('ChunkScope')) continue;
    }
  }
  if (new RegExp(`\\b${symbol}\\b`).test(prodBlob) && !prodBlob.includes(fromPath)) {
    const others = prodFiles.filter((f) => f !== fromPath && fs.readFileSync(f, 'utf8').includes(symbol));
    if (others.length) return others[0];
  }
  return null;
}

const dead = [];
let totalExports = 0;
for (const f of files) {
  if (f.isTest) continue;
  const content = fs.readFileSync(f.path, 'utf8');
  for (const exp of extractExports(content)) {
    if (exp.name === '*') continue;
    totalExports++;
    if (!hasProdImport(exp.name, f.path)) dead.push({ file: f.path, line: exp.line, name: exp.name });
  }
}

console.log('PROD_FILES', files.filter((x) => !x.isTest).length);
console.log('TOTAL_EXPORTS', totalExports);
console.log('DEAD', dead.length);
dead.sort((a, b) => a.file.localeCompare(b.file));
for (const d of dead) console.log(`${d.file}:${d.line}\t${d.name}`);
