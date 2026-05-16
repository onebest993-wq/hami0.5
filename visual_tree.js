const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let depth = 0;
let output = [];

for (let i = 14448; i <= 15976; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div[^>]*\/>/g, ''); 
    // handle multiline self-closing divs by ignoring lines that end in />
    if (line.trim() === '/>' || cleanLine.trim().endsWith('/>')) {
        // if this line closes a tag, we should ideally pop. 
        // But wait, my previous script didn't pop them!
    }
    
    const opens = (cleanLine.match(/<div(?:\s|>|$)/g) || []).length;
    const closes = (cleanLine.match(/<\/div>(?:\s|>|$)/g) || []).length;
    
    for (let o = 0; o < opens; o++) {
        output.push('  '.repeat(depth) + `<div (L${i+1})`);
        depth++;
    }
    for (let c = 0; c < closes; c++) {
        depth--;
        output.push('  '.repeat(Math.max(0, depth)) + `</div> (L${i+1})`);
    }
}
fs.writeFileSync('tree.txt', output.join('\n'));
console.log('Tree written. Final depth:', depth);
