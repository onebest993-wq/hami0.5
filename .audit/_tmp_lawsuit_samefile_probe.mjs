/**
 * Live probe: same-file-only exports under lawsuits scope trees.
 * High-confidence demote candidates (identifier appears only in defining file).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

const SCOPE_PREFIXES = [
  'src/app/components/lawyer/criminal-system/',
  'src/app/components/lawyer/smart-modal/',
  'src/app/components/lawyer/ArchivePortal/',
  'src/app/components/lawyer/personal-status/',
  'src/app/domain/lawsuit/',
  'src/app/domain/urgent/',
  'src/app/components/lawyer/Dashboard_Active_Order_File/',
  'src/app/components/lawyer/Form_Urgent_Actions/',
];
const SCOPE_FILES = new Set([
  'src/app/components/lawyer/View_Urgent_And_Orders_Dashboard.tsx',
  'src/app/components/lawyer/Dashboard_Active_Order_File.tsx',
  'src/app/components/lawyer/DeferredActiveOrderFile.tsx',
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

function stripComments(src) {
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    if (src[i] === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      out += '\n';
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 1;
      continue;
    }
    out += src[i];
  }
  return out;
}

const toPosix = (p) => p.replace(/\\/g, '/');

function inScope(rel) {
  if (SCOPE_FILES.has(rel)) return true;
  return SCOPE_PREFIXES.some((p) => rel.startsWith(p));
}

function exportedNames(cleaned) {
  const names = new Set();
  for (const m of cleaned.matchAll(
    /^export\s+(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(?:const|let|var|function|class|enum|type|interface)\s+([A-Za-z_$][\w$]*)/gm,
  )) {
    names.add(m[1]);
  }
  for (const m of cleaned.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default') names.add(name);
    }
  }
  return names;
}

const files = walk(SRC);
const identifierOwners = new Map();
const perFile = new Map();

for (const abs of files) {
  const rel = toPosix(path.relative(ROOT, abs));
  const cleaned = stripComments(fs.readFileSync(abs, 'utf8'));
  perFile.set(rel, cleaned);
  for (const m of cleaned.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const name = m[0];
    let owners = identifierOwners.get(name);
    if (!owners) {
      owners = new Set();
      identifierOwners.set(name, owners);
    }
    owners.add(rel);
  }
}

const dead = [];
const sameFileOnly = [];
const DEBUG_NAMES = new Set(['UrgentActionsBasicInfoSection', 'CourtReferralAcceptance', 'GLASS_BODY']);

for (const [rel, cleaned] of perFile) {
  if (!inScope(rel)) continue;
  if (/PersistMigrate/i.test(rel)) continue;
  if (/\.test\.(ts|tsx)$/.test(rel)) continue;
  if (/\.d\.ts$/.test(rel)) continue;

  for (const name of exportedNames(cleaned)) {
    const owners = identifierOwners.get(name) || new Set();
    const others = [...owners].filter((o) => o !== rel);
    if (DEBUG_NAMES.has(name)) {
      fs.appendFileSync(
        path.join(ROOT, '.audit/_tmp_probe_debug.txt'),
        `DEBUG ${name}\ndef=${rel}\nowners=${JSON.stringify([...owners])}\nothers=${JSON.stringify(others)}\n\n`,
      );
    }
    if (others.length === 0) {
      // truly dead / same-file-only (identifier never appears elsewhere)
      const line = cleaned.split('\n').findIndex((l) => new RegExp(`\\b${name}\\b`).test(l) && /export/.test(l));
      const kind =
        /export\s+(?:type\s+)?(?:type|interface)\s/.test(cleaned.match(new RegExp(`export[\\s\\S]{0,40}${name}`))?.[0] || '') ||
        /^export\s+type\b/.test(cleaned.split('\n').find((l) => l.includes(name) && l.includes('export')) || '')
          ? 'type'
          : 'value';
      const isProps = /Props$/.test(name);
      const isDeprecatedKeep = /@deprecated[\s\S]{0,200}KEEP/i.test(cleaned) && cleaned.includes(name);
      sameFileOnly.push({ rel, name, isProps, kind, line: line + 1 });
    }
  }
}

// Also find exports referenced only in same file AND possibly in tests of that module
// (still demote-worthy if only self + colocated tests — but user said skip test-imported)
const demoteCandidates = sameFileOnly.filter((c) => {
  if (c.isProps) return false; // skip *Props contracts
  if (/DEPRECATED|KEEP_/i.test(c.name)) return false;
  return true;
});

// Check if any "dead" export is only imported by tests — those we skip for demote/delete of files
function isTestImportedOnly(rel, name) {
  const owners = identifierOwners.get(name) || new Set();
  const others = [...owners].filter((o) => o !== rel);
  return others.length > 0 && others.every((o) => /\.test\.(ts|tsx)$/.test(o) || /\/__tests__\//.test(o));
}

const out = {
  sameFileOnlyTotal: sameFileOnly.length,
  demoteCandidates,
  demoteCandidateCount: demoteCandidates.length,
  propsSkipped: sameFileOnly.filter((c) => c.isProps).length,
};

fs.writeFileSync(
  path.join(ROOT, '.audit/_tmp_lawsuit_samefile_probe.json'),
  JSON.stringify(out, null, 2),
);

console.log(`same-file-only total: ${sameFileOnly.length}`);
console.log(`props skipped: ${out.propsSkipped}`);
console.log(`demote candidates: ${demoteCandidates.length}`);
console.log('--- top 50 ---');
for (const c of demoteCandidates.slice(0, 50)) {
  console.log(`${c.rel} :: ${c.name}`);
}
