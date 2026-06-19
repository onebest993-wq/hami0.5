import { debug } from '@/app/utils/debug';
import { prependTimeline, stageAttachments } from '../../../smartFile/judgmentTypes';
import { interpleaderOriginalClaimOutcome } from '../../../smartFile/interpleaderJudgmentEngine';
import type { SmartFileAttachment } from '../../../smartFile/judgmentTypes';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';

export function syncAttachmentShieldOnJudgment(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
    const { currentStage, activeStageIndex } = scope;
    const { judgmentType, judgmentDate, remandNewActiveIndex, updatedStages } = rt;

const attachmentList = stageAttachments(currentStage);
if (remandNewActiveIndex === null && attachmentList.length > 0) {
    const activeAttachments = attachmentList.filter((a) => a.isActive);
    
    if (activeAttachments.length > 0) {
        debug.log('🔒 درع الحجز: بدء التحديث التلقائي بناءً على الحكم...');
        
        const interpleaderClaim = interpleaderOriginalClaimOutcome(judgmentType);

        const isPlaintiffWin = interpleaderClaim
            ? interpleaderClaim === 'full_win' || interpleaderClaim === 'partial_win'
            : judgmentType === 'إجابة الدعوى'
              || judgmentType === 'إجابة الدعوى بالكامل'
              || judgmentType === 'إجابة الدعوى جزئياً';

        const isPlaintiffLoss = interpleaderClaim
            ? interpleaderClaim === 'full_loss'
            : judgmentType === 'رد الدعوى'
              || judgmentType === 'رد الدعوى كلياً';
        
        updatedStages[activeStageIndex].attachments = attachmentList.map((attachment: SmartFileAttachment) => {
            if (!attachment.isActive) return attachment; // Skip inactive ones
            
            let newStatus = attachment.status;
            let syncNote = '';
            
            if (isPlaintiffWin) {
                newStatus = 'مصدق تلقائياً ✅';
                syncNote = 'تأكيد: الحكم لصالح المدعي يتضمن تصديق الحجز (المادة 245)';
                debug.log('✅ الحجز تم تصديقه تلقائياً - حكم لصالح المدعي');
            } else if (isPlaintiffLoss) {
                newStatus = 'مرفوع تلقائياً ❌';
                syncNote = 'تأكيد: الحكم برد الدعوى يتضمن رفع الحجز (المادة 245)';
                debug.log('❌ الحجز تم رفعه تلقائياً - حكم برد الدعوى');
            }
            
            // Add sync timeline event
            if (syncNote) {
                const stageRef = updatedStages[activeStageIndex]!;
                stageRef.timeline = prependTimeline(stageRef, {
                    id: `attach_sync_${Date.now()}_${attachment.id}`,
                    type: 'action',
                    date: judgmentDate,
                    title: `🔒 ${syncNote}`,
                    details: `المال المحجوز: ${attachment.attachedProperty}\nالحالة الجديدة: ${newStatus}`,
                    isAttachment: true,
                    attachmentStatus: newStatus,
                    isNew: true,
                });
            }
            
            return {
                ...attachment,
                status: newStatus,
                isActive: isPlaintiffWin, // Keep active only if ratified
                judgmentSyncDate: judgmentDate,
                judgmentSyncNote: syncNote
            };
        });
        
        debug.log('🔒 درع الحجز: اكتمل التحديث التلقائي ✓');
    }
}
}
