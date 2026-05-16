const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
let stack = [];

for (let i = 11943; i <= 21637; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, ''); 
    
    // exact tags
    // use a loop to preserve order of opens/closes in the line
    const regex = /<div(?=[\s>]|$)|<\/div>/g;
    let match;
    while((match = regex.exec(cleanLine)) !== null) {
        if (i === 15712 || i === 15719) {
            // These are known multiline self-closing that end with /> on this line
            continue;
        }
        
        if (match[0].startsWith('<div')) {
            stack.push({l: i+1, t: line.trim()});
        } else {
            stack.pop();
        }
    }
}
console.log('Unclosed divs:');
stack.forEach(s => console.log(`L${s.l}: ${s.t}`));
