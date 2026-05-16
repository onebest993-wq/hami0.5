const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
let increments = [];

for (let i = 11943; i <= 21637; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, ''); 
    let opens = (cleanLine.match(/<div(?=[\s>]|$)/g) || []).length;
    let closes = (cleanLine.match(/<\/div>/g) || []).length;
    
    if (i === 15712 || i === 15719) closes++; 
    
    let oldBalance = balance;
    balance += (opens - closes);
    
    if (balance > oldBalance && balance > 2) {
        if (!increments[balance]) {
            increments[balance] = `L${i+1}: reached ${balance} | ${line.trim()}`;
        }
    }
}
for(let i=3; i<=balance; i++) {
    console.log(increments[i]);
}
