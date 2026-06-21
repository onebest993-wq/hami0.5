import { describe, expect, it, beforeEach } from 'vitest';
import {
    getActiveRealtimeChannelCount,
    isCloudPollingPausedByRealtime,
    notifyRealtimeChannelClosed,
    notifyRealtimeChannelSubscribed,
    resetRealtimeSyncGate,
} from './realtimeSyncGate';

describe('realtimeSyncGate', () => {
    beforeEach(() => {
        resetRealtimeSyncGate();
    });

    it('pauses cloud polling when at least one channel is subscribed', () => {
        expect(isCloudPollingPausedByRealtime()).toBe(false);
        notifyRealtimeChannelSubscribed();
        expect(isCloudPollingPausedByRealtime()).toBe(true);
        expect(getActiveRealtimeChannelCount()).toBe(1);
    });

    it('resumes polling after channel closes', () => {
        notifyRealtimeChannelSubscribed();
        notifyRealtimeChannelSubscribed();
        notifyRealtimeChannelClosed();
        expect(isCloudPollingPausedByRealtime()).toBe(true);
        notifyRealtimeChannelClosed();
        expect(isCloudPollingPausedByRealtime()).toBe(false);
    });
});
