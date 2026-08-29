import fs from 'node:fs';
import path from 'node:path';

const CORE_DIR = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore';
const BARREL = path.join(CORE_DIR, 'executionDashboardCoreRuntimeVarKeys.generated.ts');
const HEAD = path.join(CORE_DIR, 'executionDashboardCoreRuntimeVarKeys.head.ts');
const TAIL = path.join(CORE_DIR, 'executionDashboardCoreRuntimeVarKeys.tail.ts');

function emitPart(name, keys) {
    const body = keys.map((k) => `    "${k}",`).join('\n');
    return `/** جزء من CORE_RUNTIME_VAR_KEYS — مُولَّد */\nexport const ${name} = [\n${body}\n] as const;\n`;
}

export function writeCoreRuntimeVarKeys(keys) {
    const list = [...keys];
    const mid = Math.ceil(list.length / 2);
    const head = list.slice(0, mid);
    const tail = list.slice(mid);
    fs.writeFileSync(HEAD, emitPart('CORE_RUNTIME_VAR_KEYS_HEAD', head));
    fs.writeFileSync(TAIL, emitPart('CORE_RUNTIME_VAR_KEYS_TAIL', tail));
    fs.writeFileSync(
        BARREL,
        `/** Phase C Slice 27 — مفاتيح coreRuntimeVars (مُولَّد) */\nimport { CORE_RUNTIME_VAR_KEYS_HEAD } from './executionDashboardCoreRuntimeVarKeys.head';\nimport { CORE_RUNTIME_VAR_KEYS_TAIL } from './executionDashboardCoreRuntimeVarKeys.tail';\n\nexport const CORE_RUNTIME_VAR_KEYS = [\n    ...CORE_RUNTIME_VAR_KEYS_HEAD,\n    ...CORE_RUNTIME_VAR_KEYS_TAIL,\n] as const;\n`,
    );
    return list;
}

export const CORE_RUNTIME_VAR_KEYS_PATHS = { BARREL, HEAD, TAIL };
