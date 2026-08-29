import { awaitLawsuitWorkspaceCommit } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import { finalizeLawsuitDurabilityAfterCommit } from '@/app/domain/lawsuit/lawsuitDurabilityOverlay';
import { SmartToast } from '@/app/components/ui/SmartToast';

/**
 * انتظار تثبيت القرص بعد طفرة دعوى — تنبيه موحّد عند الفشل.
 */
export async function commitLawsuitPersistOrWarn(
    actionLabel: string,
    fileIds?: readonly (string | number)[],
    options?: { timeoutMs?: number; requireActiveFileId?: string | number },
): Promise<boolean> {
    const commit = await awaitLawsuitWorkspaceCommit({
        timeoutMs: options?.timeoutMs ?? 8_000,
        requireActiveFileId: options?.requireActiveFileId,
    });
    if (!commit.ok) {
        SmartToast.error(`تعذّر تثبيت ${actionLabel} على القرص — أبْقِ الصفحة مفتوحة`);
        return false;
    }
    await finalizeLawsuitDurabilityAfterCommit(commit, fileIds);
    return true;
}
