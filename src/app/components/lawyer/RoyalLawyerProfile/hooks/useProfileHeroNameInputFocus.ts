import { useEffect } from 'react';
import { LAWYER_PROFILE_NAME_INPUT_ID } from '@/app/components/lawyer/RoyalLawyerProfile/profileHeroDomIds';

export function useProfileHeroNameInputFocus(isEditing: boolean, readOnly: boolean): void {
    useEffect(() => {
        if (!isEditing || readOnly) return;
        const frame = requestAnimationFrame(() => {
            const input = document.getElementById(LAWYER_PROFILE_NAME_INPUT_ID) as HTMLInputElement | null;
            if (!input) return;
            input.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(frame);
    }, [isEditing, readOnly]);
}
