const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
let increments = [];

for (let i = 11943; i <= 21637; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div[^>]*\/>/g, ''); 
    const opens = (cleanLine.match(/<div(?:\s|>|$)/g) || []).length;
    const closes = (cleanLine.match(/<\/div>(?:\s|>|$)/g) || []).length;
    
    let oldBalance = balance;
    balance += (opens - closes);
    
    if (balance > oldBalance && balance > 0) {
        if (!increments[balance]) {
            increments[balance] = `L${i+1}: reached ${balance} | ${line.trim()}`;
        }
    }
}
console.log('Milestones of increasing balance:');
for(let i=1; i<=balance; i++) {
    console.log(increments[i]);
}
