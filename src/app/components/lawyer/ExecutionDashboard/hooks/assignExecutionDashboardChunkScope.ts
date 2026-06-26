import { EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS } from '../followupSnapshotFieldKeys';
import { assignExecutionPhoneBodyScope } from './pickExecutionPhoneBodyProps';
import { assignExecutionShellOverlayScope } from './pickExecutionShellOverlayProps';

function assignExecutionFollowupModalSnapshotScope(
    target: Record<string, unknown>,
    sources: Record<string, unknown>,
): void {
    for (const key of EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS) {
        if (Object.prototype.hasOwnProperty.call(sources, key)) {
            target[key] = sources[key];
        }
    }
}

export function assignExecutionDashboardChunkScope(
    target: Record<string, unknown>,
    sources: Record<string, unknown>,
    opts: { phoneBody?: boolean; shellOverlays?: boolean } = { phoneBody: true, shellOverlays: true },
): void {
    if (opts.phoneBody !== false) assignExecutionPhoneBodyScope(target, sources);
    if (opts.shellOverlays !== false) assignExecutionShellOverlayScope(target, sources);
    assignExecutionFollowupModalSnapshotScope(target, sources);
}
