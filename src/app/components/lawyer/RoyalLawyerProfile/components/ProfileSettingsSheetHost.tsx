import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    getCachedProfileSettingsSheet,
    loadProfileSettingsSheetModule,
} from '@/app/runtime/profileSettingsSheetLoader';
import { primeProfileStudio } from '@/app/runtime/profileShellPrime';
import { ProfileSettingsSheetLoadingFallback } from './ProfileSettingsSheetLoadingFallback';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

import type { CloseProfileSettingsOptions } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioSettings';

type ProfileSettingsSheetProps = {
    open: boolean;
    onClose: (options?: CloseProfileSettingsOptions) => void;
    onRegisterDiscard?: (fn: (() => void) | null) => void;
    customization: ProfilePageCustomization;
    userId: string;
    onSave: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
    onDraftChange?: (draft: ProfilePageCustomization) => void;
    saving?: boolean;
};

type ProfileSettingsSheetComponent = React.ComponentType<ProfileSettingsSheetProps>;

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

/** يُحمَّل الاستوديو عند الفتح (أو من كاش نية الزر) — لا يرافق إقلاع الصفحة */
export function ProfileSettingsSheetHost(props: ProfileSettingsSheetProps) {
    const { open } = props;
    const [Component, setComponent] = useState<ProfileSettingsSheetComponent | null>(() =>
        getCachedProfileSettingsSheet(),
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);
    useBodyScrollLock(Boolean(open && (!Component || loadFailed)));

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    useLayoutEffect(() => {
        if (!open) return;

        primeProfileStudio();

        const cached = getCachedProfileSettingsSheet();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
            return;
        }

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            void loadProfileSettingsSheetModule()
                .then((mod) => {
                    if (mod?.ProfileSettingsSheet) {
                        setComponent(() => mod.ProfileSettingsSheet);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('ProfileSettingsSheet missing');
                })
                .catch(() => {
                    if (cancelled) return;
                    attempts += 1;
                    if (attempts < MAX_LOAD_ATTEMPTS) {
                        window.setTimeout(adoptModule, LOAD_RETRY_MS);
                        return;
                    }
                    setLoadFailed(true);
                });
        };

        adoptModule();

        return () => {
            cancelled = true;
        };
    }, [open, loadGeneration]);

    if (!Component) {
        if (open) {
            if (loadFailed) {
                return (
                    <div
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-[#010308]/80 p-6"
                        role="alert"
                        data-testid="profile-settings-sheet-load-error"
                    >
                        <div className="text-center space-y-3">
                            <p className="text-sm text-white/80">تعذّر فتح استوديو الصفحة</p>
                            <button
                                type="button"
                                onClick={retryLoad}
                                className="min-h-[44px] rounded-lg border border-[#E6C673]/35 px-4 py-2 text-sm font-bold text-[#E6C673] touch-manipulation"
                            >
                                إعادة المحاولة
                            </button>
                            <button
                                type="button"
                                onClick={() => props.onClose()}
                                className="block mx-auto min-h-[44px] px-3 text-xs text-white/50 touch-manipulation"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                );
            }
            return <ProfileSettingsSheetLoadingFallback onClose={props.onClose} />;
        }
        return null;
    }

    return <Component {...props} />;
}
