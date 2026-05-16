const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
for(let i=11943; i<=18406; i++) {
    let line = lines[i] || '';
    if(line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, ''); 
    if(i===15712 || i===15719) { balance--; continue; } 
    
    // We already established 15848 is missing </div>, so we add 1 to balance here
    if (i===15848) balance--; // subtract 1 open tag because it closes
    
    // We already established 15974 was deleted so we put it back
    if (i===15974) balance--; // subtract 1 open tag
    
    const regex = /<div(?=[\s>]|$)|<\/div>/g;
    let match;
    while((match = regex.exec(cleanLine)) !== null) {
        if(match[0].startsWith('<div')) balance++;
        else balance--;
    }
}
console.log('Balance at 18406:', balance);
