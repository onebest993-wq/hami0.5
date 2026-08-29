import fs from 'fs';

const path = 'src/app/components/lawyer/ExecutionCreationView.tsx';
let src = fs.readFileSync(path, 'utf8');
const lines = src.split(/\r?\n/);

const start = lines.findIndex((l) => l.includes("['مشاهدة', 'تسليم ولد']"));
const end = lines.findIndex(
  (l, i) => i > start && l.includes(') : null}') && lines[i - 1]?.includes('</ExecutionCreationSection>'),
);
console.log({ start, end, before: lines[start], after: lines[end] });

if (start < 0 || end < 0) throw new Error('bounds');

const replacement = [
  '                    <VisitationCustodyExtrasSection',
  '                        claimType={claimType}',
  '                        visitationChildrenNames={visitationChildrenNames}',
  '                        setVisitationChildrenNames={setVisitationChildrenNames}',
  '                        visitationScheduleDraft={visitationScheduleDraft}',
  '                        setVisitationScheduleDraft={setVisitationScheduleDraft}',
  '                        custodyWardNames={custodyWardNames}',
  '                        setCustodyWardNames={setCustodyWardNames}',
  '                    />',
];

const next = [...lines.slice(0, start), ...replacement, ...lines.slice(end + 1)];
let out = next.join('\n');

// Drop unused imports
out = out
  .replace(/import \{ Plus \} from '@\/app\/components\/ui\/icons\/Plus';\r?\n/, '')
  .replace(/import \{ Trash2 \} from '@\/app\/components\/ui\/icons\/Trash2';\r?\n/, '')
  .replace(
    /import \{\r?\n\s*VisitationScheduleSetupSection,\r?\n\} from '\.\/ExecutionCreationView\/components\/VisitationScheduleSetupSection';\r?\n/,
    '',
  )
  .replace(
    /import \{ ExecutionCreationSection \} from '\.\/ExecutionCreationView\/components\/ExecutionCreationSection';\r?\n/,
    '',
  );

fs.writeFileSync(path, out);
console.log('host lines', out.split(/\n/).length);
