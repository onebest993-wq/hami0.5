import fs from 'node:fs';
const files = [
  'LawyerDashboardFullOrchestrationHost-Ca7QscKV.js',
  'LawyerDashboardFullBootPath-CwDeYit9.js',
  'LawyerDashboardMainView-121ZXKuh.js',
  'LawyerDashboardInner-CF25fc6b.js',
];
for (const f of files) {
  const s = fs.readFileSync('dist/assets/' + f, 'utf8');
  const named = [...s.matchAll(/from"\.\/((?:execution-handler-cluster|archive-portal-execution|lawsuit-archive-grid|lawyer-dashboard-minimal-boot|vendor-supabase)-[^"]+)"/g)].map((m) => m[1]);
  const side = [...s.matchAll(/import"\.\/((?:execution-handler-cluster|archive-portal-execution|lawsuit-archive-grid|lawyer-dashboard-minimal-boot|vendor-supabase)-[^"]+)"/g)].map((m) => m[1]);
  console.log('\n' + f);
  console.log('  named:', [...new Set(named)].join(', ') || 'none');
  console.log('  side:', [...new Set(side)].join(', ') || 'none');
}
