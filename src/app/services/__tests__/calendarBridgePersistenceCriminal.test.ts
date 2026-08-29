import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { CRIMINAL_CASE_PREFIX } from '@/app/services/criminalShardedPersistStorage';
import { CRIMINAL_STORE_KEY } from '@/app/utils/criminalCasesStorage';
import { buildStableBridgeId } from '../calendarBridge';
import { propagateBridgedCalendarUpdate } from '../calendarBridgePersistence';

describe('calendarBridgePersistence — criminal reverse sync', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    });

    it('يحدّث nextHearingDate من التقويم', async () => {
        const caseId = 'crim-1';
        const store = {
            state: {
                casesById: {
                    [caseId]: {
                        id: caseId,
                        location: { nextHearingDate: '2028-01-01' },
                        timelineEvents: [],
                        trials: [],
                    },
                },
            },
        };
        SecureStoreService.setItemSync(CRIMINAL_STORE_KEY, JSON.stringify(store));

        const ok = await propagateBridgedCalendarUpdate({
            id: buildStableBridgeId('criminal', caseId, 'location_next_hearing'),
            userId: 'lawyer-1',
            title: 'جلسة قادمة',
            date: '2028-09-20',
            type: 'hearing',
            sourceModule: 'criminal',
            sourceEntityId: caseId,
            sourceEventId: 'location_next_hearing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        expect(ok).toBe(true);
        expect(SecureStoreService.getItemSync(CRIMINAL_STORE_KEY)).toBeNull();
        const shard = JSON.parse(SecureStoreService.getItemSync(`${CRIMINAL_CASE_PREFIX}${caseId}`) ?? '{}') as {
            location?: { nextHearingDate?: string };
        };
        expect(shard.location?.nextHearingDate).toBe('2028-09-20');
    });
});
