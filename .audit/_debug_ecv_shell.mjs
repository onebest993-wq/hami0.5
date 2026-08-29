import fs from 'fs';

const lines = fs
  .readFileSync('src/app/components/lawyer/ExecutionCreationView.tsx', 'utf8')
  .split(/\r?\n/);
const shellStart = lines.findIndex((l) => l.includes('const shellContent = ('));
const shellEnd = lines.findIndex((l, i) => i > shellStart && l.trim() === ');');
console.log({ shellStart, shellEnd, line572: lines[571], line677: lines[676] });
const shellInner = lines.slice(shellStart + 1, shellEnd).join('\n');
const marker = lines[571]; // exact line
console.log('marker in inner', shellInner.includes(marker.trim()));
console.log('h6 in inner', shellInner.includes('className="h-6"'));
