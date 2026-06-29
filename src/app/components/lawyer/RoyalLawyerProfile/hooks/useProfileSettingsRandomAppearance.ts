import { useCallback, useEffect, useState } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_RANDOM_APPEARANCE_COOLDOWN_MS,
    randomizeProfileAppearance,
    readProfileRandomCooldownUntil,
    writeProfileRandomCooldownUntil,
} from '@/app/services/profile/profilePageCustomization';
import { SmartToast } from '@/app/components/ui/SmartToast';

export function useProfileSettingsRandomAppearance(
    open: boolean,
    setDraft: React.Dispatch<React.SetStateAction<ProfilePageCustomization>>,
) {
    const [randomCooldownUntil, setRandomCooldownUntil] = useState(() => readProfileRandomCooldownUntil());
    const [clock, setClock] = useState(() => Date.now());

    const randomCooldownLeftMs = Math.max(0, randomCooldownUntil - clock);
    const randomCooldownSec = Math.ceil(randomCooldownLeftMs / 1000);
    const randomDisabled = randomCooldownLeftMs > 0;

    useEffect(() => {
        if (!open) return;
        setRandomCooldownUntil(readProfileRandomCooldownUntil());
    }, [open]);

    useEffect(() => {
        if (!open || randomCooldownLeftMs <= 0) return;
        const timer = window.setInterval(() => setClock(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [open, randomCooldownLeftMs]);

    const handleRandomAppearance = useCallback(() => {
        if (randomDisabled) return;
        setDraft((prev) => ({ ...prev, appearance: randomizeProfileAppearance(prev.appearance) }));
        const until = Date.now() + PROFILE_RANDOM_APPEARANCE_COOLDOWN_MS;
        writeProfileRandomCooldownUntil(until);
        setRandomCooldownUntil(until);
        SmartToast.success('تم توليد مظهر جديد');
    }, [randomDisabled, setDraft]);

    return { randomDisabled, randomCooldownSec, handleRandomAppearance };
}
