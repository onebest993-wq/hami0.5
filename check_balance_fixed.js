const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

let balance = 0;
let increments = [];

for (let i = 11943; i <= 21637; i++) {
    let line = lines[i] || '';
    if (line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, ''); // ignore any self-closing div
    // ALSO check for multiline self-closing. If the line ends with /> and we have open divs, we assume the LAST open div self-closed iff no children
    // Better: let's just use strict regex
    
    // just match exact
    let opens = (cleanLine.match(/<div(?=[\s>]|$)/g) || []).length;
    let closes = (cleanLine.match(/<\/div>/g) || []).length;
    
    // If the line has '/>' and NO '</div>' but it has '<div', it MIGHT be self closing multiline. 
    // This is hard to regex. We have 15713 and 15720:
    if (i === 15712 || i === 15719) {
        // manually adjust for the self-closing multiline we know about!
        closes++; 
    }
    
    balance += (opens - closes);
    console.log(`L${i+1}: ${balance}`);
}
