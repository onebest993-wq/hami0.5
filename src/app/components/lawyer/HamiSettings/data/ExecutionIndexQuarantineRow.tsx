import React, { useCallback, useState } from 'react';
import { Database } from '@/app/components/ui/icons/Database';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    mintSensitiveConfirmChallenge,
    verifySensitiveSettingsAction,
} from '@/app/services/settings/verifySensitiveSettingsAction';
import {
    claimQuarantinedExecutionFilesIndex,
    hasQuarantinedExecutionFilesIndex,
} from '@/app/utils/executionFilesStorage';
import { SettingRow } from '../settings-ui/index';

export function ExecutionIndexQuarantineRow() {
    const [visible, setVisible] = useState(() => hasQuarantinedExecutionFilesIndex());

    const onClaim = useCallback(async () => {
        const ok = await SmartDialog.confirm(
            'سيُضم فهرس التنفيذ المحجور على هذا الجهاز إلى حساب الجلسة الحالية. لا تفعل ذلك إن كان الفهرس لحساب آخر.',
            { title: 'استيراد فهرس التنفيذ المحجور؟' },
        );
        if (!ok) return;
        const challenge = mintSensitiveConfirmChallenge('استيراد');
        const verified = await verifySensitiveSettingsAction({
            confirmPhrase: challenge.confirmPhrase,
            title: 'تحقق قبل الاستيراد',
            promptMessage: challenge.promptMessage,
        });
        if (!verified) return;
        const claimed = claimQuarantinedExecutionFilesIndex();
        if (!claimed) {
            SmartToast.warning('تعذّر الاستيراد — سجّل الدخول أو الفهرس لم يعد محجوراً.');
            setVisible(hasQuarantinedExecutionFilesIndex());
            return;
        }
        SmartToast.success('تم استيراد فهرس التنفيذ المحجور');
        setVisible(false);
    }, []);

    if (!visible) return null;

    return (
        <SettingRow
            icon={Database}
            label="فهرس تنفيذ محجور على الجهاز"
            action={
                <button
                    type="button"
                    onClick={() => void onClaim()}
                    data-testid="settings-claim-quarantined-execution-index"
                    className="text-amber-400 text-xs font-bold min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                >
                    استيراد
                </button>
            }
        />
    );
}
