import fs from 'fs';

const { shell: rawShell, followup } = JSON.parse(
    fs.readFileSync('scripts/_overlay-keys.json', 'utf8'),
);

const SHELL_BLACKLIST = new Set([
    'checked',
    'currentTotal',
    'decisionId',
    'earnerForcedActionUnlocked',
    'size',
    'timelineEvent',
    'onCloseDecisionsModal',
    'onRestoreCaseNote',
    'onRestoreCaseTask',
    'onRequestEditTimelineEvent',
]);

const shell = rawShell.filter((k) => !SHELL_BLACKLIST.has(k)).sort();

function writeKeysFile(path, exportName, keys, comment) {
    const body = keys.map((k) => `    '${k}',`).join('\n');
    fs.writeFileSync(
        path,
        `/** ${comment} — مُولَّد من scripts/generate-shell-overlay-infra.mjs */\nexport const ${exportName} = [\n${body}\n] as const;\n\nexport type ${exportName.replace(/KEYS$/, 'Key')} = (typeof ${exportName})[number];\n\n/** Snapshot محضر المتابعة — حقول معرّفة في القائمة المُولَّدة */\nexport type FollowupModalSnapshot = Partial<Record<${exportName.replace(/KEYS$/, 'Key')}, unknown>>;\n`,
    );
}

writeKeysFile(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts',
    'EXECUTION_SHELL_OVERLAY_PROP_KEYS',
    shell,
    'مفاتيح shell overlays (بدون محضر المتابعة)',
);

writeKeysFile(
    'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts',
    'EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS',
    followup,
    'حقول snapshot محضر المتابعة',
);

console.log('keys written', { shell: shell.length, followup: followup.length });
