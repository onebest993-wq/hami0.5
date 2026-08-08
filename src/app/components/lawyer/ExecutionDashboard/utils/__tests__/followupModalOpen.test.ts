import { describe, expect, it, vi } from 'vitest';
import {
    invokeOpenFollowupModal,
    openFollowupModal,
    openFollowupCoerciveModal,
    openFollowupSeizureRequestsModal,
} from '../followupModalOpen';

describe('followupModalOpen', () => {
    it('invokeOpenFollowupModal يستدعي المسار الموحّد عند توفره', () => {
        const openFollowupModalPersisted = vi.fn();
        const ok = invokeOpenFollowupModal(openFollowupModalPersisted, { tab: 'coercive' });
        expect(ok).toBe(true);
        expect(openFollowupModalPersisted).toHaveBeenCalledWith({ tab: 'coercive' });
    });

    it('openFollowupSeizureRequestsModal يمرّر tab seizure_requests', () => {
        const openFollowupModalPersisted = vi.fn();
        openFollowupSeizureRequestsModal(openFollowupModalPersisted);
        expect(openFollowupModalPersisted).toHaveBeenCalledWith({ tab: 'seizure_requests' });
    });

    it('openFollowupModal يستخدم legacy fallback عند غياب المسار الموحّد', () => {
        const setShowUnifiedExecutionModal = vi.fn();
        const openSeizureRequestsTabRef = { current: vi.fn() };
        openFollowupModal(null, { tab: 'seizure_requests' }, {
            setShowUnifiedExecutionModal,
            openSeizureRequestsTabRef,
        });
        expect(setShowUnifiedExecutionModal).toHaveBeenCalledWith(true);
        expect(openSeizureRequestsTabRef.current).toHaveBeenCalled();
    });

    it('openFollowupCoerciveModal يضبط تبويب coercive في legacy fallback', () => {
        const setShowUnifiedExecutionModal = vi.fn();
        const setUnifiedModalTab = vi.fn();
        openFollowupCoerciveModal(null, {
            setShowUnifiedExecutionModal,
            setUnifiedModalTab,
        });
        expect(setShowUnifiedExecutionModal).toHaveBeenCalledWith(true);
        expect(setUnifiedModalTab).toHaveBeenCalledWith('coercive');
    });
});
