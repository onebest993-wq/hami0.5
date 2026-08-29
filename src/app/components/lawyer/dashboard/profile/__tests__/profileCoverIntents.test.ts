import { describe, expect, it } from 'vitest';
import {
    consumeProfileCoverCustomization,
    consumeProfileCoverEdit,
    consumeProfileCoverStudio,
    queueProfileCoverCustomization,
    queueProfileCoverEdit,
    queueProfileCoverStudio,
    resetProfileCoverIntents,
    subscribeProfileCoverIntents,
} from '@/app/components/lawyer/dashboard/profile/profileCoverIntents';
import { normalizeProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

describe('profileCoverIntents', () => {
    it('يصفّر ويستهلك تعديل/استوديو/تخصيص دون تداخل', () => {
        resetProfileCoverIntents();
        queueProfileCoverEdit();
        queueProfileCoverStudio();
        const custom = normalizeProfilePageCustomization(undefined);
        queueProfileCoverCustomization(custom);

        expect(consumeProfileCoverEdit()).toBe(true);
        expect(consumeProfileCoverEdit()).toBe(false);
        expect(consumeProfileCoverStudio()).toBe(true);
        expect(consumeProfileCoverStudio()).toBe(false);
        expect(consumeProfileCoverCustomization()).toBe(custom);
        expect(consumeProfileCoverCustomization()).toBeNull();
    });

    it('reset يمسح كل النوايا', () => {
        queueProfileCoverEdit();
        queueProfileCoverStudio();
        queueProfileCoverCustomization(normalizeProfilePageCustomization(undefined));
        resetProfileCoverIntents();
        expect(consumeProfileCoverEdit()).toBe(false);
        expect(consumeProfileCoverStudio()).toBe(false);
        expect(consumeProfileCoverCustomization()).toBeNull();
    });

    it('يُعلم المشترك عند صف نية بعد تركيب المستمع', () => {
        resetProfileCoverIntents();
        const seen: string[] = [];
        const unsub = subscribeProfileCoverIntents(() => {
            if (consumeProfileCoverStudio()) seen.push('studio');
        });
        queueProfileCoverStudio();
        expect(seen).toEqual(['studio']);
        unsub();
        queueProfileCoverStudio();
        expect(consumeProfileCoverStudio()).toBe(true);
    });
});
