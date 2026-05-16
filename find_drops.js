const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
for(let i=11943; i<=18406; i++) {
    let line = lines[i] || '';
    if(line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, ''); 
    if(i===15712 || i===15719) { balance--; continue; } 
    if(i===15848) balance--; 
    if(i===15974) balance--; 
    
    let oldBalance = balance;
    const regex = /<div(?=[\s>]|$)|<\/div>/g;
    let match;
    while((match = regex.exec(cleanLine)) !== null) {
        if(match[0].startsWith('<div')) balance++;
        else balance--;
    }
    
    if (balance < 0) {
        console.log(`L${i+1}: WARNING BALANCE DROPPED BELOW 0! ${line}`);
    }
    
    // We want to know where it drops below 3
    if (oldBalance === 3 && balance < 3) {
        console.log(`L${i+1}: Dropped from 3 to ${balance}`);
    }
    if (oldBalance === 2 && balance < 2) {
        console.log(`L${i+1}: Dropped from 2 to ${balance}`);
    }
    if (oldBalance === 1 && balance < 1) {
        console.log(`L${i+1}: Dropped from 1 to ${balance}`);
    }
}
