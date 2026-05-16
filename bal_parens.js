const fs = require('fs');
let content = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8');
// remove all comments, strings
content = content.replace(/\/\*[\s\S]*?\*\//g, '');
content = content.replace(/\/\/.*$/gm, '');
content = content.replace(/"(?:\\.|[^"\\])*"/g, '');
content = content.replace(/'(?:\\.|[^'\\])*'/g, '');
content = content.replace(/`(?:\\.|[^`\\])*`/g, '');
let parenBalance = 0;
let braceBalance = 0;
for(let i=0; i<content.length; i++) {
    if(content[i] === '(') parenBalance++;
    if(content[i] === ')') parenBalance--;
    if(content[i] === '{') braceBalance++;
    if(content[i] === '}') braceBalance--;
}
console.log('Paren Balance: ', parenBalance);
console.log('Brace Balance: ', braceBalance);
