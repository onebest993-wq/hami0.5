import React from 'react';
import { RotateCcw } from 'lucide-react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    mintSensitiveConfirmChallenge,
    verifySensitiveSettingsAction,
} from '@/app/services/settings/verifySensitiveSettingsAction';
import { SettingRow } from '../settings-ui';
import type { useLocalDataClear } from '../hooks/useLocalDataClear';

type WipeVm = ReturnType<typeof useLocalDataClear>;

export function DataDangerZone({
    wipe,
    onResetToDefaults,
}: {
    wipe: WipeVm;
    onResetToDefaults: () => void;
}) {

    const confirmReset = async () => {
        const ok = await SmartDialog.confirm(
            'ستُستعاد تفضيلات المنظر والأمان والبيانات والأداء وتخطيط المنزل — ملفات القضايا المحلية لا تُمس.',
            { title: 'إعادة ضبط الإعدادات؟' },
        );
        if (!ok) return;
        const challenge = mintSensitiveConfirmChallenge('إعادة ضبط');
        const verified = await verifySensitiveSettingsAction({
            confirmPhrase: challenge.confirmPhrase,
            title: 'تحقق قبل إعادة الضبط',
            promptMessage: challenge.promptMessage,
        });
        if (!verified) return;
        onResetToDefaults();
        SmartToast.success('تمت إعادة الضبط');
    };

    return (
        <>
            <SettingRow
                icon={RotateCcw}
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
                            disabled={wipe.wipePhase === 'wiping'}
                            onClick={() => void wipe.requestFullWipe()}
                            data-testid="settings-wipe-start"
                            className="text-rose-400 text-xs font-bold disabled:opacity-40 min-h-[44px]"
                        >
                            {wipe.wipePhase === 'wiping' ? 'جاري المسح…' : 'مسح'}
                        </button>
                    )
                }
            />
            <SettingRow
                icon={RotateCcw}
                label="إعادة ضبط الإعدادات"
                isLast
                action={
                    <button
                        type="button"
                        onClick={() => void confirmReset()}
                        className="text-rose-400 text-xs font-bold min-h-[44px]"
                    >
                        إعادة ضبط
                    </button>
                }
            />
        </>
    );
}
