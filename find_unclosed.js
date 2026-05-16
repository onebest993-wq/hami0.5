const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let stack = [];

for (let i = 11943; i <= 21637; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div[^>]*\/>/g, ''); 
    
    // Process <div and </div> iteratively across line
    const tagRegex = /<div(?:\s|>|$)|<\/div>(?:\s|>|$)/g;
    let match;
    while ((match = tagRegex.exec(cleanLine)) !== null) {
        if (match[0].startsWith('<div')) {
            stack.push({ line: i + 1, text: line.trim() });
        } else {
            if (stack.length > 0) {
                stack.pop();
            } else {
                console.log(`Extra </div> at line ${i + 1}`);
            }
        }
    }
}

console.log('Unclosed divs at the end:');
for (let item of stack) {
    console.log(`L${item.line}: ${item.text}`);
}
