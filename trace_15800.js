const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');
let balance = 0;
for(let i=15790; i<=15855; i++) {
    let cleanLine = lines[i].replace(/`.*?`/g, '').replace(/".*?"/g, '""').replace(/'.*?'/g, '""');
    cleanLine = cleanLine.replace(/<div(?:.*?)\/>/g, ''); 
    const regex = /<div(?=[\s>]|$)|<\/div>/g;
    let match;
    while((match = regex.exec(cleanLine)) !== null) {
        if(match[0].startsWith('<div')) balance++;
        else balance--;
    }
    console.log('Line ' + (i+1) + ' Balance: ' + balance + ' ' + cleanLine.trim());
}
