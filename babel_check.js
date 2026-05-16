const fs = require('fs');
const parser = require('@babel/parser');

const file = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const code = fs.readFileSync(file, 'utf-8');

try {
    parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
    });
    console.log('Parsing successful! No syntax errors.');
} catch (e) {
    console.log('Parsing failed:');
    console.log(e.message);
    if (e.loc) {
        console.log(`Line Check: ${e.loc.line}:${e.loc.column}`);
        const lines = code.split('\n');
        console.log(lines[e.loc.line - 1]);
    }
}
