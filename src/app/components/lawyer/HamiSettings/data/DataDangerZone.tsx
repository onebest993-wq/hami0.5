import React, { useRef } from 'react';
import { SettingsRotateCcwIcon } from '../settingsStemIconsLazy';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    mintSensitiveConfirmChallenge,
    verifySensitiveSettingsAction,
} from '@/app/services/settings/verifySensitiveSettingsAction';
import { SettingRow } from '../settings-ui/index';
import type { useLocalDataClear } from '../hooks/useLocalDataClear';
import { ExecutionIndexQuarantineRow } from './ExecutionIndexQuarantineRow';
import { settingsFlowAbandoned, useSettingsSectionActiveRef } from '../settingsFlowGuard';

type WipeVm = ReturnType<typeof useLocalDataClear>;

export function DataDangerZone({
    wipe,
    onResetToDefaults,
}: {
    wipe: WipeVm;
    onResetToDefaults: () => void;
}) {
    const { sectionActiveRef } = useSettingsSectionActiveRef();
    const resetInFlightRef = useRef(false);
    const dangerBusy = wipe.wipePhase !== 'idle';

    const confirmReset = async () => {
        if (resetInFlightRef.current || dangerBusy || settingsFlowAbandoned(sectionActiveRef)) return;
        resetInFlightRef.current = true;
        try {
            const ok = await SmartDialog.confirm(
                'ستُستعاد تفضيلات المنظر والأمان والبيانات والأداء وتخطيط المنزل — ملفات القضايا المحلية لا تُمس.',
                { title: 'إعادة ضبط الإعدادات؟' },
            );
            if (!ok || settingsFlowAbandoned(sectionActiveRef)) return;
            const challenge = mintSensitiveConfirmChallenge('إعادة ضبط');
            const verified = await verifySensitiveSettingsAction({
                confirmPhrase: challenge.confirmPhrase,
                title: 'تحقق قبل إعادة الضبط',
                promptMessage: challenge.promptMessage,
            });
            if (!verified || settingsFlowAbandoned(sectionActiveRef)) return;
            onResetToDefaults();
            SmartToast.success('تمت إعادة الضبط');
        } finally {
            resetInFlightRef.current = false;
        }
    };

    return (
        <>
            <ExecutionIndexQuarantineRow />
            <SettingRow
                icon={SettingsRotateCcwIcon}
                label="مسح كل البيانات"
                action={
                    wipe.wipePhase === 'countdown' ? (
                        <div className="flex items-center gap-2">
                            <span className="text-amber-400 text-xs font-bold tabular-nums">{wipe.countdown}</span>
                            <button
                                type="button"
                                onClick={wipe.cancelCountdown}
                                data-testid="settings-wipe-countdown-cancel"
                                className="text-white/50 text-xs hover:text-white min-h-[44px] min-w-[44px] px-2 touch-manipulation"
                            >
                                إلغاء
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={dangerBusy}
                            onClick={() => void wipe.requestFullWipe()}
                            data-testid="settings-wipe-start"
                            aria-busy={wipe.wipePhase === 'wiping' || undefined}
                            className="text-rose-400 text-xs font-bold disabled:opacity-40 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                        >
                            مسح
                        </button>
                    )
                }
            />
            <SettingRow
                icon={SettingsRotateCcwIcon}
                label="إعادة ضبط الإعدادات"
                isLast
                action={
                    <button
                        type="button"
                        disabled={dangerBusy}
                        onClick={() => void confirmReset()}
                        data-testid="settings-reset-start"
                        className="text-rose-400 text-xs font-bold disabled:opacity-40 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                    >
                        إعادة ضبط
                    </button>
                }
            />
        </>
    );
}
