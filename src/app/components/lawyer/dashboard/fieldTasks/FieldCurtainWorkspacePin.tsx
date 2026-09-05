import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import type { LinkedCaseLookupIndex } from '@/app/workspace/resolveLinkedCaseMeta';
import type { LegalTask } from '@/app/types/TaskEngine';

type FieldCurtainWorkspacePinProps = {
    task: LegalTask;
    pinLookup: LinkedCaseLookupIndex;
};

/** دبوس الملف — مقطع مستقل عن أول بطاقة ستارة */
export function FieldCurtainWorkspacePin({ task, pinLookup }: FieldCurtainWorkspacePinProps) {
    const clusterPin = buildTaskWorkspacePin(task, undefined, undefined, pinLookup);
    if (!clusterPin) return null;
    return <WorkspacePinButton item={clusterPin} className="!w-11 !h-11" size={14} />;
}
