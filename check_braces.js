const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let braceDiff = 0;
let parenDiff = 0;

for (let i = 11943; i <= 21637; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (!line.includes('{') || line.trim().startsWith('//'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    
    // Naively count { and } 
    // This isn't perfect for JSX but might highlight a glaring omission
    for (let char of cleanLine) {
        if (char === '{') braceDiff++;
        if (char === '}') braceDiff--;
        if (char === '(') parenDiff++;
        if (char === ')') parenDiff--;
    }
}
console.log('Brace Diff (should be 0):', braceDiff);
console.log('Paren Diff (should be 0):', parenDiff);
