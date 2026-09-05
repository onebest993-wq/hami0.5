import React, { useCallback, useRef, useState } from 'react';
import { SettingsDatabaseIcon } from '../settingsStemIconsChrome';
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
import { settingsFlowAbandoned, useSettingsSectionActiveRef } from '../settingsFlowGuard';

export function ExecutionIndexQuarantineRow() {
    const { sectionActiveRef } = useSettingsSectionActiveRef();
    const inFlightRef = useRef(false);
    const [visible, setVisible] = useState(() => hasQuarantinedExecutionFilesIndex());
    const [busy, setBusy] = useState(false);

    const onClaim = useCallback(async () => {
        if (inFlightRef.current || settingsFlowAbandoned(sectionActiveRef)) return;
        inFlightRef.current = true;
        setBusy(true);
        try {
            const ok = await SmartDialog.confirm(
                'سيُضم فهرس التنفيذ المحجور على هذا الجهاز إلى حساب الجلسة الحالية. لا تفعل ذلك إن كان الفهرس لحساب آخر.',
                { title: 'استيراد فهرس التنفيذ المحجور؟' },
            );
            if (!ok || settingsFlowAbandoned(sectionActiveRef)) return;
            const challenge = mintSensitiveConfirmChallenge('استيراد');
            const verified = await verifySensitiveSettingsAction({
                confirmPhrase: challenge.confirmPhrase,
                title: 'تحقق قبل الاستيراد',
                promptMessage: challenge.promptMessage,
            });
            if (!verified || settingsFlowAbandoned(sectionActiveRef)) return;
            const claimed = claimQuarantinedExecutionFilesIndex();
            if (settingsFlowAbandoned(sectionActiveRef)) return;
            if (!claimed) {
                SmartToast.warning('تعذّر الاستيراد — سجّل الدخول أو الفهرس لم يعد محجوراً.');
                setVisible(hasQuarantinedExecutionFilesIndex());
                return;
            }
            SmartToast.success('تم استيراد فهرس التنفيذ المحجور');
            setVisible(false);
        } finally {
            inFlightRef.current = false;
            setBusy(false);
        }
    }, []);

    if (!visible) return null;

    return (
        <SettingRow
            icon={SettingsDatabaseIcon}
            label="فهرس تنفيذ محجور على الجهاز"
            action={
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onClaim()}
                    data-testid="settings-claim-quarantined-execution-index"
                    className="text-amber-400 text-xs font-bold min-h-[44px] min-w-[44px] inline-flex items-center justify-center disabled:opacity-40"
                >
                    استيراد
                </button>
            }
        />
    );
}
