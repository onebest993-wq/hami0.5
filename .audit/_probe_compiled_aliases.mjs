import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ASSETS = 'dist/assets';
const files = {
  FullOrchestrationHost: 'LawyerDashboardFullOrchestrationHost-Ca7QscKV.js',
  FullBootPath: 'LawyerDashboardFullBootPath-CwDeYit9.js',
  MainView: 'LawyerDashboardMainView-121ZXKuh.js',
  Inner: 'LawyerDashboardInner-CF25fc6b.js',
};

const tumors = [
  'execution-handler-cluster-handlers',
  'archive-portal-execution',
  'execution-handler-cluster-runtime',
  'vendor-supabase',
  'lawsuit-archive-grid',
  'lawyer-dashboard-minimal-boot',
  'execution-handler-cluster-dossier',
  'execution-handler-cluster-followup',
  'execution-handler-cluster-core',
  'execution-handler-cluster-foundation',
];

function gzipKb(file) {
  const buf = fs.readFileSync(path.join(ASSETS, file));
  return (zlib.gzipSync(buf).length / 1024).toFixed(1);
}

for (const [label, file] of Object.entries(files)) {
  const src = fs.readFileSync(path.join(ASSETS, file), 'utf8');
  console.log(`\n======== ${label} (${file}) ========`);
  for (const t of tumors) {
    const re = new RegExp(String.raw`import\{([^}]*)\}from"(\./${t}-[^"]+)"`);
    const side = new RegExp(String.raw`import"(\./${t}-[^"]+)"`);
    const m = src.match(re);
    const s = src.match(side);
    if (!m && !s) continue;
    if (s && !m) {
      console.log(`SIDE-EFFECT ${s[1]} (${gzipKb(s[1].slice(2))} KB gz)`);
      continue;
    }
    const chunkFile = m[2].slice(2);
    console.log(`\nSTATIC from ${m[2]} (${gzipKb(chunkFile)} KB gz)`);
    console.log(`  raw map: ${m[1]}`);
    // For each local alias, show a usage snippet that is not the import
    for (const a of m[1].matchAll(/(\w+)\s+as\s+(\w+)/g)) {
      const orig = a[1];
      const local = a[2];
      const reU = new RegExp(String.raw`(?:^|[^$\w])${local}(?:[^$\w]|$)`, 'g');
      let shown = 0;
      let um;
      while ((um = reU.exec(src)) !== null) {
        const pos = um.index;
        const snip = src.slice(Math.max(0, pos - 60), pos + 120).replace(/\s+/g, ' ');
        if (snip.includes('from"./') || snip.includes('import{')) continue;
        console.log(`  ${orig} as ${local}: ...${snip}...`);
        shown += 1;
        if (shown >= 2) break;
      }
      if (shown === 0) console.log(`  ${orig} as ${local}: (no non-import usage found — may be re-export only)`);
    }
  }
}
