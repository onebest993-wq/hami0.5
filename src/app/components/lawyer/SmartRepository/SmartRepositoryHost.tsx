import React, { useLayoutEffect } from 'react';
import { SmartRepositoryModal } from '@/app/components/lawyer/SmartRepositoryModal';
import type { SmartRepositoryModalProps } from '@/app/components/lawyer/SmartRepositoryModal';
import { prefetchVaultBlobStore } from '@/app/services/vaultBlobStore';
import { prefetchRepositoryDialogs } from '@/app/components/lawyer/SmartRepository/repositoryDialog';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';

/**
 * المستودع — قشرة + خلاصة في نفس المقطع.
 * lazy داخلي للخلاصة كان يعلّق Suspense إلى الأبد (هيكل ست بطاقات بلا محتوى).
 * الماسح/الصوت/المحرر تبقى كسولة عند نية الإضافة.
 */
export function SmartRepositoryHost(props: SmartRepositoryModalProps): React.ReactElement | null {
    const { isOpen, keepAlive = false } = props;

    useLayoutEffect(() => {
        if (!isOpen) return;
        return scheduleIdleWork(() => {
            prefetchVaultBlobStore();
            prefetchRepositoryDialogs();
        });
    }, [isOpen]);

    if (!isOpen && !keepAlive) {
        return null;
    }

    return <SmartRepositoryModal {...props} />;
}
