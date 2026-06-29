import fs from 'fs';

const keys = JSON.parse(fs.readFileSync('scripts/_phone-body-keys.json', 'utf8'));
const body = keys.map((k) => `    '${k}',`).join('\n');
fs.writeFileSync(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.ts',
    `/** مفاتيح جسم الداشبورد — مُولَّد من scripts/generate-phone-body-infra.mjs */\nexport const EXECUTION_PHONE_BODY_PROP_KEYS = [\n${body}\n] as const;\n\nexport type ExecutionPhoneBodyPropKey = (typeof EXECUTION_PHONE_BODY_PROP_KEYS)[number];\n`,
);
console.log('written', keys.length);
