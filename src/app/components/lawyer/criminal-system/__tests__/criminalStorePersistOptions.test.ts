import { describe, it, expect } from 'vitest';
import {
    CRIMINAL_STORE_KEY,
    CRIMINAL_STORE_PERSIST_VERSION,
    criminalStorePartialize,
} from '@/app/components/lawyer/criminal-system/criminalStorePersistOptions';

describe('criminalStorePersistOptions', () => {
    it('يستخدم مفتاح التخزين الموحّد', () => {
        expect(CRIMINAL_STORE_KEY).toBe('hami:criminal:store');
        expect(CRIMINAL_STORE_PERSIST_VERSION).toBe(49);
    });

    it('partialize يُعيد draft فارغ أثناء pendingSeveranceContext', () => {
        const slice = {
            casesById: { a: { id: 'a' } },
            pendingSeveranceContext: { formDraft: {} },
            draft: { basics: { stage: 'مرحلة التحقيق' } },
        };
        const partial = criminalStorePartialize(slice);
        expect(partial.casesById).toEqual(slice.casesById);
        expect(partial.pendingSeveranceContext).toEqual(slice.pendingSeveranceContext);
        expect(partial.draft).toBeDefined();
        expect(partial.draft).not.toBe(slice.draft);
    });

    it('partialize يحفظ draft الحالي بدون severance معلّق', () => {
        const draft = { basics: { stage: 'مرحلة التحقيق' }, complainants: [] };
        const partial = criminalStorePartialize({
            casesById: {},
            pendingSeveranceContext: null,
            draft,
        });
        expect(partial.draft).toBe(draft);
    });
});
