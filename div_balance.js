const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');
let divDiff = 0;
let balanceLog = [];
// analyzing lines 14750 to 15977 (0-indexed 14749 to 15976)
for (let i = 14749; i <= 15976; i++) {
  const line = lines[i] || '';
  if(line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
  const opens = (line.match(/<div(\s|>)/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  divDiff += (opens - closes);
  if (opens > 0 || closes > 0) {
    balanceLog.push("L" + (i+1) + ": +" + opens + " -" + closes + " = " + divDiff);
  }
}
console.log('Final balance:', divDiff);
let dropped = [];
for (let log of balanceLog) {
  if (log.endsWith('= 0') || log.includes('= -')) {
    dropped.push(log);
  }
}
console.log('Dropped to 0 or below:');
console.log(dropped.join('\n'));
