const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
let errors = [];

// ExecutionDashboard main return starts at 11944 (index 11943)
// and theoretically ends at 21638 (index 21637)

for (let i = 11943; i <= 21637; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    
    // Check self-closing <div ... />
    const selfClosing = (cleanLine.match(/<div[^>]*\/>/g) || []).length;
    cleanLine = cleanLine.replace(/<div[^>]*\/>/g, ''); // ignore them
    
    const opens = (cleanLine.match(/<div(?:\s|>|$)/g) || []).length;
    const closes = (cleanLine.match(/<\/div>(?:\s|>|$)/g) || []).length;
    
    balance += (opens - closes);
    
    if (balance < 0) {
        errors.push(`L${i+1}: Balance dropped to ${balance} (Extra closing tag?) | ${line.trim()}`);
    }
}

console.log('Final Balance from 11944 to 21638:', balance);
if (errors.length > 0) {
    console.log('First 20 negative drops:');
    console.log(errors.slice(0, 20).join('\n'));
}
