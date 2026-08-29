import { useCallback, useRef, useState } from 'react';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import {
    clampProfileContactLabelLive,
    clampProfileContactValueLive,
} from '@/app/services/profile/profileContactInputSecurity';
import {
    messageForGeolocationFailure,
    pickCurrentLocationForProfile,
} from '@/app/services/profile/profileGeolocation';
import { SmartToast } from '@/app/components/ui/SmartToast';

export const CONTACT_CHANNEL_OPTIONS: { type: ProfileAction['type']; label: string }[] = [
    { type: 'call', label: 'هاتف' },
    { type: 'email', label: 'بريد' },
    { type: 'location', label: 'الموقع' },
];

type UseProfileContactSectionOpsArgs = {
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
};

export function useProfileContactSectionOps({ draft, setDraft }: UseProfileContactSectionOpsArgs) {
    const geoGenRef = useRef(0);
    const draftRef = useRef(draft);
    draftRef.current = draft;
    const [locatingActionId, setLocatingActionId] = useState<string | null>(null);

    const updateActionLabel = useCallback(
        (actionId: string, rawLabel: string) => {
            const label = clampProfileContactLabelLive(rawLabel);
            setDraft((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    actions: prev.actions.map((a) => (a.id === actionId ? { ...a, label } : a)),
                };
            });
        },
        [setDraft],
    );

    const updateActionValue = useCallback(
        (actionId: string, rawValue: string) => {
            const value = clampProfileContactValueLive(rawValue);
            setDraft((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    actions: prev.actions.map((a) =>
                        a.id === actionId
                            ? {
                                  ...a,
                                  value,
                                  ...(a.type === 'location' ? { locationMode: 'manual' as const } : {}),
                              }
                            : a,
                    ),
                };
            });
        },
        [setDraft],
    );

    const removeAction = useCallback(
        (actionId: string) => {
            setDraft((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    actions: prev.actions.filter((a) => a.id !== actionId),
                };
            });
        },
        [setDraft],
    );

    const locateAction = useCallback(
        (actionId: string) => {
            const requestGen = ++geoGenRef.current;
            setLocatingActionId(actionId);
            void pickCurrentLocationForProfile()
                .then((coords) => {
                    if (!coords) return;
                    if (requestGen !== geoGenRef.current) return;
                    const current = draftRef.current;
                    if (!current?.actions.some((a) => a.id === actionId)) {
                        return;
                    }
                    setDraft((prev) => {
                        if (!prev) return prev;
                        if (!prev.actions.some((a) => a.id === actionId)) {
                            return prev;
                        }
                        return {
                            ...prev,
                            actions: prev.actions.map((a) =>
                                a.id === actionId
                                    ? {
                                          ...a,
                                          value: coords,
                                          locationMode: 'gps',
                                      }
                                    : a,
                            ),
                        };
                    });
                    SmartToast.success('تم تحديد موقعك الحالي');
                })
                .catch((err) => {
                    if (requestGen !== geoGenRef.current) return;
                    SmartToast.error(messageForGeolocationFailure(err));
                })
                .finally(() => {
                    if (requestGen === geoGenRef.current) {
                        setLocatingActionId(null);
                    }
                });
        },
        [setDraft],
    );

    return {
        locatingActionId,
        updateActionLabel,
        updateActionValue,
        removeAction,
        locateAction,
    };
}
