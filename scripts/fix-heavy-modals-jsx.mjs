import fs from 'fs';

const p = 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModals.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\bs\.([A-Za-z_][A-Za-z0-9_]*)=\{/g, '$1={');
c = c.replace("from '@/app/types/timeline'", "from '@/app/types/execution'");
fs.writeFileSync(p, c);
console.log('fixed');
