import fs from 'fs';
import path from 'path';

const files = [
    'src/app/components/lawyer/Dashboard_Active_Order_File/layout/LifecyclePanel.tsx',
    'src/app/components/lawyer/Dashboard_Active_Order_File/layout/AdminWorkspacePanel.tsx',
];

for (const rel of files) {
    const p = path.resolve(rel);
    if (!fs.existsSync(p)) continue;
    let s = fs.readFileSync(p, 'utf8');
    s = s.replace(/m\.text-/g, 'text-');
    s = s.replace(/placeholder:m\.text/g, 'placeholder:text');
    s = s.replace(/e\.m\.target/g, 'e.target');
    s = s.replace(/type="m\.text"/g, 'type="text"');
    s = s.replace(/m\.text\]/g, 'text]');
    s = s.replace(/m\.text\}/g, 'text}');
    s = s.replace(/m\.text\)/g, 'text)');
    s = s.replace(/m\.text,/g, 'text,');
    s = s.replace(/m\.text;/g, 'text;');
    s = s.replace(/m\.text'/g, "text'");
    s = s.replace(/m\.text"/g, 'text"');
    s = s.replace(/m\.text>/g, 'text>');
    s = s.replace(/m\.text\//g, 'text/');
    s = s.replace(/m\.text\s/g, 'text ');
    fs.writeFileSync(p, s);
    console.log('fixed', rel);
}
