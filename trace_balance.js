const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 3; // we know it's 3 at 15499
for (let i = 15499; i <= 15976; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div[^>]*\/>/g, ''); 
    const opens = (cleanLine.match(/<div(?:\s|>|$)/g) || []).length;
    const closes = (cleanLine.match(/<\/div>(?:\s|>|$)/g) || []).length;
    
    let old = balance;
    balance += (opens - closes);
    if (balance !== old) {
        console.log(`L${i+1}: ${old} -> ${balance} | ${line.trim()}`);
    }
}
