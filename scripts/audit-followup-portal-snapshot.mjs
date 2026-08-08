import {
    findPortalKeysMissingFromSnapshot,
    readFollowupPortalControllerSource,
    readFollowupSnapshotKeysSource,
} from './lib/extractFollowupPortalSnapshotKeys.mjs';

const controllerSource = readFollowupPortalControllerSource();
const keysSource = readFollowupSnapshotKeysSource();
const { portalKeys, snapshotKeys, missing } = findPortalKeysMissingFromSnapshot({
    controllerSource,
    keysSource,
});

console.log('Portal controller expects', portalKeys.length, 'keys');
console.log('Snapshot field keys', snapshotKeys.size);
console.log('Missing from snapshot:', missing.length ? missing.join(', ') : 'none');

if (missing.length > 0) {
    process.exit(1);
}

console.log('OK — portal controller keys covered by followup snapshot field keys');
