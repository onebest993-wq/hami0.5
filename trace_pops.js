const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');
let stack = [];
for(let i=11943; i<=21637; i++){
    let line = lines[i] || '';
    if(line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, '');
    let regex = /<div(?=[\s>]|$)|<\/div>/g;
    let match;
    while((match = regex.exec(cleanLine)) !== null) {
        if(i===15712 || i===15719) continue;
        if(match[0].startsWith('<div')) {
            stack.push({l: i+1});
        }
        else {
            let popped = stack.pop();
            if (i+1 === 15985 || i+1 === 15986) {
                console.log(`Line ${i+1} popped Line ${popped.l}`);
            }
        }
    }
}
