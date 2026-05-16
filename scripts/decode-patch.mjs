import fs from 'fs';

const raw = fs.readFileSync('scripts/recovered.patch', 'utf8');
// file is one line with escaped newlines inside JSON - actually raw starts with *** Begin Patch\n
const decoded = raw.includes('\\n') ? raw.replace(/\\n/g, '\n').replace(/\\"/g, '"') : raw;
fs.writeFileSync('scripts/recovered-decoded.patch', decoded);
console.log('decoded lines', decoded.split('\n').length);
