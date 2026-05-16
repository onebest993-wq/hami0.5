const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
// ExecutionDashboard main return starts at 11944 (index 11943)
for (let i = 11943; i <= 21638; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div[^>]*\/>/g, ''); 
    const opens = (cleanLine.match(/<div(?:\s|>|$)/g) || []).length;
    const closes = (cleanLine.match(/<\/div>(?:\s|>|$)/g) || []).length;
    
    balance += (opens - closes);
    
    // Print around 20700
    if (i >= 20470 && i <= 20710) {
        console.log(`L${i+1}: +${opens} -${closes} = ${balance} | ${line.trim()}`);
    }
}
console.log('Final Balance:', balance);
