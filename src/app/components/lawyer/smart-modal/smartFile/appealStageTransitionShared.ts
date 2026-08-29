import type { CaseStage } from '../../LawyerShared';
import type { SmartFileAttachment } from './judgmentTypes';

export function stageLabel(stage: CaseStage | undefined): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

export function collectTransferableAttachments(
    attachments: unknown[] | undefined,
): SmartFileAttachment[] {
    const stamp = Date.now();
    if (!Array.isArray(attachments)) return [];
    return attachments.map((raw, index) => {
        const item = raw as SmartFileAttachment;
        return {
            ...item,
            id: item.id ? `xfer_${item.id}_${stamp}_${index}` : `xfer_att_${stamp}_${index}`,
        };
    });
}
