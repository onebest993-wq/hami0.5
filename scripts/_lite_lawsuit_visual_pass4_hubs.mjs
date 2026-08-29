import fs from 'node:fs';

const file = 'src/app/components/lawyer/Modal_Unified_Summons_Hub/summonsHubStyles.ts';
let s = fs.readFileSync(file, 'utf8');
s = s.replace(
  /shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.10\),0_10px_30px_rgba\([^)]+\)\]/g,
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
);
s = s.replace(
  /shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.07\),0_14px_34px_rgba\(0,0,0,0\.45\)\]/g,
  'shadow-[0_6px_18px_rgba(0,0,0,0.2)]',
);
fs.writeFileSync(file, s);
console.log('summons hub styles lite');

const execRoots = [
  'src/app/components/lawyer/execution/personalCoercive/personalCoerciveStyles.ts',
  'src/app/components/lawyer/execution/evictionField/evictionFieldStyles.ts',
  'src/app/components/lawyer/execution/partyInteractiveBadges/PartyBadgePopover.tsx',
  'src/app/components/lawyer/execution/PoliceAssistanceDetailsModal.tsx',
  'src/app/components/lawyer/execution/ExecutorWorkflowConfirmModal.tsx',
  'src/app/components/lawyer/execution/ExecutorBreakInventoryFurnitureModal.tsx',
  'src/app/components/lawyer/execution/ExecutorApprovedDateTimeModal.tsx',
  'src/app/components/lawyer/execution/ExecutionSectionConfirmDialog.tsx',
  'src/app/components/lawyer/execution/ExecutorJudicialCustodianModal.tsx',
];

function transform(src) {
  let t = src;
  const b = t;
  t = t.replaceAll('backdrop-blur-xl', 'backdrop-blur-sm');
  t = t.replaceAll('backdrop-blur-2xl', 'backdrop-blur-md');
  t = t.replaceAll('shadow-2xl', 'shadow-lg');
  t = t.replace(/ ?shadow-\[0_0_[^\]]+\]/g, '');
  t = t.replace(/hover:shadow-\[0_0_[^\]]+\]/g, '');
  return t === b ? null : t;
}

let n = 0;
for (const f of execRoots) {
  if (!fs.existsSync(f)) continue;
  const next = transform(fs.readFileSync(f, 'utf8'));
  if (!next) continue;
  fs.writeFileSync(f, next);
  n++;
  console.log(f);
}
console.log('exec_files', n);
