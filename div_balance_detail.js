const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');
let divDiff = 0;
let balanceLog = [];
// analyzing lines 14749 to 15976
for (let i = 14749; i <= 15976; i++) {
  const line = lines[i] || '';
  if(line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
  
  let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
  const opens = (cleanLine.match(/<div(?:\s|>|$)/g) || []).length;
  const closes = (cleanLine.match(/<\/div>(?:\s|>|$)/g) || []).length;
  divDiff += (opens - closes);
  if (opens > 0 || closes > 0) {
    console.log("L" + (i+1) + ": +" + opens + " -" + closes + " = " + divDiff + " | " + line.trim());
  }
}
console.log('Final balance:', divDiff);
