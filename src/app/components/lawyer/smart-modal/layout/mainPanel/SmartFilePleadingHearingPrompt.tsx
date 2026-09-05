import React from 'react';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import type { CaseStage } from '../../../LawyerShared';
import {
    resolvePleadingHearingRegistrationLabel,
    shouldPromptPleadingHearingRegistration,
} from '../../smartFile/pleadingHearingRegistrationPrompt';

export function SmartFilePleadingHearingPrompt({
    displayStage,
    onRegisterHearing,
}: {
    displayStage: CaseStage;
    onRegisterHearing: (presetTitle: string) => void;
}) {
    if (!shouldPromptPleadingHearingRegistration(displayStage)) return null;

    const presetTitle = resolvePleadingHearingRegistrationLabel(displayStage);

    return (
        <div className="mb-2 print:hidden">
            <button
                type="button"
                onClick={() => onRegisterHearing(presetTitle)}
                className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-violet-400/25 bg-violet-500/[0.08] px-3 py-2.5 text-sm font-bold text-violet-100 transition-colors hover:bg-violet-500/[0.14] hover:border-violet-400/35 touch-manipulation"
            >
                <Calendar size={16} className="shrink-0 text-violet-200/90" aria-hidden />
                <span>تسجيل {presetTitle}</span>
            </button>
        </div>
    );
}
