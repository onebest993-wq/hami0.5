const fs = require('fs');
const lines = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf-8').split('\n');
const block = lines.slice(14448, 15976).join('\n');
const prefix = 'import React from "react";\nexport default function DebtorBlock() {\nreturn <>{';
const suffix = '}</>;\n}\n';
fs.writeFileSync('debtor_map.tsx', prefix + block + suffix);
