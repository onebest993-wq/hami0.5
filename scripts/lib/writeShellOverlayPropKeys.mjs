import fs from 'node:fs';
import path from 'node:path';

const HOOKS_DIR = 'src/app/components/lawyer/ExecutionDashboard/hooks';
const BARREL = path.join(HOOKS_DIR, 'executionShellOverlayPropKeys.ts');
const HEAD = path.join(HOOKS_DIR, 'executionShellOverlayPropKeys.head.ts');
const TAIL = path.join(HOOKS_DIR, 'executionShellOverlayPropKeys.tail.ts');

function emitPart(name, keys) {
    const body = keys.map((k) => `    '${k}',`).join('\n');
    return `/** جزء من EXECUTION_SHELL_OVERLAY_PROP_KEYS — يُزامَن عبر scripts/generate-shell-overlay-infra.mjs */\nexport const ${name} = [\n${body}\n] as const;\n`;
}

export function writeShellOverlayPropKeys(keys) {
    const list = [...new Set(keys)];
    const mid = Math.ceil(list.length / 2);
    const head = list.slice(0, mid);
    const tail = list.slice(mid);
    fs.writeFileSync(HEAD, emitPart('EXECUTION_SHELL_OVERLAY_PROP_KEYS_HEAD', head));
    fs.writeFileSync(TAIL, emitPart('EXECUTION_SHELL_OVERLAY_PROP_KEYS_TAIL', tail));
    fs.writeFileSync(
        BARREL,
        `/** مفاتيح shell overlays (بدون محضر المتابعة) — مُولَّد من scripts/generate-shell-overlay-infra.mjs */\nimport { EXECUTION_SHELL_OVERLAY_PROP_KEYS_HEAD } from './executionShellOverlayPropKeys.head';\nimport { EXECUTION_SHELL_OVERLAY_PROP_KEYS_TAIL } from './executionShellOverlayPropKeys.tail';\n\nexport const EXECUTION_SHELL_OVERLAY_PROP_KEYS = [\n    ...EXECUTION_SHELL_OVERLAY_PROP_KEYS_HEAD,\n    ...EXECUTION_SHELL_OVERLAY_PROP_KEYS_TAIL,\n] as const;\n\nexport type ExecutionShellOverlayPropKey = (typeof EXECUTION_SHELL_OVERLAY_PROP_KEYS)[number];\n/** @deprecated استخدم ExecutionShellOverlayPropKey */\nexport type EXECUTION_SHELL_OVERLAY_PROP_Key = ExecutionShellOverlayPropKey;\n`,
    );
    return list;
}

export const SHELL_OVERLAY_PROP_KEYS_PATHS = { BARREL, HEAD, TAIL };
