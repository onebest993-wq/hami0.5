const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
for(let i=11943; i<=15986; i++) {
    let line = lines[i] || '';
    if(line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, ''); 
    if(i===15712 || i===15719) { balance--; continue; } 
    if(i===15848) balance--; // manual adjustment for </div>,
    if(i===15974) balance--; // manual adjustment for the one we know
    
    let oldBalance = balance;
    const regex = /<div(?=[\s>]|$)|<\/div>/g;
    let match;
    while((match = regex.exec(cleanLine)) !== null) {
        if(match[0].startsWith('<div')) balance++;
        else balance--;
        
        if (i > 14418 && balance < 5 && oldBalance >= 5) {
            console.log(`L${i+1}: Dropped to ${balance}! Line: ${line.trim()}`);
        }
        oldBalance = balance;
    }
}
