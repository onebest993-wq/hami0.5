import { assignExecutionPhoneBodyScope } from '../pickExecutionPhoneBodyProps';
import { assignExecutionShellOverlayScope } from '../pickExecutionShellOverlayProps';
import { assignExecutionFollowupModalSnapshotScope } from '../executionFollowupModalSnapshotFields';

/** مساعد اختبار — يطابق مسارات التعبئة الحيّة (هاتف / أغلفة / محضر متابعة). */
export function assignExecutionDashboardChunkScope(
    target: Record<string, unknown>,
    sources: Record<string, unknown>,
    opts: { phoneBody?: boolean; shellOverlays?: boolean } = { phoneBody: true, shellOverlays: true },
): void {
    if (opts.phoneBody !== false) assignExecutionPhoneBodyScope(target, sources);
    if (opts.shellOverlays !== false) assignExecutionShellOverlayScope(target, sources);
    assignExecutionFollowupModalSnapshotScope(target, sources);
}
