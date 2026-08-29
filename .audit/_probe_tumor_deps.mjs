import fs from 'node:fs';
const chunks = [
  'execution-handler-cluster-handlers-V3NSAXt5.js',
  'execution-handler-cluster-dossier-B_suhIdC.js',
  'execution-handler-cluster-runtime-Dx9V4jvv.js',
  'archive-portal-execution-DAXgd0WV.js',
  'lawsuit-archive-grid-Cy1zRfmQ.js',
  'lawyer-dashboard-minimal-boot-BojIX5pn.js',
];
for (const f of chunks) {
  const s = fs.readFileSync('dist/assets/' + f, 'utf8');
  const deps = [...s.matchAll(/from"\.\/([^"]+)"/g)].map((m) => m[1]);
  const interesting = deps.filter((x) =>
    /supabase|archive-portal|lawsuit-archive|minimal-boot|execution-handler|handlers|dossier|runtime|followup|foundation|core-/.test(
      x,
    ),
  );
  console.log('\n' + f);
  console.log([...new Set(interesting)].join('\n') || '(none of interest)');
}
