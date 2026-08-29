import { beforeEach, describe, expect, it } from 'vitest';
import {
    consumePendingHomeHubEntryOpen,
    requestHomeHubEntryOpen,
    resetHomeHubEntryOpenForTests,
} from '@/app/services/alerts/homeHubEntryOpen';

describe('homeHubEntryOpen', () => {
    beforeEach(() => {
        resetHomeHubEntryOpenForTests();
    });

    it('يحتفظ بفتح معلّق حتى يُستهلك', () => {
        requestHomeHubEntryOpen();
        expect(consumePendingHomeHubEntryOpen()).toBe(true);
        expect(consumePendingHomeHubEntryOpen()).toBe(false);
    });
});
