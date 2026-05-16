const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');

// We pretend 15974 and 15975 exist with </div>
lines.splice(15973, 0, '</div>', '</div>');
// Now lines are shifted by +2 after 15973!
// So 15974 is now 15976: );

let stack = [];
for(let i=11943; i<=21639; i++){
    let line = lines[i] || '';
    if(line.includes('//') && (line.includes('<div') || line.includes('</div'))) continue;
    let cleanLine = line.replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, '');
    let regex = /<div(?=[\s>]|$)|<\/div>/g;
    let match;
    while((match = regex.exec(cleanLine)) !== null) {
        if(i===15712 || i===15719) continue;
        if(match[0].startsWith('<div')) stack.push({l: i+1});
        else {
            let popped = stack.pop();
            // The newly inserted tags will be at i=15973 and i=15974 (1-indexed 15974 and 15975)
            if (i+1 === 15974 || i+1 === 15975) {
                console.log(`Line ${i+1} popped Line ${popped.l}`);
            }
        }
    }
}
