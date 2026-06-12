import { describe, expect, it } from 'vitest';
import { buildUnifiedSeizureLogEntries } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntries';

describe('buildUnifiedSeizureLogEntries dedup', () => {
    it('skips registry third-party row when ui seizure shares decision id', () => {
        const entries = buildUnifiedSeizureLogEntries({
            viewExecutionData: null,
            activeDebtorIsDeceased: false,
            realEstateSeizureRegistryAssets: [],
            salarySeizureRegistryAssets: [],
            movableSeizureRegistryAssets: [],
            seizedMovablesForSeizureLog: [],
            thirdPartySeizureRegistryAssets: [
                {
                    id: 'reg-1',
                    decisionRowId: 'dec-9',
                    thirdPartyName: 'بنك الرافدين',
                    status: 'waiting',
                },
            ],
            thirdPartySeizuresUi: [
                {
                    id: 'ui-1',
                    decisionRowId: 'dec-9',
                    thirdPartyName: 'بنك الرافدين',
                    status: 'notified',
                },
            ],
        });

        const thirdParty = entries.filter((e) => e.kind === 'third_party');
        expect(thirdParty).toHaveLength(1);
        expect(thirdParty[0]?.id).toBe('third_party_ui:ui-1');
    });

    it('adds movable decision row when no registry or entity exists', () => {
        const entries = buildUnifiedSeizureLogEntries({
            viewExecutionData: { id: 'ex-1' } as any,
            decisionsStorageExecutionId: 'ex-1',
            activeDebtorIsDeceased: false,
            realEstateSeizureRegistryAssets: [],
            salarySeizureRegistryAssets: [],
            movableSeizureRegistryAssets: [],
            seizedMovablesForSeizureLog: [],
            thirdPartySeizureRegistryAssets: [],
            thirdPartySeizuresUi: [],
        });

        expect(entries.some((e) => e.id.startsWith('movable_decision:'))).toBe(false);
    });
});
