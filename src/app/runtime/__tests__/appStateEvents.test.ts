import { describe, expect, it } from 'vitest';
import { HAMI_APP_STATE_EVENT, publishHamiAppState } from '@/app/runtime/appStateEvents';

describe('appStateEvents', () => {
    it('ينشر حالة النشاط', () => {
        const seen: boolean[] = [];
        const onState = (event: Event) => {
            seen.push((event as CustomEvent<{ isActive: boolean }>).detail.isActive);
        };
        window.addEventListener(HAMI_APP_STATE_EVENT, onState);
        publishHamiAppState(false);
        publishHamiAppState(true);
        window.removeEventListener(HAMI_APP_STATE_EVENT, onState);
        expect(seen).toEqual([false, true]);
    });
});
