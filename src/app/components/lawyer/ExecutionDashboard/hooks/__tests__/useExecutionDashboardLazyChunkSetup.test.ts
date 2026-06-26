import { describe, expect, it } from 'vitest';
import { computeExecutionPhoneBodyFingerprint } from '../buildExecutionPhoneBodyProps';

describe('useExecutionDashboardLazyChunkSetup', () => {
    it('computeExecutionPhoneBodyFingerprint includes expanded visual fields', () => {
        const a = computeExecutionPhoneBodyFingerprint({
            executionId: '1',
            activeTabId: 'file-1',
            executionDebtorTabIndex: 0,
        });
        const b = computeExecutionPhoneBodyFingerprint({
            executionId: '1',
            activeTabId: 'file-1',
            executionDebtorTabIndex: 2,
        });
        expect(a).not.toBe(b);
    });

    it('computeExecutionPhoneBodyFingerprint includes dossier lifecycle pop style', () => {
        const closed = computeExecutionPhoneBodyFingerprint({
            executionId: '1',
            dossierLifecyclePanelOpen: false,
            dossierLifecyclePopStyle: null,
        });
        const open = computeExecutionPhoneBodyFingerprint({
            executionId: '1',
            dossierLifecyclePanelOpen: true,
            dossierLifecyclePanelPhase: 'menu',
            dossierLifecyclePopStyle: { top: 64, left: 12, width: 280 },
        });
        expect(closed).not.toBe(open);
    });

    it('computeExecutionPhoneBodyFingerprint includes header expanded state', () => {
        const collapsed = computeExecutionPhoneBodyFingerprint({ executionId: '1', isHeaderExpanded: false });
        const expanded = computeExecutionPhoneBodyFingerprint({ executionId: '1', isHeaderExpanded: true });
        expect(collapsed).not.toBe(expanded);
    });

    it('computeExecutionPhoneBodyFingerprint includes financial hub visibility', () => {
        const closed = computeExecutionPhoneBodyFingerprint({ executionId: '1', showExecutionFinancialHub: false });
        const open = computeExecutionPhoneBodyFingerprint({ executionId: '1', showExecutionFinancialHub: true });
        expect(closed).not.toBe(open);
    });
});
