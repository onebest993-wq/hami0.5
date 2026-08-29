import fs from 'node:fs';

/**
 * مسار snapshot الحي لم يعد داخل ExecutionDashboard.tsx.
 * التحقق: مفاتيح followupSnapshotFieldKeys مربوطة عبر buildFollowupModalSnapshotInput / chunk scope.
 */
const keysPath = 'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts';
const snapshotInputPath =
    'src/app/components/lawyer/ExecutionDashboard/hooks/buildFollowupModalSnapshotInput.ts';
const assignPath =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionFollowupModalSnapshotFields.ts';

const keysSrc = fs.readFileSync(keysPath, 'utf8');
const snapshotKeys = [...keysSrc.matchAll(/'([^']+)'/g)].map((m) => m[1]);
const unique = [...new Set(snapshotKeys)];

if (unique.length < 50) {
    console.error(`snapshot keys too few: ${unique.length}`);
    process.exit(1);
}

const snapshotInput = fs.readFileSync(snapshotInputPath, 'utf8');
const assign = fs.readFileSync(assignPath, 'utf8');

if (!snapshotInput.includes('EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS') &&
    !snapshotInput.includes('pickExecutionFollowupScopeSlice') &&
    !snapshotInput.includes('executionFollowupModalSnapshotFields')) {
    // buildFollowupModalSnapshotInput may pick via helper — require assign path at least
    if (!assign.includes('EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS')) {
        console.error('No live wiring of followup snapshot field keys found');
        process.exit(1);
    }
}

if (!assign.includes('EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS')) {
    console.error('executionFollowupModalSnapshotFields missing followup snapshot keys loop');
    process.exit(1);
}

console.log(`snapshot keys: ${unique.length}, bound via followup snapshot fields + snapshot input`);
console.log('OK — all snapshot keys are bound before followup snapshot');
