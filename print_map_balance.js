const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
for (let i = 14448; i <= 15976; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div[^>]*\/>/g, ''); 
    const opens = (cleanLine.match(/<div(?:\s|>|$)/g) || []).length;
    const closes = (cleanLine.match(/<\/div>(?:\s|>|$)/g) || []).length;
    
    balance += (opens - closes);
    console.log(`L${i+1}: balance ${balance} | ${line.trim()}`);
}
