import fs from 'fs';
import {
    buildPhoneBodyScopeKeys,
    collectPhoneBodyRequiredKeys,
    extractComponentProps,
    validateScopeKeys,
} from './phone-body-scope-utils.mjs';

const phoneBodyPath =
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx';
const keysPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.ts';
const keysJsonPath = 'scripts/_phone-body-keys.json';
const viewPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';

const body = fs.readFileSync(phoneBodyPath, 'utf8');
const view = fs.readFileSync(viewPath, 'utf8');

const merged = buildPhoneBodyScopeKeys(body, view);
const { required } = collectPhoneBodyRequiredKeys(body, view);
const componentProps = extractComponentProps(view);

const scopeProblems = validateScopeKeys(view, merged);
if (scopeProblems.length) {
    console.error('Scope validation failed before write:\n' + scopeProblems.join('\n'));
    process.exit(1);
}

fs.writeFileSync(keysJsonPath, JSON.stringify(merged, null, 2) + '\n');

const mid = Math.ceil(merged.length / 2);
const head = merged.slice(0, mid);
const tail = merged.slice(mid);
const emitPart = (name, part) =>
    `/** جزء من EXECUTION_PHONE_BODY_PROP_KEYS — يُزامَن عبر scripts/sync-phone-body-missing-keys.mjs */\nexport const ${name} = [\n${part
        .map((k) => `    '${k}',`)
        .join('\n')}\n] as const;\n`;
const keysDir = keysPath.replace(/executionPhoneBodyPropKeys\.ts$/, '');
fs.writeFileSync(keysDir + 'executionPhoneBodyPropKeys.head.ts', emitPart('EXECUTION_PHONE_BODY_PROP_KEYS_HEAD', head));
fs.writeFileSync(keysDir + 'executionPhoneBodyPropKeys.tail.ts', emitPart('EXECUTION_PHONE_BODY_PROP_KEYS_TAIL', tail));
fs.writeFileSync(
    keysPath,
    `/** مفاتيح جسم الدashboard — مُولَّد/مُزامَن عبر scripts/sync-phone-body-missing-keys.mjs */\nimport { EXECUTION_PHONE_BODY_PROP_KEYS_HEAD } from './executionPhoneBodyPropKeys.head';\nimport { EXECUTION_PHONE_BODY_PROP_KEYS_TAIL } from './executionPhoneBodyPropKeys.tail';\n\nexport const EXECUTION_PHONE_BODY_PROP_KEYS = [\n    ...EXECUTION_PHONE_BODY_PROP_KEYS_HEAD,\n    ...EXECUTION_PHONE_BODY_PROP_KEYS_TAIL,\n] as const;\n\nexport type ExecutionPhoneBodyPropKey = (typeof EXECUTION_PHONE_BODY_PROP_KEYS)[number];\n`,
);

const scopeBody = merged.map((k) => `            ${k},`).join('\n');
const newView = view.replace(
    /getScopeSources: \(\) => \(\{[\s\S]*?\}\),\s*\n\s*\}\);/,
    `getScopeSources: () => ({\n${scopeBody}\n        }),\n    });`,
);
fs.writeFileSync(viewPath, newView);

const newDestructure = merged.map((k) => `        ${k},`).join('\n');
const newBody = body.replace(
    /const \{[\s\S]*?\} = props;/,
    `const {\n${newDestructure}\n    } = props;`,
);
fs.writeFileSync(phoneBodyPath, newBody);

console.log('component props:', [...componentProps].join(', '));
console.log('required bindings used in phone body:', required.size);
console.log('total scope keys:', merged.length);
