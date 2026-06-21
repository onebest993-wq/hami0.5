/**
 * يوقف polling السحابة عند وجود قنوات Realtime نشطة — يوفر شبكة وبطارية.
 */
let subscribedRealtimeChannels = 0;

export function notifyRealtimeChannelSubscribed(): void {
    subscribedRealtimeChannels += 1;
}

export function notifyRealtimeChannelClosed(): void {
    subscribedRealtimeChannels = Math.max(0, subscribedRealtimeChannels - 1);
}

export function resetRealtimeSyncGate(): void {
    subscribedRealtimeChannels = 0;
}

export function isCloudPollingPausedByRealtime(): boolean {
    return subscribedRealtimeChannels > 0;
}

export function getActiveRealtimeChannelCount(): number {
    return subscribedRealtimeChannels;
}
