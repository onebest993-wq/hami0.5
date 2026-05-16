const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let stack = [];
for (let i = 13490; i <= 13682; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, ''); 
    
    const regex = /<div(?=[\s>]|$)|<\/div>/g;
    let match;
    while((match = regex.exec(cleanLine)) !== null) {
        if (match[0].startsWith('<div')) {
            stack.push({l: i+1, t: line.trim()});
        } else {
            stack.pop();
        }
    }
}
console.log('Unclosed inside header:');
stack.forEach(s => console.log(`L${s.l}: ${s.t}`));
